import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();

const makeHass = (st = states) => {
  const calls = [];
  return { calls, entities, devices, states: st, language: "en", callService: (...a) => calls.push(a) };
};

const newCard = (hass) => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", show_map: "never" });
  card.hass = hass;
  return card;
};

// A click on an element of the card, as composedPath() would report it.
const click = (card, dataset, extra = []) => {
  const el = { dataset };
  card._onClick({ composedPath: () => [el, ...extra], stopPropagation() {} });
  return el;
};

test("an unrelated state change does not rebuild the card", () => {
  const hass = makeHass();
  const card = newCard(hass);
  let renders = 0;
  const render = card._render.bind(card);
  card._render = () => {
    renders++;
    return render();
  };
  card.hass = { ...hass, states: { ...states, "light.elsewhere": { entity_id: "light.elsewhere", state: "on", attributes: {} } } };
  assert.equal(renders, 0);
  const batt = "sensor.aspirateur_batterie";
  card.hass = { ...hass, states: { ...states, [batt]: { ...states[batt], state: "99" } } };
  assert.equal(renders, 1);
  assert.match(card.shadowRoot.innerHTML, />99<small>/);
});

test("a routine asks for confirmation in the card, Cancel does nothing", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  assert.equal(hass.calls.length, 0);
  assert.match(card.shadowRoot.innerHTML, /class="dialog-open"/);
  assert.match(card.shadowRoot.innerHTML, /Run routine Morning\?/);
  click(card, { action: "confirm_cancel" });
  assert.equal(hass.calls.length, 0);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/);
});

test("confirming presses the button once", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "reset", entity: "button.aspirateur_reinitialiser_sensor", label: "Sensors" });
  // Clicks elsewhere in the card do nothing while the popup is open.
  click(card, { action: "stop", entity: "vacuum.aspirateur" });
  assert.equal(hass.calls.length, 0);
  click(card, { action: "confirm_ok" });
  assert.deepEqual(JSON.parse(JSON.stringify(hass.calls)), [["button", "press", { entity_id: "button.aspirateur_reinitialiser_sensor" }]]);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/);
});

test("a click inside the more-info dialog keeps the sections unfolded", () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  click(card, { action: "toggle_section", section: "stats" });
  assert.equal(card._toggled.size, 1);
  card._onOutside({ composedPath: () => [{ tagName: "DIV" }, { tagName: "HA-MORE-INFO-DIALOG" }] });
  assert.equal(card._toggled.size, 1);
  card._onOutside({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(card._toggled.size, 0);
});

test("no rewrite under a press: the pending update is drawn on release, a click renders at once", async () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  click(card, { action: "toggle_section", section: "stats" });
  const open = card.shadowRoot.innerHTML;
  card.shadowRoot.listeners.pointerdown({});
  card._outside.tap({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(card.shadowRoot.innerHTML, open, "no rewrite under the pointer");
  card._onPressEnd();
  await new Promise((r) => setTimeout(r, 10));
  assert.notEqual(card.shadowRoot.innerHTML, open, "drawn once released");
  // A click during a press renders at once.
  card.shadowRoot.listeners.pointerdown({});
  const before = card.shadowRoot.innerHTML;
  click(card, { action: "toggle_section", section: "stats" });
  assert.notEqual(card.shadowRoot.innerHTML, before);
  assert.equal(card._pressing, false);
  card.disconnectedCallback();
});

test("folding: a tap elsewhere (pointer), not a press in the card released outside; leaving the page folds back", () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  click(card, { action: "toggle_section", section: "stats" });
  // A slider pressed in the card and released outside of it: nothing folds.
  card._outside.tap({ composedPath: () => [card] });
  assert.equal(card._toggled.size, 1);
  // A tap on a spot that sends no click (iOS): the pointer alone folds it.
  card._outside.tap({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(card._toggled.size, 0);
  // Left with a section unfolded and back: folded.
  click(card, { action: "toggle_section", section: "stats" });
  card.disconnectedCallback();
  card.connectedCallback();
  assert.equal(card._toggled.size, 0);
  card.disconnectedCallback();
});

test("a failed dock switch call drops the pending state and leaves no unhandled rejection", async () => {
  const rejections = [];
  const onRejection = (e) => rejections.push(e);
  process.on("unhandledRejection", onRejection);
  try {
    const hass = { ...makeHass(), callService: () => Promise.reject(new Error("read-only")) };
    const card = newCard(hass);
    const id = "switch.station_vidage_de_la_poussiere";
    click(card, { action: "dock_toggle", entity: id });
    assert.ok(card._pending[id], "requested state shown meanwhile");
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(card._pending[id], undefined);
    assert.equal(card._isOn(id), false);
    assert.equal(rejections.length, 0);
    card.disconnectedCallback();
  } finally {
    process.off("unhandledRejection", onRejection);
  }
});

test("detaching the card clears the pending timer and closes the zoomed map", () => {
  const card = newCard(makeHass());
  let closed = 0;
  card._pendingTimer = setTimeout(() => assert.fail("timer still running"), 20);
  card._closeZoom = () => closed++;
  card.disconnectedCallback();
  assert.equal(closed, 1);
  return new Promise((r) => setTimeout(r, 40));
});

test("the relative time formatter is built once per language", () => {
  const hass = makeHass();
  const iso = new Date(Date.now() - 2 * 3600e3).toISOString();
  vc.ago(hass, {}, iso);
  const fmt = vc.RTF.en;
  assert.ok(fmt);
  vc.ago(hass, {}, iso);
  assert.equal(vc.RTF.en, fmt);
  vc.ago(hass, { language: "fr" }, iso);
  assert.ok(vc.RTF.fr && vc.RTF.fr !== fmt);
});

test("the relative last clean time moves on: the card re-checks it every minute while it is on the page", () => {
  const card = newCard(makeHass());
  const { intervals, Date: SDate } = vc.window;
  const before = intervals.size;
  card.connectedCallback();
  assert.equal(intervals.size, before + 1);
  assert.match(card.shadowRoot.innerHTML, /20 hours ago/);
  const now = SDate.now;
  try {
    // Two hours later, with no new hass from Home Assistant.
    const t0 = now();
    SDate.now = () => t0 + 2 * 3600e3;
    [...intervals.values()].at(-1)();
    assert.match(card.shadowRoot.innerHTML, /22 hours ago/);
    // Unchanged text: no rebuild.
    let renders = 0;
    const render = card._render.bind(card);
    card._render = () => {
      renders++;
      return render();
    };
    [...intervals.values()].at(-1)();
    assert.equal(renders, 0);
  } finally {
    SDate.now = now;
  }
  card.disconnectedCallback();
  assert.equal(intervals.size, before);
  // Reattached: one timer again, not two.
  card.connectedCallback();
  card.connectedCallback();
  assert.equal(intervals.size, before + 1);
  card.disconnectedCallback();
});

test("the full and mini cards share the room, error and picture blocks", () => {
  const err = "sensor.aspirateur_erreur";
  const hass = makeHass({ ...states, [err]: { ...states[err], state: "main_brush_jammed" } });
  const full = newCard(hass);
  const mini = new vc.VacuumMiniCard();
  mini.setConfig({ device: "saros" });
  mini.hass = hass;
  for (const html of [full.shadowRoot.innerHTML, mini.shadowRoot.innerHTML]) {
    assert.match(html, /class="line clickable" role="button" tabindex="0" data-entity="sensor\.aspirateur_piece_actuelle"/);
    assert.match(html, /class="alert-line crit clickable" role="button" tabindex="0" data-entity="sensor\.aspirateur_erreur"/);
    assert.match(html, /class="picture clickable" role="button" tabindex="0" aria-label="[^"]*" data-entity="vacuum\.aspirateur"><img data-img="/);
  }
});

test("Escape still closes the popup after a re-render took the focus away", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  // A device state changes while the popup is open: the card is rewritten and the focus falls back to <body>,
  // so the keydown only reaches the window.
  const batt = "sensor.aspirateur_batterie";
  card.hass = { ...hass, states: { ...states, [batt]: { ...states[batt], state: "42" } } };
  assert.match(card.shadowRoot.innerHTML, /dialog-open/);
  vc.window.fire("keydown", { key: "Escape", stopPropagation() {} });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/);
  assert.equal(hass.calls.length, 0);
});

test("the second click of a double click on OK does not reach the card under the popup", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  click(card, { action: "confirm_ok" });
  // What lies under OK once the popup is gone: the battery (more-info) or an action button.
  click(card, { entity: "sensor.aspirateur_batterie" });
  click(card, { action: "stop", entity: "vacuum.aspirateur" });
  assert.equal(hass.calls.length, 1);
  assert.equal((card.events || []).length, 0);
  card._confirmClosedAt -= 1000;
  click(card, { entity: "sensor.aspirateur_batterie" });
  assert.equal(card.events.length, 1, "clicks act again afterwards");
});

test("inlined pictures are not written into the HTML of every render", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", show_map: "never", image: "data:image/png;base64,AAAA" });
  card.hass = makeHass();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /data:image\/png/);
  assert.match(card.shadowRoot.innerHTML, /class="picture clickable" role="button" tabindex="0" aria-label="[^"]*" data-entity="vacuum\.aspirateur"><img data-img="\d+" alt="">/);
  card.setConfig({ device: "saros", show_map: "never", image: "/local/robot.png" });
  card.hass = makeHass();
  assert.match(card.shadowRoot.innerHTML, /<img src="\/local\/robot\.png" alt="">/);
});

test("a re-render keeps the popup focus without scrolling the page to the card", () => {
  const hass = makeHass();
  const card = newCard(hass);
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  const focusCalls = [];
  card.shadowRoot.querySelector = (sel) => (sel === ".modal .primary" ? { focus: (opts) => focusCalls.push(opts) } : null);
  const batt = "sensor.aspirateur_batterie";
  card.hass = { ...hass, states: { ...states, [batt]: { ...states[batt], state: "41" } } };
  assert.equal(focusCalls.length, 1);
  assert.equal(focusCalls[0]?.preventScroll, true);
});

test("the popup closes when the card leaves the page, with nothing run", () => {
  const hass = makeHass();
  const card = newCard(hass);
  card.connectedCallback();
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  assert.match(card.shadowRoot.innerHTML, /dialog-open/);
  card.disconnectedCallback();
  card.connectedCallback();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/, "closed on the way back");
  vc.window.fire("keydown", { key: "Escape", stopPropagation() {} });
  assert.equal(hass.calls.length, 0);
  card.disconnectedCallback();
});

const newMini = (hass, config = {}) => {
  const mini = new vc.VacuumMiniCard();
  mini.setConfig({ device: "saros", show_map: "never", ...config });
  mini.hass = hass;
  mini.connectedCallback();
  return mini;
};

test("the mini card's detail button shows the full card, and back", () => {
  const hass = makeHass();
  const mini = newMini(hass);
  const full = newCard(hass);
  assert.match(mini.shadowRoot.innerHTML, /class="zoom" data-action="zoom" title="Show the full card"/);
  assert.doesNotMatch(mini.shadowRoot.innerHTML, /class="section-title/);
  let stopped = 0;
  mini._onClick({ composedPath: () => [{ dataset: { action: "zoom" } }], stopPropagation: () => stopped++, detail: 1 });
  assert.equal(stopped, 1, "the click does not reach the header");
  assert.equal(hass.calls.length, 0);
  const zoomed = mini.shadowRoot.innerHTML;
  assert.match(zoomed, /title="Back to the compact view"/);
  // Everything the full card shows, same markup, plus the button.
  assert.equal(zoomed.replace(/<button class="zoom"[\s\S]*?<\/button>/, ""), full.shadowRoot.innerHTML);
  assert.equal(mini.getCardSize(), full.getCardSize());
  assert.deepEqual({ ...mini.getGridOptions() }, { ...full.getGridOptions(), rows: "auto" });
  click(mini, { action: "zoom" });
  assert.match(mini.shadowRoot.innerHTML, /title="Show the full card"/);
  assert.doesNotMatch(mini.shadowRoot.innerHTML, /class="section-title/);
  assert.equal(mini.getCardSize(), 3);
  assert.deepEqual({ ...mini.getGridOptions() }, { columns: 6, min_columns: 6, rows: "auto" });
});

test("the detail button pressed from the keyboard keeps the focus without scrolling the page to the card", () => {
  const mini = newMini(makeHass());
  const focusCalls = [];
  const query = mini.shadowRoot.querySelector.bind(mini.shadowRoot);
  mini.shadowRoot.querySelector = (sel) => (sel === ".zoom" ? { focus: (opts) => focusCalls.push(opts) } : query(sel));
  // Enter or Space: a click with no click count.
  mini._onClick({ composedPath: () => [{ dataset: { action: "zoom" } }], stopPropagation() {}, detail: 0 });
  assert.equal(mini._zoomed, true);
  assert.equal(focusCalls.length, 1);
  assert.equal(focusCalls[0]?.preventScroll, true);
});

test("a click outside the mini card brings the compact view back, not one inside it or in a dialog", () => {
  const mini = newMini(makeHass());
  click(mini, { action: "zoom" });
  mini._onUnzoom({ composedPath: () => [{ tagName: "BUTTON" }, mini] });
  mini._onUnzoom({ composedPath: () => [{ tagName: "DIV" }, { tagName: "HA-MORE-INFO-DIALOG" }] });
  mini._onUnzoom({ composedPath: () => [{ tagName: "DIV" }, { tagName: "HA-DIALOG" }] });
  assert.equal(mini._zoomed, true);
  assert.match(mini.shadowRoot.innerHTML, /class="section-title/);
  mini._onUnzoom({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(mini._zoomed, false);
  assert.doesNotMatch(mini.shadowRoot.innerHTML, /class="section-title/);
});

test("from the keyboard, the focus moves to the new detail button", () => {
  const mini = newMini(makeHass());
  const focused = [];
  mini.shadowRoot.querySelector = (sel) => (sel === ".zoom" ? { focus: () => focused.push(sel) } : null);
  mini._onClick({ composedPath: () => [{ dataset: { action: "zoom" } }], stopPropagation() {}, detail: 0 });
  assert.equal(focused.length, 1);
  mini._onClick({ composedPath: () => [{ dataset: { action: "zoom" } }], stopPropagation() {}, detail: 1 });
  assert.equal(focused.length, 1, "a mouse click leaves the focus alone");
});

test("zoom: false removes the detail button", () => {
  const mini = newMini(makeHass(), { zoom: false });
  assert.doesNotMatch(mini.shadowRoot.innerHTML, /class="zoom"/);
  const full = newCard(makeHass());
  assert.doesNotMatch(full.shadowRoot.innerHTML, /class="zoom"/);
});

test("Xiaomi Miio: only the vacuum is listed, its keys read like the Roborock ones", () => {
  const model = vc.resolve(makeHass());
  assert.ok(!model.devices.some((d) => d.id === "purifier"));
  const q5 = model.devices.find((d) => d.id === "q5");
  assert.equal(q5.platform, "xiaomi_miio");
  assert.equal(q5.kind, "robot");
  assert.equal(q5.vacuum, "vacuum.dustbusters");
  assert.equal(q5.entities.main_brush_time_left, "sensor.dustbusters_main_brush_remaining");
  assert.equal(q5.entities.sensor_time_left, "sensor.dustbusters_sensor_dirty_remaining");
  assert.equal(q5.entities.cleaning_time, "sensor.dustbusters_current_clean_duration");
  assert.equal(q5.entities.total_cleaning_count, "sensor.dustbusters_total_clean_count");
  assert.equal(q5.entities.reset_air_filter_consumable, "button.dustbusters_reset_filter");
});

test("Xiaomi Miio: the card shows the Xiaomi logo of a Mi robot, maintenance and statistics, Start cleans right away", () => {
  const hass = makeHass();
  const card = new vc.VacuumCard();
  card.setConfig({ device: "q5", show_map: "always", map_entity: "camera.dustbusters_map", collapsed: [] });
  card.hass = hass;
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /title="Xiaomi"/); // Mi Robot Vacuum 1S, a Xiaomi model
  assert.match(html, /data-entity="sensor\.dustbusters_main_brush_remaining"/);
  assert.match(html, /data-entity="button\.dustbusters_reset_filter"/);
  assert.match(html, /1,182/);
  assert.match(html, /data-map="camera\.dustbusters_map"/);
  assert.doesNotMatch(html, /open_rooms/);
  assert.match(html, /data-action="start"/);
});

test("the Roborock integration keeps its logo and room selector", () => {
  const html = newCard(makeHass()).shadowRoot.innerHTML;
  assert.match(html, /title="Roborock"/);
  assert.match(html, /open_rooms/);
});

// Card rendered for one extra vacuum `vacuum.x` of `platform`, with the device `model`.
const logoOf = (platform, model) => {
  const ent = { ...entities, "vacuum.x": { entity_id: "vacuum.x", device_id: "x", platform, translation_key: null } };
  const dev = { ...devices, x: { id: "x", name: "Robot", model, identifiers: [[platform, "x"]] } };
  const st = { ...states, "vacuum.x": { entity_id: "vacuum.x", state: "docked", attributes: {} } };
  const card = new vc.VacuumCard();
  card.setConfig({ device: "x" });
  card.hass = { ...makeHass(st), entities: ent, devices: dev };
  return card.shadowRoot.innerHTML.match(/title="([^"]+)"><img/)?.[1];
};

test("the logo follows the brand of the model, else the integration", () => {
  assert.equal(logoOf("xiaomi_miio", "roborock.vacuum.a72"), "Roborock");
  assert.equal(logoOf("xiaomi_miio", "roborock.vacuum.m1s"), "Xiaomi");
  assert.equal(logoOf("roborock", "rockrobo.vacuum.v1"), "Xiaomi");
  assert.equal(logoOf("xiaomi_home", "xiaomi.vacuum.b108gl"), "Xiaomi");
  assert.equal(logoOf("xiaomi_miio", "dreame.vacuum.p2009"), "Dreame");
  assert.equal(logoOf("xiaomi_miio", "viomi.vacuum.v99"), "Xiaomi Mi Home");
  assert.equal(logoOf("xiaomi_home", "viomi.vacuum.v99"), "Xiaomi");
  assert.equal(logoOf("dreame_vacuum", "mova.vacuum.x1"), "Dreame");
  assert.equal(logoOf("roborock", "roborock.vacuum.zz99"), "Roborock");
});

test("the color option paints the F25 Ultra black", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "Roborock F25 Ultra", color: "dark" });
  card.hass = makeHass();
  const dev = vc.resolve(card._hass).devices.find((d) => d.id === "f25");
  assert.equal(card._picture(dev, card._status(dev)), `data:image/svg+xml,${encodeURIComponent(vc.wetdrySvg({ white: false }))}`);
});

test("a model id as image option draws that model, with the color option", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", image: "roborock.wetdryvac.a56", color: "white" });
  card.hass = makeHass();
  const dev = vc.resolve(card._hass).devices.find((d) => d.id === "saros");
  assert.equal(card._picture(dev, null), `data:image/svg+xml,${encodeURIComponent(vc.wetdrySvg({ white: true }))}`);
});

test("Dreame Vacuum: vacuum discovered, keys mapped, Dreame logo, map camera; Xiaomi-sold model keeps the Xiaomi logo", () => {
  const ent = { ...entities };
  const st = { ...states };
  const add = (entity_id, translation_key, state, attributes = {}) => {
    ent[entity_id] = { entity_id, device_id: "dr", platform: "dreame_vacuum", translation_key };
    st[entity_id] = { entity_id, state, attributes };
  };
  add("vacuum.l10", null, "docked", { fan_speed: "standard" });
  add("sensor.l10_status", "status", "charging");
  add("sensor.l10_battery_level", "battery_level", "88", { device_class: "battery", unit_of_measurement: "%" });
  add("sensor.l10_error", "error", "no_error");
  add("sensor.l10_main_brush_time_left", "main_brush_time_left", "120", { unit_of_measurement: "h" });
  add("sensor.l10_sensor_dirty_time_left", "sensor_dirty_time_left", "12", { unit_of_measurement: "h" });
  add("button.l10_reset_filter", "reset_filter", "unknown");
  add("sensor.l10_cleaning_count", "cleaning_count", "42");
  add("camera.l10_map", "map", "idle", { entity_picture: "/api/camera_proxy/camera.l10_map" });
  const devs = { ...devices, dr: { id: "dr", name: "Dreame L10", model: "dreame.vacuum.p2029", identifiers: [["dreame_vacuum", "dr"]] } };
  const hass = { ...makeHass(st), entities: ent, devices: devs };
  const dev = vc.resolve(hass).devices.find((d) => d.id === "dr");
  assert.equal(dev.vacuum, "vacuum.l10");
  assert.equal(dev.entities.sensor_time_left, "sensor.l10_sensor_dirty_time_left");
  assert.equal(dev.entities.reset_air_filter_consumable, "button.l10_reset_filter");
  assert.equal(dev.entities.total_cleaning_count, "sensor.l10_cleaning_count");
  assert.equal(dev.entities.battery, "sensor.l10_battery_level");
  const card = new vc.VacuumCard();
  card.setConfig({ device: "dr", show_map: "always" });
  card.hass = hass;
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /title="Dreame"/);
  assert.match(html, /data-map="camera\.l10_map"/);
  assert.doesNotMatch(html, /class="alert-line/); // "no_error" is no error
  devs.dr = { ...devs.dr, model: "dreame.vacuum.p2114a" }; // Mi Robot Vacuum X10+
  const card2 = new vc.VacuumCard();
  card2.setConfig({ device: "dr" });
  card2.hass = { ...hass, devices: { ...devs } };
  assert.match(card2.shadowRoot.innerHTML, /title="Xiaomi"/);
});

test("Dreame Vacuum: discovers a vacuum with the dreame_vacuum translation key", () => {
  const vacuum = "vacuum.etage";
  const hass = {
    ...makeHass(),
    entities: { ...entities, [vacuum]: { ...entities[vacuum], translation_key: "dreame_vacuum" } },
  };
  const dev = vc.resolve(hass).devices.find((d) => d.id === "l10");
  assert.ok(dev, "the Dreame device is discovered");
  assert.equal(dev.vacuum, vacuum);
  assert.equal(dev.kind, "robot");

  for (const Card of [vc.VacuumCard, vc.VacuumMiniCard]) {
    const card = new Card();
    card.setConfig({ device: "l10", show_map: "never" });
    card.hass = hass;
    assert.match(card.shadowRoot.innerHTML, /title="Dreame"/);
    assert.match(card.shadowRoot.innerHTML, /data-action="start"/);
  }
});

test("vacuum-card is the card; roborock-card and robot-vacuum-card stay as aliases", () => {
  const get = (t) => vc.window.customElements.get(t);
  assert.ok(get("vacuum-card") === vc.VacuumCard && get("vacuum-mini-card") === vc.VacuumMiniCard);
  for (const t of ["roborock-card", "robot-vacuum-card"]) {
    const card = new (get(t))();
    card.setConfig({ device: "saros", show_map: "never" });
    card.hass = makeHass();
    assert.ok(card instanceof vc.VacuumCard, t);
    assert.match(card.shadowRoot.innerHTML, /title="Roborock"/);
  }
  for (const t of ["roborock-mini-card", "robot-vacuum-mini-card"]) assert.ok(new (get(t))() instanceof vc.VacuumMiniCard, t);
  assert.equal(vc.window.customCards.map((c) => c.type).join(), "vacuum-card,vacuum-mini-card");
  assert.ok(get("vacuum-card-editor") && get("vacuum-mini-card-editor"));
});

test("the editor rebuilds its schema only when the language, the registries or the map size change", () => {
  const probes = [];
  vc.window.Image = class {
    constructor() {
      probes.push(this);
    }
  };
  const editor = new (vc.window.customElements.get("vacuum-card-editor"))();
  editor.setConfig({ device: "saros", map_entity: "camera.dustbusters_map" });
  let hass = makeHass();
  editor.hass = hass;
  let builds = 0;
  let schema = editor._form.schema;
  Object.defineProperty(editor._form, "schema", {
    get: () => schema,
    set(v) {
      builds++;
      schema = v;
    },
  });
  // A state change elsewhere in the instance: new hass, same registries.
  const tick = () => {
    hass = { ...hass, states: { ...hass.states } };
    editor.hass = hass;
  };
  tick();
  editor.setConfig({ device: "saros", map_entity: "camera.dustbusters_map", show_dock: false });
  assert.equal(builds, 0);
  // The map picture's size is known: one rebuild (crop help), none on the next updates.
  probes.at(-1).naturalWidth = 800;
  probes.at(-1).naturalHeight = 600;
  probes.at(-1).onload();
  assert.equal(builds, 1);
  tick();
  assert.equal(builds, 1);
  editor.setConfig({ device: "saros", map_entity: "camera.dustbusters_map", language: "fr" });
  assert.equal(builds, 2);
  hass = { ...hass, entities: { ...hass.entities } };
  editor.hass = hass;
  assert.equal(builds, 3);
});

test("the editor offers every translated language, under its own name", () => {
  for (const tag of ["vacuum-card-editor", "vacuum-mini-card-editor"]) {
    const editor = new (vc.window.customElements.get(tag))();
    editor.setConfig({ device: "saros" });
    editor._hass = makeHass();
    const field = editor._schema().find((f) => f.name === "language");
    const options = field.selector.select.options;
    // Array.from: the options come from the sandbox realm.
    assert.deepEqual(Array.from(options, (o) => o.value), ["", ...Object.keys(vc.STRINGS)], tag);
    const labels = Object.fromEntries(Array.from(options, (o) => [o.value, o.label]));
    assert.equal(labels.it, "Italiano");
    assert.equal(labels.nl, "Nederlands");
    assert.equal(labels.pt, "Português (Portugal)");
    assert.equal(labels.pl, "Polski");
    assert.equal(labels.ro, "Română");
    assert.equal(labels.da, "Dansk");
    assert.equal(labels.sv, "Svenska");
    assert.equal(labels.bg, "Български");
    assert.equal(labels.ru, "Русский");
    assert.equal(labels.uk, "Українська");
    assert.equal(labels.hu, "Magyar");
    assert.equal(labels.sk, "Slovenčina");
    assert.equal(labels.cs, "Čeština");
    assert.equal(labels.sl, "Slovenščina");
    assert.equal(labels.lv, "Latviešu");
    assert.equal(labels.el, "Ελληνικά");
  }
});

test("the accent color of the buttons follows the brand", () => {
  const accent = (device, Card = vc.VacuumCard, darkMode = false) => {
    const card = new Card();
    card.setConfig({ device });
    card.hass = { ...makeHass(), themes: { darkMode } };
    return card.shadowRoot.innerHTML.match(/:host \{ --vc-accent: (#[0-9a-f]+); \}/)?.[1];
  };
  // [light theme, dark theme]: darker shades on a light card, the logo colors on a dark one.
  assert.equal(accent("saros"), "#ea0029"); // Roborock
  assert.equal(accent("saros", vc.VacuumCard, true), "#ea0029");
  assert.equal(accent("q5"), "#c24c00"); // Mi Robot Vacuum 1S: Xiaomi
  assert.equal(accent("q5", vc.VacuumCard, true), "#ff6900");
  assert.equal(accent("l10"), "#8a6a3c"); // L10s Ultra: Dreame
  assert.equal(accent("l10", vc.VacuumMiniCard, true), "#c9a46e");
});

test("Ecovacs: keys mapped, percentage consumables with reset, error code 0 is no error, Ecovacs logo", () => {
  const hass = makeHass();
  const dev = vc.resolve(hass).devices.find((d) => d.id === "x1");
  assert.equal(dev.vacuum, "vacuum.studio");
  assert.equal(dev.entities.main_brush_life, "sensor.studio_brosse");
  assert.equal(dev.entities.reset_mop_consumable, "button.studio_reset_round_mop");
  assert.equal(dev.entities.total_cleaning_count, "sensor.studio_nombre");
  const card = new vc.VacuumCard();
  card.setConfig({ device: "x1", collapsed: [] });
  card.hass = hass;
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /title="Ecovacs"/);
  assert.match(html, /data-entity="button\.studio_reset_round_mop"/);
  assert.match(html, />38 %</);
  assert.doesNotMatch(html, /class="alert-line/);
  card.hass = { ...hass, states: { ...states, "sensor.studio_erreur": { ...states["sensor.studio_erreur"], state: "102", attributes: { description: "HostHang: Robot is stuck" } } } };
  assert.match(card.shadowRoot.innerHTML, /Robot is stuck/);
});

test("Dyson: vacuum only, battery from its attribute, Dyson logo", () => {
  const card = new vc.VacuumMiniCard();
  card.setConfig({ device: "visnav" });
  card.hass = makeHass();
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /title="Dyson"/);
  assert.match(html, /100 %|>100</);
  assert.equal(vc.brandOf("277"), "dyson");
  assert.equal(vc.brandOf("DEEBOT X1 OMNI"), "ecovacs");
});

test("Ecovacs: the station state animates the picture (mops washed / dried)", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "x1" });
  const pic = (state) => {
    card.hass = makeHass({ ...states, "sensor.studio_station": { ...states["sensor.studio_station"], state } });
    const dev = vc.resolve(card._hass).devices.find((d) => d.id === "x1");
    return decodeURIComponent(card._picture(dev, card._status(dev)));
  };
  assert.match(pic("washing_mop"), /class="bub/);
  assert.match(pic("drying_mop"), /class="heat/);
  assert.doesNotMatch(pic("idle"), /class="(bub|heat)/);
});

test("only vacuums are listed: a Roborock Zeo washing machine is skipped", () => {
  const ent = { ...entities, "sensor.zeo_etat": { entity_id: "sensor.zeo_etat", device_id: "zeo", platform: "roborock", translation_key: "zeo_state" } };
  const dev = { ...devices, zeo: { id: "zeo", name: "Roborock Zeo One", model: "roborock.wm.a102", identifiers: [["roborock", "zeo"]] } };
  const ids = vc.resolve({ ...makeHass(), entities: ent, devices: dev }).devices.map((d) => d.id);
  assert.ok(!ids.includes("zeo"));
  assert.ok(ids.includes("f25") && ids.includes("saros"));
});

test("a change of the map_entity camera (outside the device) re-renders the card", () => {
  const hass = makeHass();
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", show_map: "always", map_entity: "camera.dustbusters_map" });
  card.hass = hass;
  let renders = 0;
  const render = card._render.bind(card);
  card._render = () => {
    renders++;
    return render();
  };
  const cam = "camera.dustbusters_map";
  const st = states[cam];
  card.hass = { ...hass, states: { ...states, [cam]: { ...st, attributes: { ...st.attributes, entity_picture: "/api/camera_proxy/camera.dustbusters_map?token=new" } } } };
  assert.equal(renders, 1);
});

// A card whose shadow root parses the map <img> of each rewrite, and pictures loaded aside (new Image()) whose decoding
// the test settles by hand.
const CAM = "camera.dustbusters_map";
const mapCard = (config = {}) => {
  const fakeImg = (attrs = {}) => ({
    dataset: { map: CAM },
    style: { cssText: attrs.style || "" },
    alt: attrs.alt,
    listeners: {},
    attrs: attrs.src ? { src: attrs.src } : {},
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
    hasAttribute(k) {
      return k in this.attrs;
    },
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    replaceWith(other) {
      m.nodes = [other];
    },
  });
  const m = { nodes: [], rewrites: 0, decoding: [] };
  vc.window.Image = class {
    set src(url) {
      this.url = url;
    }
    getAttribute() {
      return this.url;
    }
    decode() {
      return new Promise((resolve, reject) => m.decoding.push({ resolve, reject }));
    }
  };
  const card = new vc.VacuumCard();
  m.card = card;
  const root = card.shadowRoot;
  Object.defineProperty(root, "innerHTML", {
    set(html) {
      m.rewrites++;
      const tag = html.match(/<img [^>]*data-map="[^>]*>/)?.[0];
      const attr = (name) => tag?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      m.nodes = tag ? [fakeImg({ src: attr("src"), alt: attr("alt"), style: attr("style") })] : [];
    },
  });
  root.querySelectorAll = (sel) => (sel === "img[data-map]" ? m.nodes : []);
  card.setConfig({ device: "saros", show_map: "always", map_entity: CAM, ...config });
  m.hass = makeHass();
  card.hass = m.hass;
  m.frame = (url, extra = {}) => {
    const st = m.hass.states[CAM];
    m.hass = { ...m.hass, ...extra, states: { ...m.hass.states, [CAM]: { ...st, attributes: { ...st.attributes, entity_picture: url } } } };
    card.hass = m.hass;
  };
  return m;
};
const settled = () => new Promise((resolve) => setTimeout(resolve));

test("a new map frame does not rewrite the card, and the <img> keeps its picture until the next one is decoded", async () => {
  const m = mapCard();
  const img = m.nodes[0];
  const first = states[CAM].attributes.entity_picture;
  assert.equal(img.getAttribute("src"), first, "the first picture goes straight to the <img>");
  m.frame("/map?v=2");
  assert.equal(m.rewrites, 1);
  assert.equal(img.getAttribute("src"), first);
  m.frame("/map?v=2");
  assert.equal(m.decoding.length, 1, "a frame already loading is not loaded twice");
  m.decoding[0].resolve();
  await settled();
  assert.equal(m.nodes[0], img);
  assert.equal(img.getAttribute("src"), "/map?v=2");
});

test("a render while a map frame is loading moves the same <img>, which still has its picture", async () => {
  const m = mapCard();
  const img = m.nodes[0];
  const first = img.getAttribute("src");
  m.frame("/map?v=2", { language: "fr" });
  assert.equal(m.rewrites, 2);
  assert.equal(m.nodes[0], img, "same node");
  assert.equal(img.alt, vc.STRINGS.fr.map, "its attributes follow the render");
  assert.equal(img.getAttribute("src"), first, "not touched while loading");
  m.decoding[0].resolve();
  await settled();
  assert.equal(img.getAttribute("src"), "/map?v=2");
});

test("a map frame overtaken by a newer one is dropped, and a failed one leaves the picture shown", async () => {
  const m = mapCard();
  const img = m.nodes[0];
  const first = img.getAttribute("src");
  m.frame("/map?v=2");
  m.frame("/map?v=3");
  m.decoding[0].resolve();
  await settled();
  assert.equal(img.getAttribute("src"), first, "v=2 was overtaken");
  m.decoding[1].reject(new Error("broken"));
  await settled();
  assert.equal(img.getAttribute("src"), first, "v=3 failed");
  m.frame("/map?v=4");
  m.decoding[2].resolve();
  await settled();
  assert.equal(img.getAttribute("src"), "/map?v=4");
});

test("no map frame is loaded while the card is off-screen; the latest one is once it is back in view", async () => {
  let observer;
  vc.window.IntersectionObserver = class {
    constructor(cb) {
      observer = this;
      this.cb = cb;
    }
    observe(el) {
      this.target = el;
    }
    disconnect() {
      this.target = null;
    }
  };
  try {
    const m = mapCard();
    const img = m.nodes[0];
    const first = img.getAttribute("src");
    m.card.connectedCallback();
    assert.equal(observer.target, m.card);
    observer.cb([{ isIntersecting: false }]);
    m.frame("/map?v=2");
    m.frame("/map?v=3");
    assert.equal(m.decoding.length, 0, "nothing loaded off-screen");
    assert.equal(img.getAttribute("src"), first);
    observer.cb([{ isIntersecting: true }]);
    assert.equal(m.decoding.length, 1, "only the latest frame is loaded");
    m.decoding[0].resolve();
    await settled();
    assert.equal(img.getAttribute("src"), "/map?v=3");
    m.card.disconnectedCallback();
    assert.equal(observer.target, null, "the observer is released");
  } finally {
    delete vc.window.IntersectionObserver;
  }
});

test("no map frame is loaded while the tab is hidden; the latest one is when it shows again", async () => {
  const listeners = {};
  const { addEventListener, removeEventListener } = vc.document;
  vc.document.addEventListener = (type, fn) => {
    listeners[type] = fn;
  };
  vc.document.removeEventListener = (type, fn) => {
    if (listeners[type] === fn) delete listeners[type];
  };
  try {
    const m = mapCard();
    const img = m.nodes[0];
    m.card.connectedCallback();
    vc.document.hidden = true;
    m.frame("/map?v=2");
    assert.equal(m.decoding.length, 0, "nothing loaded in a hidden tab");
    vc.document.hidden = false;
    listeners.visibilitychange();
    assert.equal(m.decoding.length, 1);
    m.decoding[0].resolve();
    await settled();
    assert.equal(img.getAttribute("src"), "/map?v=2");
    m.card.disconnectedCallback();
    assert.equal(listeners.visibilitychange, undefined, "the listener is removed");
  } finally {
    Object.assign(vc.document, { addEventListener, removeEventListener });
    delete vc.document.hidden;
  }
});

test("the crop applies to the kept map <img> once its size is known", async () => {
  const m = mapCard({ crop: { top: 10 } });
  const img = m.nodes[0];
  m.card.isConnected = true;
  assert.equal(img.style.cssText, "", "uncropped until the size is known");
  img.naturalWidth = 200;
  img.naturalHeight = 100;
  img.listeners.load({ target: img });
  await settled();
  assert.equal(m.nodes[0], img);
  assert.match(img.style.cssText, /margin-top:-5\.0000%/);
});

test("a dock section unfolded by hand stays unfolded when a dock problem appears", () => {
  const card = newCard(makeHass());
  let problem = false;
  card._dockProblem = () => problem;
  assert.equal(card._isCollapsed("dock"), true);
  click(card, { action: "toggle_section", section: "dock" });
  assert.equal(card._isCollapsed("dock"), false);
  problem = true;
  assert.equal(card._isCollapsed("dock"), false);
  problem = false;
  assert.equal(card._isCollapsed("dock"), false);
  click(card, { action: "toggle_section", section: "dock" });
  assert.equal(card._isCollapsed("dock"), true);
});

test("the mini card draws no empty room band when the room list belongs to another vacuum", () => {
  const card = new vc.VacuumMiniCard();
  card.setConfig({ device: "saros" });
  card._rooms = { entity: "vacuum.elsewhere", list: [], selected: [] };
  card.hass = makeHass();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="rooms-wrap"/);
});

// A click on the enlarged map as the browser delivers it: the document capture listeners first (the cards' outside
// click handlers), then the overlay's own listener, which closes it.
const MAP_ID = "camera.dustbusters_map";
const clickZoomedMap = (...captureListeners) => {
  const overlay = vc.document.body.children.at(-1);
  const box = overlay.children[0];
  const ev = { composedPath: () => [box.children[0], box, overlay, vc.document.body] };
  for (const fn of captureListeners) fn(ev);
  overlay.listeners.click(ev);
};

test("closing the enlarged map by a click keeps the unfolded sections of the full card", () => {
  const card = newCard(makeHass());
  card.connectedCallback();
  click(card, { action: "toggle_section", section: "stats" });
  card._zoomMap(MAP_ID);
  assert.equal(vc.document.body.children.length, 1);
  clickZoomedMap(card._onOutside);
  assert.equal(vc.document.body.children.length, 0, "the map is closed");
  assert.equal(card._toggled.size, 1, "the section stays unfolded");
  // Once the map is closed, a click elsewhere on the page folds the sections again.
  card._onOutside({ composedPath: () => [{ tagName: "DIV" }] });
  assert.equal(card._toggled.size, 0);
  card.disconnectedCallback();
});

test("closing the enlarged map by a click leaves the mini card in its detailed view", () => {
  const mini = newMini(makeHass());
  click(mini, { action: "zoom" });
  mini._zoomMap(MAP_ID);
  clickZoomedMap(mini._onOutside, mini._onUnzoom);
  assert.equal(vc.document.body.children.length, 0);
  assert.equal(mini._zoomed, true);
  assert.match(mini.shadowRoot.innerHTML, /class="section-title/);
  mini.disconnectedCallback();
});

test("a map closed with Escape or detached with the card no longer counts as part of the card", () => {
  const mini = newMini(makeHass());
  click(mini, { action: "zoom" });
  mini._zoomMap(MAP_ID);
  // Opening it again replaces the overlay: only the new one is on the page and recognised.
  mini._zoomMap(MAP_ID);
  assert.equal(vc.document.body.children.length, 1);
  const overlay = vc.document.body.children[0];
  vc.window.fire("keydown", { key: "Escape" });
  assert.equal(vc.document.body.children.length, 0);
  assert.equal(mini._zoomOverlay ?? null, null);
  // A stale path through the removed overlay is an outside click again.
  mini._onUnzoom({ composedPath: () => [overlay, vc.document.body] });
  assert.equal(mini._zoomed, false);
  click(mini, { action: "zoom" });
  mini._zoomMap(MAP_ID);
  mini.disconnectedCallback();
  assert.equal(vc.document.body.children.length, 0);
  assert.equal(mini._zoomOverlay ?? null, null);
});

test("iRobot: keys mapped, battery by device class, iRobot logo and green buttons, statistics", () => {
  const hass = makeHass();
  const dev = vc.resolve(hass).devices.find((d) => d.id === "j7");
  assert.equal(dev.vacuum, "vacuum.couloir");
  assert.equal(dev.platform, "roomba");
  assert.equal(dev.entities.total_cleaning_count, "sensor.couloir_missions");
  assert.equal(dev.entities.total_cleaning_area, "sensor.couloir_surface_totale");
  assert.equal(dev.entities.last_clean_start, "sensor.couloir_derniere_mission");
  const card = new vc.VacuumCard();
  card.setConfig({ device: "Workshop robot", collapsed: [] });
  card.hass = { ...hass, themes: { darkMode: false } };
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /title="iRobot"/);
  assert.match(html, /--vc-accent: #4a8209/);
  assert.match(html, />100<small>/);
  assert.match(html, /5,310 m²/);
  assert.match(html, /Last clean 9 hours ago/);
  assert.match(html, /Charging/);
  assert.doesNotMatch(html, /class="alert-line/);
  assert.doesNotMatch(html, /data-action="open_rooms"/); // no room selector: Start cleans right away
});

test("iRobot: emptying status, current clean from the attributes, bin full and errors", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "j7" });
  const with_ = (vac, extra = {}) => {
    card.hass = makeHass({ ...states, "vacuum.couloir": { ...states["vacuum.couloir"], ...vac }, ...extra });
    const dev = vc.resolve(card._hass).devices.find((d) => d.id === "j7");
    return { html: card.shadowRoot.innerHTML, pic: decodeURIComponent(card._picture(dev, card._status(dev))) };
  };
  const emptying = with_({ state: "returning", attributes: { status: "Emptying Bin" } });
  assert.match(emptying.html, /Emptying the bin/);
  assert.match(emptying.pic, /class="evac/);
  const cleaning = with_({ state: "cleaning", attributes: { status: "Running", cleaning_time: 23, cleaned_area: 19 } });
  assert.match(cleaning.html, /19 m² · 23 min/);
  assert.match(cleaning.pic, /class="spin"/);
  const bin = with_({}, { "binary_sensor.couloir_bac_plein": { ...states["binary_sensor.couloir_bac_plein"], state: "on" } });
  assert.match(bin.html, /class="alert-line[^>]*>[\s\S]*Bin full/);
  const err = with_({ state: "docked", attributes: { status: "Charging", error: "Bin missing", error_code: 16 } });
  assert.match(err.html, /Bin missing/);
});

test("iRobot: the Clean Base emptying the bin as roombapy reports it (status \"Emptying Bin\")", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "j7" });
  const with_ = (attributes) => {
    card.hass = makeHass({ ...states, "vacuum.couloir": { ...states["vacuum.couloir"], state: "returning", attributes } });
    const dev = vc.resolve(card._hass).devices.find((d) => d.id === "j7");
    return { status: card._status(dev), html: card.shadowRoot.innerHTML, pic: decodeURIComponent(card._picture(dev, card._status(dev))) };
  };
  const evac = with_({ status: "Emptying Bin" });
  assert.equal(evac.status.state, "emptying_the_bin");
  assert.match(evac.html, /Emptying the bin/);
  assert.doesNotMatch(evac.html, /Returning to dock/);
  assert.match(evac.pic, /class="evac/);
  // The short form is still accepted; any other status while returning stays "Returning to dock".
  assert.match(with_({ status: "Emptying" }).html, /Emptying the bin/);
  const back = with_({ status: "Returning" });
  assert.match(back.html, /Returning to dock/);
  assert.doesNotMatch(back.pic, /class="evac/);
  // Unavailable vacuum: the stale status attribute is ignored.
  card.hass = makeHass({ ...states, "vacuum.couloir": { ...states["vacuum.couloir"], state: "unavailable", attributes: { status: "Emptying Bin" } } });
  const dev = vc.resolve(card._hass).devices.find((d) => d.id === "j7");
  assert.equal(card._status(dev).state, "unavailable");
});

test("iRobot: current clean area in ft² with the US customary unit system", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "j7" });
  const vac = { ...states["vacuum.couloir"], state: "cleaning", attributes: { status: "Running", cleaning_time: 23, cleaned_area: 205 } };
  card.hass = { ...makeHass({ ...states, "vacuum.couloir": vac }), config: { unit_system: { length: "mi", area: "ft²" } } };
  assert.match(card.shadowRoot.innerHTML, /205 ft² · 23 min/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /205 m²/);
  // Metric unit system, or no unit system known (older or minimal hass object): m².
  card.hass = { ...makeHass({ ...states, "vacuum.couloir": vac }), config: { unit_system: { length: "km", area: "m²" } } };
  assert.match(card.shadowRoot.innerHTML, /205 m² · 23 min/);
  card.hass = makeHass({ ...states, "vacuum.couloir": vac });
  assert.match(card.shadowRoot.innerHTML, /205 m² · 23 min/);
});

test("iRobot Braava: mopping picture, robot tank in percent", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "m6" });
  card.hass = makeHass({ ...states, "vacuum.salle_de_bain": { ...states["vacuum.salle_de_bain"], state: "cleaning", attributes: { ...states["vacuum.salle_de_bain"].attributes, status: "Running" } } });
  const dev = vc.resolve(card._hass).devices.find((d) => d.id === "m6");
  assert.match(card.shadowRoot.innerHTML, /Robot tank · 80 %/);
  assert.match(decodeURIComponent(card._picture(dev, card._status(dev))), /class="wet"/);
});

test("area sensors keep their own unit (ft² set in the entity settings), m² when they have none", () => {
  const ft = (id, state) => ({ ...states[id], state, attributes: { ...states[id].attributes, unit_of_measurement: "ft²" } });
  const card = new vc.VacuumCard();
  card.setConfig({ device: "x1", collapsed: [] });
  card.hass = makeHass({ ...states, "sensor.studio_surface": ft("sensor.studio_surface", "516.7"), "sensor.studio_surface_totale": ft("sensor.studio_surface_totale", "67167") });
  let html = card.shadowRoot.innerHTML;
  assert.match(html, /516\.7 ft²/);
  assert.match(html, /67,167 ft²/);
  assert.doesNotMatch(html, /516\.7 m²|67,167 m²/);
  // Current clean, read from the area sensor while the robot cleans.
  card.hass = makeHass({
    ...states,
    "vacuum.studio": { ...states["vacuum.studio"], state: "cleaning" },
    "sensor.studio_surface": ft("sensor.studio_surface", "12.5"),
  });
  assert.match(card.shadowRoot.innerHTML, /12\.5 ft²/);
  // A sensor without a unit (or a minimal state object) still reads m².
  const bare = (id, state) => ({ ...states[id], state, attributes: {} });
  card.hass = makeHass({ ...states, "sensor.studio_surface": bare("sensor.studio_surface", "48"), "sensor.studio_surface_totale": bare("sensor.studio_surface_totale", "6240") });
  html = card.shadowRoot.innerHTML;
  assert.match(html, /48 m²/);
  assert.match(html, /6,240 m²/);
});

// Room selection beyond Roborock: Xiaomi Miio from the `rooms` option, Dreame from the vacuum's `rooms` attribute.
const openAndClean = (card, entity, rooms) => {
  click(card, { action: "open_rooms", entity });
  for (const room of rooms) click(card, { action: "toggle_room", entity, room });
  click(card, { action: "clean_rooms", entity });
};

test("Xiaomi Miio: the rooms option opens the room selector and cleans with xiaomi_miio.vacuum_clean_segment", () => {
  const hass = makeHass();
  const card = new vc.VacuumCard();
  card.setConfig({ device: "q5", rooms: [{ id: 17, name: "Kitchen" }, { id: 16, name: "Bedroom" }, { name: "no id" }] });
  card.hass = hass;
  assert.match(card.shadowRoot.innerHTML, /data-action="open_rooms"/);
  click(card, { action: "open_rooms", entity: "vacuum.dustbusters" });
  const html = card.shadowRoot.innerHTML;
  // The option's order is kept, entries without an id are left out.
  assert.ok(html.indexOf(">Kitchen<") < html.indexOf(">Bedroom<"));
  assert.doesNotMatch(html, /no id/);
  click(card, { action: "toggle_room", entity: "vacuum.dustbusters", room: "16" });
  click(card, { action: "clean_rooms", entity: "vacuum.dustbusters" });
  assert.equal(JSON.stringify(hass.calls), JSON.stringify([["xiaomi_miio", "vacuum_clean_segment", { entity_id: "vacuum.dustbusters", segments: [16] }]]));
  // room_selection: false still starts a full cleaning right away.
  card.setConfig({ device: "q5", rooms: [{ id: 17, name: "Kitchen" }], room_selection: false });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /open_rooms/);
});

test("Dreame Vacuum: rooms of the selected map from the vacuum's attribute, cleaned with dreame_vacuum.vacuum_clean_segment", () => {
  const vac = states["vacuum.etage"];
  const rooms = { "Ground floor": [{ id: 9, name: "Hall" }], Upstairs: [{ id: 3, name: "Office", icon: "mdi:desk" }, { id: 2, name: "Bathroom" }] };
  const hass = makeHass({ ...states, "vacuum.etage": { ...vac, attributes: { ...vac.attributes, rooms, selected_map: "Upstairs" } } });
  const card = new vc.VacuumCard();
  card.setConfig({ device: "l10" });
  card.hass = hass;
  click(card, { action: "open_rooms", entity: "vacuum.etage" });
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /data-room="3">Office</);
  assert.match(html, /data-room="2">Bathroom</);
  assert.doesNotMatch(html, /Hall/);
  openAndClean(card, "vacuum.etage", ["3", "2"]);
  assert.equal(JSON.stringify(hass.calls), JSON.stringify([["dreame_vacuum", "vacuum_clean_segment", { entity_id: "vacuum.etage", segments: [3, 2] }]]));
});

test("Dreame Vacuum without a rooms attribute and other integrations keep Start cleaning right away", () => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "l10" });
  card.hass = makeHass();
  assert.doesNotMatch(card.shadowRoot.innerHTML, /open_rooms/);
  // Ecovacs has no segment cleaning the card knows: the option does nothing there.
  card.setConfig({ device: "x1", rooms: [{ id: 1, name: "Hall" }] });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /open_rooms/);
});

test("Roborock: the rooms option replaces roborock.get_maps", () => {
  const hass = { ...makeHass(), callWS: () => assert.fail("get_maps called") };
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", show_map: "never", rooms: [{ id: "21", name: "Lounge" }] });
  card.hass = hass;
  const vacuum = vc.resolve(hass).devices.find((d) => d.id === "saros").vacuum;
  openAndClean(card, vacuum, ["21"]);
  assert.equal(JSON.stringify(hass.calls), JSON.stringify([["vacuum", "send_command", { entity_id: vacuum, command: "app_segment_clean", params: [{ segments: [21] }] }]]));
});

test("the enlarged map is a modal dialog that takes the focus and gives it back", () => {
  const card = newCard(makeHass());
  const opener = { focused: 0, focus() {
    this.focused++;
  } };
  card.shadowRoot.activeElement = opener;
  card.isConnected = true;
  card._zoomMap(MAP_ID);
  const overlay = vc.document.body.children.at(-1);
  assert.equal(overlay.getAttribute("role"), "dialog");
  assert.equal(overlay.getAttribute("aria-modal"), "true");
  assert.equal(overlay.getAttribute("aria-label"), "Map");
  assert.equal(overlay.focused, 1);
  let prevented = 0;
  vc.window.fire("keydown", { key: "Tab", preventDefault: () => prevented++ });
  assert.equal(prevented, 1, "Tab stays in the dialog");
  vc.window.fire("keydown", { key: "Escape" });
  assert.equal(vc.document.body.children.length, 0);
  assert.equal(opener.focused, 1);
});

test("the enlarged map shows the new map frames", async () => {
  // Next frame loaded aside and decoded right away.
  vc.window.Image = class {
    getAttribute(name) {
      return name === "src" ? this.src : null;
    }
    decode() {
      return Promise.resolve();
    }
  };
  const hass = makeHass();
  const card = new vc.VacuumCard();
  card.setConfig({ device: "q5", show_map: "always", map_entity: MAP_ID });
  card.hass = hass;
  card._zoomMap(MAP_ID);
  const img = vc.document.body.children.at(-1).children[0].children[0];
  assert.equal(img.getAttribute("src"), states[MAP_ID].attributes.entity_picture);
  const next = { ...states[MAP_ID], attributes: { ...states[MAP_ID].attributes, entity_picture: "/api/camera_proxy/camera.dustbusters_map?token=2" } };
  card.hass = { ...hass, states: { ...states, [MAP_ID]: next } };
  await new Promise((r) => setTimeout(r));
  assert.equal(img.getAttribute("src"), "/api/camera_proxy/camera.dustbusters_map?token=2");
  vc.window.fire("keydown", { key: "Escape" });
  // Closed: no frame is loaded for it any more.
  assert.equal(card._zoomImg, null);
  delete vc.window.Image;
});

test("the header icon takes the worst of the status, the water tanks and the consumables", () => {
  const icon = (st) => newCard(makeHass(st)).shadowRoot.innerHTML.match(/class="logo-link type-icon( [a-z]+)?"/)?.[1]?.trim();
  // The mock's sensors are nearly due (2.5 h of 30 h).
  assert.equal(icon(states), "warn");
  const fresh = { ...states, "sensor.aspirateur_capteurs": { ...states["sensor.aspirateur_capteurs"], state: "25" } };
  assert.equal(icon(fresh), "ok");
  const set = (id, state) => ({ ...fresh, [id]: { ...fresh[id], state } });
  assert.equal(icon(set("sensor.aspirateur_etat", "cleaning")), "active");
  assert.equal(icon(set("binary_sensor.station_eau_sale", "on")), "crit");
  assert.equal(icon(set("sensor.aspirateur_brosse_principale", "5")), "warn");
  assert.equal(icon(set("sensor.aspirateur_brosse_principale", "0")), "crit");
});

test("the mini card editor offers the full card's options its detail view uses, not vector_map_options", () => {
  const names = (tag) => {
    const editor = new (vc.window.customElements.get(tag))();
    editor.setConfig({ device: "saros" });
    editor._hass = makeHass();
    return editor._schema().flatMap((f) => (f.type === "grid" ? f.schema.map((x) => x.name) : [f.name]));
  };
  const full = names("vacuum-card-editor");
  const mini = names("vacuum-mini-card-editor");
  for (const name of full) assert.ok(mini.includes(name), name);
  for (const name of ["show_modes", "show_routines", "show_dock", "show_consumables", "show_stats", "collapsed", "vector_map", "map_entity", "crop", "show_map", "zoom"])
    assert.ok(mini.includes(name), name);
  assert.ok(!mini.includes("vector_map_options") && !full.includes("vector_map_options"));
  // Every label in every language.
  for (const [l, table] of Object.entries(vc.STRINGS)) for (const name of mini) assert.ok(table[name], `${l}: ${name}`);
});
