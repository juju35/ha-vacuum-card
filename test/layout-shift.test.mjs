// Layout shift on state updates, in a real browser (Chromium through Playwright; CHROMIUM_PATH, or skipped without
// one): Home Assistant pushes a new hass on every state change of the instance. An update of an entity the card does
// not show changes nothing in its shadow DOM; an update of its own entities is patched in place (no node replaced: the
// pictures and the illustration stay the same nodes, so nothing reloads or restarts) and the card keeps its height on
// every frame, so that the dashboard does not move.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";

const source = readFileSync(new URL("../src/vacuum-card.js", import.meta.url), "utf8");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {}
const browser = await chromium?.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}).catch(() => null);

after(() => browser?.close());

// ha-icon as in Home Assistant: empty (no size) until its icon is loaded, a little later.
const STUBS = `customElements.define("ha-card", class extends HTMLElement { constructor() { super();
  this.attachShadow({ mode: "open" }).innerHTML = "<style>:host{display:block;border:1px solid #ddd;overflow:hidden}</style><slot></slot>"; } });
customElements.define("ha-icon", class extends HTMLElement { constructor() { super(); this.attachShadow({ mode: "open" }); }
  connectedCallback() { setTimeout(() => { this.shadowRoot.innerHTML = '<span style="display:inline-block;width:24px;height:24px"></span>'; }, 16); } });`;

// Own entities changed one after another (battery, current room, activity, progress).
const CHANGES = [
  ["sensor.aspirateur_batterie", "97"],
  ["sensor.aspirateur_piece_actuelle", "Kitchen"],
  ["vacuum.aspirateur", "cleaning"],
  ["sensor.aspirateur_progression", "35"],
  ["sensor.aspirateur_batterie", "96"],
];
const CARDS = [
  ["vacuum-card", {}],
  ["vacuum-mini-card", {}],
  ["vacuum-mini-card", { expand: true }],
];

for (const [type, { expand }] of CARDS) {
  test(`${type}${expand ? " (expanded)" : ""}: state updates neither replace nodes nor change the height`, { skip: !browser && "no Chromium" }, async () => {
    const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
    try {
      await page.setContent('<!doctype html><body style="margin:0;font-family:Arial,sans-serif"></body>');
      await page.addScriptTag({ content: STUBS });
      await page.addScriptTag({ content: source });
      const r = await page.evaluate(
        async ({ type, expand, data, CHANGES }) => {
          const frame = () => new Promise((res) => requestAnimationFrame(res));
          const hassOf = (s) => ({ states: s, entities: data.entities, devices: data.devices, language: "en", locale: { language: "en" }, themes: {}, callService() {}, callWS: async () => ({}) });
          const outer = document.body.appendChild(document.createElement("div"));
          outer.style.width = "400px";
          const card = document.createElement(type);
          card.setConfig({ type: `custom:${type}`, device: "saros", show_map: "never" });
          let s = { ...data.states };
          card.hass = hassOf(s);
          outer.appendChild(card);
          if (expand) card.shadowRoot.querySelector(".zoom").click();
          await new Promise((res) => setTimeout(res, 300));
          for (let i = 0; i < 5; i++) await frame();
          let count = { removed: 0, other: 0 };
          const mo = new MutationObserver((ms) => {
            for (const m of ms) {
              if (m.type === "childList") count.removed += m.removedNodes.length;
              else count.other++;
            }
          });
          mo.observe(card.shadowRoot, { subtree: true, childList: true, attributes: true, characterData: true });
          const heights = new Set();
          let on = true;
          (async () => {
            while (on) {
              heights.add(Math.round(card.getBoundingClientRect().height));
              await frame();
            }
          })();
          const img = card.shadowRoot.querySelector("img");
          const settle = async () => {
            for (let i = 0; i < 3; i++) await frame();
            const recs = mo.takeRecords();
            for (const m of recs) m.type === "childList" ? (count.removed += m.removedNodes.length) : count.other++;
            const c = count;
            count = { removed: 0, other: 0 };
            return c;
          };
          const unrelated = [];
          const own = [];
          for (const [id, state] of CHANGES) {
            s = { ...s, "sensor.unrelated": { entity_id: "sensor.unrelated", state: String(Math.random()), attributes: {} } };
            card.hass = hassOf(s);
            unrelated.push(await settle());
            s = { ...s, [id]: { ...s[id], state } };
            card.hass = hassOf(s);
            own.push(await settle());
          }
          on = false;
          mo.disconnect();
          return { unrelated, own, heights: [...heights], sameImg: !img || img.isConnected, changed: own.some((c) => c.other) };
        },
        { type, expand, data: { states, entities, devices }, CHANGES },
      );
      assert.deepEqual(r.unrelated, CHANGES.map(() => ({ removed: 0, other: 0 })), "an unrelated update mutated the card");
      assert.ok(r.changed, "the card's own updates were not shown");
      assert.deepEqual(r.own.map((c) => c.removed), CHANGES.map(() => 0), "an update replaced nodes instead of patching them");
      assert.ok(r.sameImg, "the picture was replaced");
      assert.equal(r.heights.length, 1, `the height changed: ${r.heights}`);
    } finally {
      await page.close();
    }
  });
}
