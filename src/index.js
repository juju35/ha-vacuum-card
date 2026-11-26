/*
 * Vacuum Card for Home Assistant
 * https://github.com/juju35/ha-vacuum-card
 *
 * Lovelace cards for robot vacuums, whatever the integration: Roborock
 * (https://www.home-assistant.io/integrations/roborock/), Xiaomi Miio (https://www.home-assistant.io/integrations/xiaomi_miio/),
 * Xiaomi Home (https://github.com/XiaoMi/ha_xiaomi_home), Dreame Vacuum (https://github.com/Tasshack/dreame-vacuum),
 * Ecovacs (https://www.home-assistant.io/integrations/ecovacs/), Dyson (https://github.com/libdyson-wg/ha-dyson), iRobot
 * (https://www.home-assistant.io/integrations/roomba/, and the Braava 240 through https://github.com/mtheli/braava_240_ble) or
 * SwitchBot (https://www.home-assistant.io/integrations/switchbot/, https://www.home-assistant.io/integrations/switchbot_cloud/).
 * Entities are resolved through the entity and device registries (platform, translation_key and
 * device), so they work whatever the Home Assistant language or entity ids.
 */
import { pickerDefine } from "./picker.js";
import { VERSION } from "./constants.js";
import { VacuumCard } from "./card.js";
import { VacuumMiniCard } from "./mini-card.js";
import { VacuumCardEditor, VacuumMiniCardEditor } from "./editor.js";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

const define = (name, cls) => {
  if (!customElements.get(name)) pickerDefine(name, cls);
};
define("vacuum-card", VacuumCard);
define("vacuum-mini-card", VacuumMiniCard);
// Former types, kept so that existing dashboards keep working: same cards under another name. A custom element class
// can only be defined once, hence the subclasses. If another card already registered "vacuum-card" (such as
// denysdovhan/vacuum-card, loaded first), these types are the way to use this one.
for (const [name, base] of [
  ["roborock-card", VacuumCard],
  ["robot-vacuum-card", VacuumCard],
  ["roborock-mini-card", VacuumMiniCard],
  ["robot-vacuum-mini-card", VacuumMiniCard],
])
  define(name, class extends base {});
define("vacuum-card-editor", VacuumCardEditor);
define("vacuum-mini-card-editor", VacuumMiniCardEditor);

window.customCards = window.customCards || [];
for (const card of [
  {
    type: "vacuum-card",
    name: "Vacuum Card",
    description: "Monitor and control a Roborock, Xiaomi, Dreame, Ecovacs, Dyson, iRobot or SwitchBot robot vacuum or wet-dry vacuum: status, battery, routines, dock, maintenance and statistics.",
  },
  {
    type: "vacuum-mini-card",
    name: "Vacuum Mini Card",
    description: "Compact Roborock, Xiaomi, Dreame, Ecovacs, Dyson, iRobot or SwitchBot robot vacuum overview: status, battery, current room and quick controls.",
  },
]) {
  if (!window.customCards.some((c) => c.type === card.type))
    window.customCards.push({ ...card, preview: true, documentationURL: "https://github.com/juju35/ha-vacuum-card" });
}

console.info(
  `%c VACUUM-CARD %c v${VERSION} `,
  "color: white; background: #ea0029; font-weight: 700;",
  "color: #ea0029; background: white; font-weight: 700;"
);
