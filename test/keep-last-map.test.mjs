// keep_last_map: the map keeps the last frame of a cleaning job once it ends (#118).
import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();
const vacuumId = Object.keys(states).find((id) => id.startsWith("vacuum."));
const withState = (state) => ({ ...states, [vacuumId]: { ...states[vacuumId], state } });
const hassFor = (state) => ({ entities, devices, states: withState(state), language: "en", callService() {} });

const run = (config, sequence) => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", map_entity: "camera.dustbusters_map", vector_map: false, collapsed: [], ...config });
  const seen = [];
  for (const state of sequence) {
    card.hass = hassFor(state);
    seen.push({ frozen: !!card._mapFrozen, map: /class="map clickable"/.test(card.shadowRoot.innerHTML) });
  }
  return seen;
};

test("keep_last_map freezes the map once the job ends and lets it go when the next one starts", () => {
  const seen = run({ keep_last_map: true, show_map: "always" }, ["cleaning", "returning", "docked", "cleaning"]);
  assert.deepEqual(
    seen.map((s) => s.frozen),
    [false, false, true, false],
  );
});

test("keep_last_map never freezes a map the card did not see being cleaned", () => {
  assert.deepEqual(
    run({ keep_last_map: true, show_map: "always" }, ["docked", "idle"]).map((s) => s.frozen),
    [false, false],
  );
});

test("with show_map: cleaning, keep_last_map keeps the map on screen after the job", () => {
  assert.deepEqual(
    run({ keep_last_map: true, show_map: "cleaning" }, ["docked", "cleaning", "returning", "docked"]).map((s) => s.map),
    [false, true, true, true],
  );
  assert.deepEqual(
    run({ show_map: "cleaning" }, ["cleaning", "docked"]).map((s) => s.map),
    [true, false],
  );
});
