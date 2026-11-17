// The illustrated header in Chromium (skipped without it): the status pill shows its whole label from 245 to 500 px,
// right after the title or on its own line under the subtitle (the rule in every language: pill-layout.test.mjs),
// next to a readable title; the mini card's expand / collapse button is a 24 px round button 5 px from the top right
// corner of the banner.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { devices, entities, maps, states } from "../scripts/mock-states.mjs";

const source = readFileSync(new URL("../src/vacuum-card.js", import.meta.url), "utf8");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {}
const browser = await chromium?.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}).catch(() => null);

const HA_CARD = `customElements.define("ha-card", class extends HTMLElement { constructor() { super();
  this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:block;border:1px solid #ddd;overflow:hidden}</style><slot></slot>"; } });`;

test("status pill shows its whole label next to a readable title; the zoom button sits at the top right", { skip: !browser && "no Chromium" }, async () => {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  try {
    await page.setContent('<!doctype html><body style="margin:0;font-family:Arial,sans-serif"></body>');
    await page.addScriptTag({ content: HA_CARD });
    await page.addScriptTag({ content: source });
    const failures = await page.evaluate(
      async ({ states, entities, devices, maps }) => {
        const frames = (n) => new Promise((r) => {
          const step = () => (n-- > 0 ? requestAnimationFrame(step) : r());
          step();
        });
        const hass = { states, entities, devices, language: "en", locale: { language: "en" }, themes: {}, callService() {}, callWS: async () => ({ response: maps }) };
        const out = [];
        for (const width of [245, 300, 400, 460, 500]) {
          for (const [type, zoom] of [["vacuum-card", false], ["vacuum-mini-card", false], ["vacuum-mini-card", true]]) {
            for (const title of [undefined, "A very long robot vacuum name for the ground floor"]) {
              document.body.innerHTML = "";
              const box = document.body.appendChild(document.createElement("div"));
              box.style.width = `${width}px`;
              const card = box.appendChild(document.createElement(type));
              card.setConfig({ type: `custom:${type}`, device: "saros", show_map: "never", ...(title ? { title } : {}) });
              card.hass = hass;
              await frames(2);
              const r = card.shadowRoot;
              if (zoom) r.querySelector(".zoom").click();
              await frames(4);
              const tag = `${type}${zoom ? " zoomed" : ""} ${width}px${title ? " long title" : ""}`;
              const chip = r.querySelector(".banner .chip");
              const text = chip?.querySelector(".chip-text");
              if (!chip) {
                out.push(`${tag}: no pill`);
                continue;
              }
              if (text.clientWidth > 0 && text.scrollWidth > text.clientWidth + 0.5) out.push(`${tag}: label cut`);
              const nb = r.querySelector(".banner .name").getBoundingClientRect();
              if (nb.width < 24) out.push(`${tag}: title ${Math.round(nb.width)}px`);
              const cb = chip.getBoundingClientRect();
              const onRow = Math.abs(cb.top + cb.height / 2 - (nb.top + nb.height / 2)) < 3;
              // Where it goes (beside the whole title or under the subtitle) in every language: pill-layout.test.mjs.
              if (onRow && cb.left - nb.right > 10.5) out.push(`${tag}: pill ${Math.round(cb.left - nb.right)}px after the title`);
              const banner = r.querySelector(".banner").getBoundingClientRect();
              if (cb.right > banner.right - 4 || cb.bottom > banner.bottom - 10) out.push(`${tag}: pill out of the banner`);
              const z = r.querySelector(".banner .zoom");
              if (type === "vacuum-mini-card") {
                const zb = z?.getBoundingClientRect();
                if (!zb) out.push(`${tag}: no zoom button`);
                else if (Math.round(zb.width) !== 24 || Math.round(zb.height) !== 24 || Math.round(zb.top - banner.top) !== 5 || Math.round(banner.right - zb.right) !== 5)
                  out.push(`${tag}: zoom button ${Math.round(zb.width)}x${Math.round(zb.height)} at ${Math.round(zb.top - banner.top)}/${Math.round(banner.right - zb.right)}`);
              }
            }
          }
        }
        return out;
      },
      { states, entities, devices, maps },
    );
    assert.deepEqual(failures, []);
  } finally {
    await page.close();
  }
});

test.after(() => browser?.close());
