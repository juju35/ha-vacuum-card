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

test("Escape still closes the popup after the card is detached and attached again", () => {
  const hass = makeHass();
  const card = newCard(hass);
  card.connectedCallback();
  click(card, { action: "routine", entity: "button.routine", label: "Morning" });
  card.disconnectedCallback();
  card.connectedCallback();
  assert.match(card.shadowRoot.innerHTML, /dialog-open/);
  vc.window.fire("keydown", { key: "Escape", stopPropagation() {} });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /dialog-open/);
  assert.equal(hass.calls.length, 0);
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
  assert.deepEqual(mini.getGridOptions(), full.getGridOptions());
  click(mini, { action: "zoom" });
  assert.match(mini.shadowRoot.innerHTML, /title="Show the full card"/);
  assert.doesNotMatch(mini.shadowRoot.innerHTML, /class="section-title/);
  assert.equal(mini.getCardSize(), 3);
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
