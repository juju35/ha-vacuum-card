// Vacuum Map: the map section of a Roborock robot shows its vacuum-map-card when that element is defined.
import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();
const hass = { entities, devices, states, language: "en", callService() {} };

const render = (config) => {
  const card = new vc.VacuumCard();
  card.setConfig({ device: "saros", show_map: "always", collapsed: [], ...config });
  card.hass = hass;
  return card.shadowRoot.innerHTML;
};

test("without Vacuum Map, the map picture", () => {
  assert.doesNotMatch(render({}), /data-vector-map/);
});

test("with Vacuum Map, its map instead of the picture, unless vector_map is false or map_entity is set", () => {
  const configs = [];
  class FakeMap {
    setConfig(config) {
      configs.push(config);
    }
  }
  vc.window.customElements.define("vacuum-map-card", FakeMap);
  const html = render({ vector_map_options: { view: "3d" } });
  assert.match(html, /data-action="zoom_vector"/);
  assert.match(html, /data-vector-map="vacuum\.[a-z0-9_]+"/);
  assert.doesNotMatch(render({ vector_map: false }), /data-vector-map/);
  assert.doesNotMatch(render({ map_entity: "camera.dustbusters_map" }), /data-vector-map/);
});

test("the mini card shows the map under the robot as the full card does (show_map, while cleaning by default)", () => {
  const mini = (config) => {
    const card = new vc.VacuumMiniCard();
    card.setConfig({ device: "saros", ...config });
    card.hass = hass;
    return card.shadowRoot.innerHTML;
  };
  assert.match(mini({ show_map: "always" }), /<div class="map-wrap"><div class="map vector/);
  assert.doesNotMatch(mini({ show_map: "never" }), /<div class="map-wrap">/);
});
