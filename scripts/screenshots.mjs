// Renders the cards with mock Roborock data and saves the README screenshots.
// Usage: npm run build && npm run screenshots
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { states, entities, devices, maps } from "./mock-states.mjs";
import { shots, gifs } from "./screenshot-list.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const cardJs = readFileSync(`${root}dist/vacuum-card.js`, "utf8");

// Every uncaught page error is collected here; the script exits non-zero when any occurred,
// so a card that throws on load cannot silently produce blank screenshots.
const pageErrors = [];

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed",
    "--secondary-background-color": "#ececec",
    "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121",
    "--secondary-text-color": "#727272",
    "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111",
    "--secondary-background-color": "#282828",
    "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1",
    "--secondary-text-color": "#9b9b9b",
    "--divider-color": "rgba(225,225,225,.12)",
  },
};

// Minimal stand-in for Home Assistant's <ha-card>.
const HA_CARD = `customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});`;

const page_html = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries(THEMES[theme]).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; padding: 16px; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
</style></head><body><div id="root"></div></body></html>`;

// Opens a card on a fresh page (its script declares top-level names, which cannot be evaluated twice in one page)
// and mounts it with the mock hass; `overrides` patch the mock states for this shot only.
async function openCard(browser, { file, type, config, theme, width, overrides }) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 2000 } });
  page.on("pageerror", (err) => {
    console.error(`pageerror (${file}): ${err.message}`);
    pageErrors.push(`${file}: ${err.message}`);
  });
  await page.setContent(page_html(theme, width));
  await page.addScriptTag({ content: HA_CARD });
  await page.addScriptTag({ content: cardJs });
  await page.addScriptTag({ content: `window.inlinePictures = ${inlinePictures};` });
  await page.evaluate(
    ({ type, config, states, entities, devices, overrides, maps, theme }) => {
      for (const [id, o] of Object.entries(overrides || {})) states[id] = { ...states[id], ...o };
      const el = document.createElement(type);
      el.setConfig({ type: `custom:${type}`, ...config });
      el.hass = {
        states, entities, devices, language: "en", locale: { language: "en" }, themes: { darkMode: theme === "dark" }, callService: () => {},
        callWS: async () => ({ response: maps }),
      };
      document.getElementById("root").appendChild(el);
    },
    { type, config, states, entities, devices, overrides, maps, theme }
  );
  return page;
}


// The robot pictures are SVG <img>: their CSS animations run in a document of their own, out of reach of
// document.getAnimations() and of Playwright's `animations: "disabled"`. For the capture each one is redrawn inline,
// in a shadow root of its own (its styles and ids stay apart), at the same size and with the same filter, so that
// its animations can be reset (screenshots) or paused and stepped (GIFs). Returns every animation of the page: those
// of the document and of the shadow roots of the card and of the pictures (document.getAnimations() leaves out the
// shadow trees). Run before every frame: a card re-render puts the <img> back, and stepping restarts from the same
// times anyway.
function inlinePictures() {
  const card = document.querySelector("#root").firstElementChild.shadowRoot;
  window.pictureRoots ||= [];
  for (const img of card.querySelectorAll("img")) {
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("data:image/svg+xml,")) continue;
    const svg = new DOMParser().parseFromString(decodeURIComponent(src.slice(src.indexOf(",") + 1)), "image/svg+xml").documentElement;
    const box = img.getBoundingClientRect();
    const host = document.createElement("div");
    host.style.cssText = `width:${box.width}px;height:${box.height}px;filter:${getComputedStyle(img).filter};flex:none`;
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    host.attachShadow({ mode: "open" }).appendChild(svg);
    img.replaceWith(host);
    window.pictureRoots.push(host.shadowRoot);
  }
  window.pictureRoots = window.pictureRoots.filter((r) => r.host.isConnected);
  return [document, card, ...window.pictureRoots].flatMap((r) => r.getAnimations());
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
for (const s of shots) {
  const page = await openCard(browser, s);
  for (const sel of s.clicks || []) {
    // A mouse click (detail 1), not .click(): a keyboard-like click would move the focus and show its ring.
    await page.evaluate(
      (sel) =>
        document
          .querySelector("#root")
          .firstElementChild.shadowRoot.querySelector(sel)
          .dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 })),
      sel
    );
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.inlinePictures();
  });
  const box = await page.locator("#root").boundingBox();
  await page.screenshot({
    path: `${root}screenshots/${s.file}.png`,
    clip: { x: 0, y: 0, width: s.width + 32, height: Math.ceil(box.height) + 32 },
    animations: "disabled",
  });
  console.log(`screenshots/${s.file}.png`);
  await page.close();
}

// Records one animated state as a looping GIF (screenshots/<gif.file>.gif) — needs ffmpeg on PATH.
// Every animation is paused and stepped frame by frame, so the GIF is identical whatever the machine's speed
// (the robot pictures are inlined first, see inlinePictures: as <img>, getAnimations() did not see them).
async function makeGif(browser, gif, { fps = 20, seconds = 3 } = {}) {
  const page = await openCard(browser, gif);
  await page.waitForTimeout(300);
  const box = await page.locator("#root").boundingBox();
  const clip = { x: 0, y: 0, width: gif.width + 32, height: Math.ceil(box.height) + 32 };
  const dir = mkdtempSync(join(tmpdir(), "vc-frames-"));
  const frames = Math.round(fps * seconds);
  for (let i = 0; i < frames; i++) {
    const n = await page.evaluate(
      (t) => {
        const all = window.inlinePictures();
        for (const a of all) {
          a.pause();
          a.currentTime = t;
        }
        return all.length;
      },
      (i * 1000) / fps,
    );
    // An animated state with no animation to step would record frames at the machine's speed again.
    if (!n) throw new Error(`${gif.file}: no animation found to step`);
    await page.screenshot({ path: join(dir, `f${String(i).padStart(3, "0")}.png`), clip });
  }
  await page.close();
  const out = `${root}screenshots/${gif.file}.gif`;
  // Halve the retina capture and build a per-clip palette: the colours stay clean and the file stays small.
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(dir, "f%03d.png"),
    "-vf", `scale=${clip.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    "-loop", "0", out,
  ]);
  rmSync(dir, { recursive: true });
  console.log(`screenshots/${gif.file}.gif`);
}

for (const g of gifs) await makeGif(browser, g);
await browser.close();

if (pageErrors.length) {
  console.error(`\n${pageErrors.length} page error(s) while rendering:`);
  for (const e of pageErrors) console.error(`  ${e}`);
  process.exitCode = 1;
}
