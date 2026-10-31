// The README screenshots (PNG) and animations (GIF) rendered by scripts/screenshots.mjs.
// Every capture has a twin in the other theme ("-dark" for a light capture, "-light" for a dark one)
// that shows exactly the same state: only the theme differs (checked by test/screenshots.test.mjs).
import { cleaning, returning, washing, drying, f25Cleaning, ecovacsCleaning, ecovacsReturning, ecovacsWashing, ecovacsDrying, dysonCleaning, dysonReturning, irobotCleaning, irobotReturning, irobotEmptying, braavaMopping } from "./mock-states.mjs";

export const shots = [
  { file: "card", type: "vacuum-card", theme: "light", width: 460, config: {} },
  { file: "card-dark", type: "vacuum-card", theme: "dark", width: 460, config: { crop: { top: 10, bottom: 10, left: 10, right: 10 } }, overrides: cleaning },
  { file: "card-rooms", type: "vacuum-card", theme: "light", width: 460, config: { show_routines: false, show_dock: false, show_consumables: false, show_stats: false },
    clicks: ['[data-action="open_rooms"]', '[data-room="2"]', '[data-room="11"]', '[data-room="9"]'] },
  { file: "card-rooms-dark", type: "vacuum-card", theme: "dark", width: 460, config: { show_routines: false, show_dock: false, show_consumables: false, show_stats: false },
    clicks: ['[data-action="open_rooms"]', '[data-room="2"]', '[data-room="11"]', '[data-room="9"]'] },
  { file: "card-f25", type: "vacuum-card", theme: "light", width: 460, config: { device: "Roborock F25 Ultra" } },
  { file: "card-f25-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Roborock F25 Ultra" } },
  { file: "card-xiaomi", type: "vacuum-card", theme: "light", width: 460, config: { device: "Robot vacuum", show_map: "always", map_entity: "camera.dustbusters_map" } },
  { file: "card-xiaomi-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Robot vacuum", show_map: "always", map_entity: "camera.dustbusters_map" } },
  { file: "mini-card", type: "vacuum-mini-card", theme: "light", width: 380, config: {} },
  { file: "mini-card-dark", type: "vacuum-mini-card", theme: "dark", width: 380, config: {}, overrides: cleaning },
  { file: "mini-card-f25", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Roborock F25 Ultra" } },
  { file: "mini-card-f25-dark", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Roborock F25 Ultra" } },
  { file: "mini-card-xiaomi", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Robot vacuum" } },
  { file: "card-dreame", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Upstairs robot", show_map: "always", collapsed: ["stats"] } },
  { file: "card-dreame-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Upstairs robot", show_map: "always", collapsed: ["stats"] } },
  { file: "mini-card-dreame", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Upstairs robot" } },
  { file: "mini-card-dreame-light", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Upstairs robot" } },
  { file: "mini-card-xiaomi-dark", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Robot vacuum" } },
  { file: "card-ecovacs", type: "vacuum-card", theme: "light", width: 460, config: { device: "Studio robot", show_map: "always", collapsed: ["stats"] } },
  { file: "card-ecovacs-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Studio robot", show_map: "always", collapsed: ["stats"] } },
  { file: "mini-card-ecovacs", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Studio robot" } },
  { file: "mini-card-ecovacs-dark", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Studio robot" } },
  { file: "card-dyson", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Toy room robot" } },
  { file: "card-dyson-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Toy room robot" } },
  { file: "mini-card-dyson", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Toy room robot" } },
  { file: "mini-card-dyson-light", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Toy room robot" } },
  { file: "card-irobot", type: "vacuum-card", theme: "light", width: 460, config: { device: "Workshop robot", collapsed: [] } },
  { file: "card-irobot-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Workshop robot", collapsed: [] } },
  { file: "mini-card-irobot", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Workshop robot" } },
  { file: "mini-card-irobot-dark", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Workshop robot" } },
  { file: "card-braava", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Washroom robot", collapsed: [] } },
  { file: "card-braava-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Washroom robot", collapsed: [] } },
  { file: "mini-card-braava", type: "vacuum-mini-card", theme: "dark", width: 380, config: { device: "Washroom robot" } },
  { file: "mini-card-braava-light", type: "vacuum-mini-card", theme: "light", width: 380, config: { device: "Washroom robot" } },
  { file: "mini-card-zoom", type: "vacuum-mini-card", theme: "light", width: 460, config: {}, clicks: [".zoom"] },
  { file: "mini-card-zoom-dark", type: "vacuum-mini-card", theme: "dark", width: 460, config: {}, overrides: cleaning, clicks: [".zoom"] },
];

// One looping GIF per distinct animated state the card shows (each plays different keyframes):
//   cleaning     — robot out vacuuming and mopping (sway, spin, dust, wet, drop)
//   returning    — robot heading back to the dock (home)
//   mop-washing  — robot docked, washing its mop (bub)
//   mop-drying   — robot docked, drying its mop (heat)
//   f25-cleaning — F25 Ultra wet-dry vacuum mid-clean (tilt, roll)
//   ecovacs-cleaning / -returning / -mop-washing / -mop-drying — DEEBOT X1 Omni: out cleaning, heading home,
//                      its station washing then drying the mops (station_state sensor)
//   dyson-cleaning / dyson-returning — Dyson 360 Vis Nav: tracks rolling and dust / sliding home
//   irobot-cleaning / -returning / -emptying — Roomba j7+: single side brush and dust / sliding in front of its
//                      Clean Base / the base emptying the bin (evac); braava-mopping — Braava jet m6: wet trail and spray
// Each one is followed by its twin in the other theme: "-dark" for a light capture, "-light" for a dark one.
export const gifs = [
  { file: "cleaning", type: "vacuum-card", theme: "light", width: 460, config: {}, overrides: cleaning },
  { file: "cleaning-dark", type: "vacuum-card", theme: "dark", width: 460, config: {}, overrides: cleaning },
  { file: "returning", type: "vacuum-card", theme: "light", width: 460, config: {}, overrides: returning },
  { file: "returning-dark", type: "vacuum-card", theme: "dark", width: 460, config: {}, overrides: returning },
  { file: "mop-washing", type: "vacuum-card", theme: "light", width: 460, config: {}, overrides: washing },
  { file: "mop-washing-dark", type: "vacuum-card", theme: "dark", width: 460, config: {}, overrides: washing },
  { file: "mop-drying", type: "vacuum-card", theme: "light", width: 460, config: {}, overrides: drying },
  { file: "mop-drying-dark", type: "vacuum-card", theme: "dark", width: 460, config: {}, overrides: drying },
  { file: "f25-cleaning", type: "vacuum-card", theme: "light", width: 460, config: { device: "Roborock F25 Ultra" }, overrides: f25Cleaning },
  { file: "f25-cleaning-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Roborock F25 Ultra" }, overrides: f25Cleaning },
  { file: "ecovacs-cleaning", type: "vacuum-card", theme: "light", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsCleaning },
  { file: "ecovacs-cleaning-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsCleaning },
  { file: "ecovacs-returning", type: "vacuum-card", theme: "light", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsReturning },
  { file: "ecovacs-returning-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsReturning },
  { file: "ecovacs-mop-washing", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsWashing },
  { file: "ecovacs-mop-washing-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsWashing },
  { file: "ecovacs-mop-drying", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsDrying },
  { file: "ecovacs-mop-drying-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Studio robot", show_map: "never" }, overrides: ecovacsDrying },
  { file: "dyson-cleaning", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Toy room robot" }, overrides: dysonCleaning },
  { file: "dyson-cleaning-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Toy room robot" }, overrides: dysonCleaning },
  { file: "dyson-returning", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Toy room robot" }, overrides: dysonReturning },
  { file: "dyson-returning-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Toy room robot" }, overrides: dysonReturning },
  { file: "irobot-cleaning", type: "vacuum-card", theme: "light", width: 460, config: { device: "Workshop robot" }, overrides: irobotCleaning },
  { file: "irobot-cleaning-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Workshop robot" }, overrides: irobotCleaning },
  { file: "irobot-returning", type: "vacuum-card", theme: "light", width: 460, config: { device: "Workshop robot" }, overrides: irobotReturning },
  { file: "irobot-returning-dark", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Workshop robot" }, overrides: irobotReturning },
  { file: "irobot-emptying", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Workshop robot" }, overrides: irobotEmptying },
  { file: "irobot-emptying-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Workshop robot" }, overrides: irobotEmptying },
  { file: "braava-mopping", type: "vacuum-card", theme: "dark", width: 460, config: { device: "Washroom robot" }, overrides: braavaMopping },
  { file: "braava-mopping-light", type: "vacuum-card", theme: "light", width: 460, config: { device: "Washroom robot" }, overrides: braavaMopping },
];
