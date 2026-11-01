// Keyboard access, focus across re-renders, readable state colors and reduced motion.
import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();

const makeHass = (st = states) => ({ entities, devices, states: st, language: "en", callService() {} });

const newCard = (config = {}, Card = vc.VacuumCard) => {
  const card = new Card();
  card.setConfig({ device: "saros", show_map: "always", map_entity: "camera.dustbusters_map", collapsed: [], ...config });
  card.hass = makeHass();
  return card;
};

// Opening tags of the elements a click acts on: an entity (more-info) or an action.
const clickables = (html) => html.match(/<[a-z-]+\b[^>]*\bdata-(?:entity|action)="[^"]*"[^>]*>/g) || [];

test("every clickable element of the full and mini cards can be reached and used from the keyboard", () => {
  const pages = [newCard(), newCard({ zoom: true }, vc.VacuumMiniCard)];
  // The mini card in its detailed view draws the full card's sections.
  pages[1]._setZoom(true);
  for (const card of pages) {
    const tags = clickables(card.shadowRoot.innerHTML).filter((tag) => !/data-action="confirm_backdrop"/.test(tag));
    assert.ok(tags.length > 10, "the card has clickable elements");
    for (const tag of tags) {
      if (tag.startsWith("<button")) continue;
      assert.match(tag, /\brole="button"/, tag);
      assert.match(tag, /\btabindex="0"/, tag);
    }
  }
});

test("the section titles are buttons that tell whether they are unfolded", () => {
  const card = newCard({ collapsed: ["dock"] });
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<div class="section-title toggle" role="button" tabindex="0" data-action="toggle_section" data-section="dock" aria-expanded="false">/);
  assert.match(html, /data-section="stats" aria-expanded="true">/);
});

test("the picture, which has no text, gets a name", () => {
  const card = newCard();
  assert.match(card.shadowRoot.innerHTML, /<div class="picture clickable" role="button" tabindex="0" aria-label="[^"]+" data-entity="vacuum\.aspirateur">/);
});

// keydown as the shadow root receives it, on an element of the card.
const key = (card, k, target) => {
  let prevented = 0;
  card.shadowRoot.listeners.keydown({ key: k, target, preventDefault: () => prevented++ });
  return prevented;
};
const roleButton = () => {
  const el = { clicks: 0, getAttribute: (a) => (a === "role" ? "button" : null), click() {
    this.clicks++;
  } };
  return el;
};

test("Enter and Space activate an element with the button role, as a click", () => {
  const card = newCard();
  const el = roleButton();
  assert.equal(key(card, "Enter", el), 1);
  assert.equal(key(card, " ", el), 1, "Space does not scroll the page");
  assert.equal(el.clicks, 2);
});

test("other keys, and real buttons (which click on their own), are left alone", () => {
  const card = newCard();
  const el = roleButton();
  assert.equal(key(card, "a", el), 0);
  assert.equal(key(card, "Tab", el), 0);
  assert.equal(el.clicks, 0);
  const native = { getAttribute: () => null, click: () => assert.fail("a <button> must not be clicked twice") };
  assert.equal(key(card, "Enter", native), 0);
  assert.equal(key(card, " ", native), 0);
  assert.equal(key(card, "Enter", null), 0, "no target: nothing happens");
});

// Shadow root stand-in for the focus: the focused element and the clickable elements before the rewrite, then the
// ones found after it (new nodes), whose focus() calls are returned.
const trackFocus = (card, active, before, after) => {
  const focused = [];
  let rewritten = false;
  card.shadowRoot.activeElement = active;
  card.shadowRoot.querySelectorAll = (sel) => {
    if (!sel.includes("data-action")) return [];
    return rewritten ? after.map((el) => ({ ...el, focus: (o) => focused.push([el, o]) })) : before;
  };
  const html = Object.getOwnPropertyDescriptor(card.shadowRoot, "innerHTML");
  Object.defineProperty(card.shadowRoot, "innerHTML", {
    configurable: true,
    get: () => html.value,
    set(v) {
      html.value = v;
      rewritten = true;
    },
  });
  return focused;
};
const node = (tagName, dataset) => ({ tagName, dataset });

test("unfolding a section from the keyboard keeps the focus on its title", () => {
  const card = newCard({ collapsed: ["dock"] });
  const title = node("DIV", { action: "toggle_section", section: "dock" });
  const other = node("DIV", { action: "toggle_section", section: "stats" });
  const focused = trackFocus(card, title, [other, title], [other, node("DIV", { action: "toggle_section", section: "dock" })]);
  card._onClick({ composedPath: () => [title], stopPropagation() {}, detail: 0 });
  assert.equal(card._isCollapsed("dock"), false);
  assert.equal(focused.length, 1);
  assert.equal(focused[0][0].dataset.section, "dock");
  assert.equal(focused[0][1]?.preventScroll, true);
});

test("a state update keeps the focus on the same element, among several with the same entity", () => {
  const card = newCard();
  const id = "sensor.aspirateur_filtre";
  const lbl = node("SPAN", { entity: id });
  const v = node("SPAN", { entity: id });
  // The second of the two elements of the consumable row has the focus.
  const focused = trackFocus(card, v, [lbl, v], [node("SPAN", { entity: id }), node("SPAN", { entity: id })]);
  const batt = "sensor.aspirateur_batterie";
  card.hass = { ...makeHass(), states: { ...states, [batt]: { ...states[batt], state: "12" } } };
  assert.equal(focused.length, 1);
  assert.equal(focused[0][1]?.preventScroll, true);
  assert.notEqual(focused[0][0], undefined);
  assert.equal(focused[0][0].dataset.entity, id);
});

test("the focus is left alone when it is outside the card, or when its element is gone", () => {
  const card = newCard();
  const dock = node("DIV", { action: "toggle_section", section: "dock" });
  const focused = trackFocus(card, null, [dock], [dock]);
  const batt = "sensor.aspirateur_batterie";
  card.hass = { ...makeHass(), states: { ...states, [batt]: { ...states[batt], state: "13" } } };
  assert.equal(focused.length, 0, "focus outside the card (more-info dialog, another card)");
  const lost = node("DIV", { entity: "sensor.gone" });
  const gone = trackFocus(card, lost, [dock, lost], [dock]);
  card.hass = { ...makeHass(), states: { ...states, [batt]: { ...states[batt], state: "14" } } };
  assert.equal(gone.length, 0);
});

// CSS rules of the card: [selector, declarations].
const rules = (html) =>
  [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
    .flatMap(([, css]) => [...css.replace(/@media[^{]*\{([^{}]*\{[^}]*\})*\s*\}/g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)])
    .map(([, sel, body]) => [sel.trim(), body]);

test("text is never drawn in a raw state or brand color (too light on a light theme): icons, dots and bars keep it", () => {
  for (const card of [newCard(), newCard({}, vc.VacuumMiniCard)]) {
    for (const [sel, body] of rules(card.shadowRoot.innerHTML)) {
      const color = body.match(/(?:^|[;\s])color:\s*([^;]+)/)?.[1]?.trim();
      if (!color || !/^var\(--(c|vc-(ok|warn|crit|idle|active|accent))[,)]/.test(color)) continue;
      // Icon-only selectors keep the state color.
      const iconOnly = sel.split(",").every((s) => /\.(icon|bolt)\s*$/.test(s.trim()));
      assert.ok(iconOnly, `${sel} { color: ${color} } colors text`);
    }
  }
});

test("animations and transitions stop when the system asks for reduced motion", () => {
  for (const card of [newCard(), newCard({}, vc.VacuumMiniCard)]) {
    assert.match(card.shadowRoot.innerHTML, /@media \(prefers-reduced-motion: reduce\) \{[^}]*\{[^}]*transition: none !important/);
  }
});
