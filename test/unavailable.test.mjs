// A vacuum that is unavailable (or whose state is unknown with nothing else to tell it) gets no command:
// its buttons are disabled and a click on them calls no service.
import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();

const VAC = "vacuum.aspirateur";
const STATUS = "sensor.aspirateur_etat";

const makeHass = (st = states) => {
  const calls = [];
  return { calls, entities, devices, states: st, language: "en", callService: (...a) => calls.push(a) };
};

const withStates = (patch) => {
  const st = { ...states };
  for (const [id, state] of Object.entries(patch)) st[id] = { ...states[id], state };
  return st;
};

const newCard = (hass, Card = vc.VacuumCard, config = {}) => {
  const card = new Card();
  card.setConfig({ device: "saros", show_map: "never", collapsed: [], ...config });
  card.hass = hass;
  return card;
};

const click = (card, dataset) => card._onClick({ composedPath: () => [{ dataset }], stopPropagation() {} });

// Opening tags of the vacuum command buttons (start, pause, stop, dock, locate) and of the routines.
const commandTags = (html) => html.match(/<button [^>]*data-action="(?:start|open_rooms|pause|stop|return_to_base|locate|routine)"[^>]*>/g) || [];

for (const [name, Card] of [
  ["full", vc.VacuumCard],
  ["mini", vc.VacuumMiniCard],
]) {
  test(`${name} card: an unavailable vacuum gets disabled command buttons, and a click on them does nothing`, () => {
    const hass = makeHass(withStates({ [VAC]: "unavailable", [STATUS]: "unavailable" }));
    const card = newCard(hass, Card);
    const html = card.shadowRoot.innerHTML;
    // The status chip says it, translated.
    assert.match(html, /Unavailable/);
    const tags = commandTags(html);
    assert.ok(tags.length >= 2, "the command buttons are still drawn");
    for (const tag of tags) {
      assert.match(tag, /\bdisabled\b/, tag);
      assert.match(tag, /class="[^"]*\bdisabled\b/, tag);
    }
    for (const action of ["start", "open_rooms", "pause", "stop", "return_to_base", "locate", "clean_all"]) click(card, { action, entity: VAC });
    click(card, { action: "routine", entity: "button.aspirateur_morning", label: "Morning" });
    assert.deepEqual(hass.calls, []);
    // No room list and no confirmation popup was opened either.
    assert.equal(card._rooms ?? null, null);
    assert.equal(card._confirm ?? null, null);
  });
}

test("the buttons come back as soon as the vacuum is available again", () => {
  const hass = makeHass(withStates({ [VAC]: "unavailable" }));
  const card = newCard(hass);
  card.hass = makeHass();
  for (const tag of commandTags(card.shadowRoot.innerHTML)) assert.doesNotMatch(tag, /\bdisabled\b/, tag);
  click(card, { action: "return_to_base", entity: VAC });
  assert.deepEqual(JSON.parse(JSON.stringify(card._hass.calls)), [["vacuum", "return_to_base", { entity_id: VAC }]]);
});

test("an unknown vacuum state with nothing else to tell the robot's status disables the commands", () => {
  const hass = makeHass(withStates({ [VAC]: "unknown", [STATUS]: "unknown" }));
  const card = newCard(hass);
  for (const tag of commandTags(card.shadowRoot.innerHTML)) assert.match(tag, /\bdisabled\b/, tag);
  click(card, { action: "stop", entity: VAC });
  assert.deepEqual(hass.calls, []);
});

test("an unknown vacuum state while the status sensor still reports the robot keeps the commands (online robot)", () => {
  // Some integrations map an activity they do not know to "unknown" while the robot is online: Stop and Dock must
  // then still work.
  const hass = makeHass(withStates({ [VAC]: "unknown", [STATUS]: "cleaning" }));
  const card = newCard(hass);
  for (const tag of commandTags(card.shadowRoot.innerHTML)) assert.doesNotMatch(tag, /\bdisabled\b/, tag);
  click(card, { action: "stop", entity: VAC });
  assert.equal(hass.calls.length, 1);
});

test("the room selector already open is closed by Cancel, not blocked, when the vacuum becomes unavailable", () => {
  const hass = makeHass();
  hass.callWS = () => new Promise(() => {});
  const card = newCard(hass);
  click(card, { action: "open_rooms", entity: VAC });
  assert.ok(card._rooms);
  card.hass = { ...makeHass(withStates({ [VAC]: "unavailable" })), callWS: hass.callWS };
  click(card, { action: "clean_all", entity: VAC });
  assert.deepEqual(card._hass.calls, []);
  click(card, { action: "close_rooms", entity: VAC });
  assert.equal(card._rooms, null);
});

test("a device without a vacuum entity keeps its routines", () => {
  const card = newCard(makeHass());
  card._dev = { ...card._dev, vacuum: undefined };
  card._openConfirm = (c) => (card._confirm = c);
  click(card, { action: "routine", entity: "button.aspirateur_morning", label: "Morning" });
  assert.ok(card._confirm, "the routine's confirmation opens");
});

// iRobot: the vacuum's status attribute (roombapy's phase) is its status sensor. Home Assistant reports a phase
// missing from its table as "unknown" while the robot is online and talking: the chip then says the phase
// ("Charging"…) and the commands must agree with it instead of being disabled.
test("iRobot: an unknown vacuum state with a status attribute keeps the commands, as the chip says the robot is there", () => {
  const ROOMBA = "vacuum.couloir";
  const st = { ...states, [ROOMBA]: { ...states[ROOMBA], state: "unknown", attributes: { ...states[ROOMBA].attributes, status: "Charging" } } };
  const hass = makeHass(st);
  const card = newCard(hass, vc.VacuumCard, { device: "j7" });
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /Charging/);
  const tags = commandTags(html);
  assert.ok(tags.length >= 2);
  for (const tag of tags) assert.doesNotMatch(tag, /\bdisabled\b/, tag);
  click(card, { action: "return_to_base", entity: ROOMBA });
  assert.equal(hass.calls.length, 1);
});

test("iRobot: an unknown vacuum state without a status attribute still disables the commands", () => {
  const ROOMBA = "vacuum.couloir";
  const { status: _s, ...attributes } = states[ROOMBA].attributes;
  const st = { ...states, [ROOMBA]: { ...states[ROOMBA], state: "unknown", attributes } };
  const hass = makeHass(st);
  const card = newCard(hass, vc.VacuumMiniCard, { device: "j7" });
  for (const tag of commandTags(card.shadowRoot.innerHTML)) assert.match(tag, /\bdisabled\b/, tag);
  click(card, { action: "return_to_base", entity: ROOMBA });
  assert.deepEqual(hass.calls, []);
});
