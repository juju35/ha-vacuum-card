// Brands: the brand of the model (brandOf), else the one of the integration (PLATFORMS) gives the logo of the
// header and the accent color of the buttons, from the logo: [light theme, dark theme]. The light-theme shades are
// darker so that the tinted buttons keep at least the contrast of the Roborock red (≈ 3.5:1) on a white card;
// the dark-theme ones are the logo colors.
import { IMG_LOGO, IMG_LOGO_DREAME, IMG_LOGO_DYSON, IMG_LOGO_ECOVACS, IMG_LOGO_IROBOT, IMG_LOGO_MIHOME, IMG_LOGO_SWITCHBOT, IMG_LOGO_XIAOMI } from "./constants.js";
import { brandOf } from "./models.js";

export const BRANDS = {
  roborock: { logo: IMG_LOGO, name: "Roborock", site: "https://www.roborock.com", accent: ["#ea0029", "#ea0029"] },
  mihome: { logo: IMG_LOGO_MIHOME, name: "Xiaomi Mi Home", site: "https://home.mi.com", accent: ["#2a7f57", "#43b17e"] },
  xiaomi: { logo: IMG_LOGO_XIAOMI, name: "Xiaomi", site: "https://www.mi.com", accent: ["#c24c00", "#ff6900"] },
  dreame: { logo: IMG_LOGO_DREAME, name: "Dreame", site: "https://www.dreametech.com", accent: ["#8a6a3c", "#c9a46e"] },
  ecovacs: { logo: IMG_LOGO_ECOVACS, name: "Ecovacs", site: "https://www.ecovacs.com", accent: ["#0b6bc4", "#3d9be9"] },
  dyson: { logo: IMG_LOGO_DYSON, name: "Dyson", site: "https://www.dyson.com", accent: ["#4a4a4a", "#b8b8b8"] },
  irobot: { logo: IMG_LOGO_IROBOT, name: "iRobot", site: "https://www.irobot.com", accent: ["#4a8209", "#64a70b"] },
  switchbot: { logo: IMG_LOGO_SWITCHBOT, name: "SwitchBot", site: "https://www.switch-bot.com", accent: ["#b8292b", "#e5484d"] },
};
export const brandFor = (dev) => BRANDS[brandOf(dev.model)] || BRANDS[PLATFORMS[dev.platform]] || BRANDS.roborock;
// Accent of the device's brand for the current theme, overriding the default red of the shared styles.
export const accentStyle = (dev, hass) => `:host { --vc-accent: ${brandFor(dev).accent[hass?.themes?.darkMode ? 1 : 0]}; }`;
// Integrations the cards read → their logo.
export const PLATFORMS = {
  roborock: "roborock",
  xiaomi_miio: "mihome",
  xiaomi_home: "xiaomi",
  dreame_vacuum: "dreame",
  ecovacs: "ecovacs",
  dyson_local: "dyson",
  roomba: "irobot",
  braava_240_ble: "irobot",
  switchbot: "switchbot",
  switchbot_cloud: "switchbot",
};
// Xiaomi Miio translation_key → the Roborock integration's, so the cards read both the same way.
// Their last clean "duration" / "area" are left aside: "clean_time" / "clean_area" hold the current
// clean while the robot works and the last one afterwards, like the Roborock cleaning_time / cleaning_area.
export const MIIO_KEYS = {
  clean_time: "cleaning_time",
  clean_area: "cleaning_area",
  total_duration: "total_cleaning_time",
  total_area: "total_cleaning_area",
  count: "total_cleaning_count",
  main_brush_left: "main_brush_time_left",
  side_brush_left: "side_brush_time_left",
  filter_left: "filter_time_left",
  sensor_dirty_left: "sensor_time_left",
  reset_vacuum_main_brush: "reset_main_brush_consumable",
  reset_vacuum_side_brush: "reset_side_brush_consumable",
  reset_vacuum_filter: "reset_air_filter_consumable",
  reset_vacuum_sensor_dirty: "reset_sensor_consumable",
};
// Dreame Vacuum translation_key → the Roborock integration's.
export const DREAME_KEYS = {
  dreame_vacuum: "_vacuum",
  battery_level: "battery",
  cleaned_area: "cleaning_area",
  cleaning_progress: "clean_percent",
  cleaning_count: "total_cleaning_count",
  total_cleaned_area: "total_cleaning_area",
  sensor_dirty_time_left: "sensor_time_left",
  mop_pad_time_left: "mop_life_time_left",
  error: "dreame_error",
  reset_main_brush: "reset_main_brush_consumable",
  reset_side_brush: "reset_side_brush_consumable",
  reset_filter: "reset_air_filter_consumable",
  reset_sensor: "reset_sensor_consumable",
};
// Ecovacs translation_key → the Roborock integration's. Its consumables are percentages (lifespan_*).
export const ECOVACS_KEYS = {
  vacuum: "_vacuum",
  stats_area: "cleaning_area",
  stats_time: "cleaning_time",
  total_stats_area: "total_cleaning_area",
  total_stats_time: "total_cleaning_time",
  total_stats_cleanings: "total_cleaning_count",
  lifespan_brush: "main_brush_life",
  lifespan_side_brush: "side_brush_life",
  lifespan_filter: "filter_life",
  lifespan_round_mop: "mop_life",
  reset_lifespan_brush: "reset_main_brush_consumable",
  reset_lifespan_side_brush: "reset_side_brush_consumable",
  reset_lifespan_filter: "reset_air_filter_consumable",
  reset_lifespan_round_mop: "reset_mop_consumable",
  error: "ecovacs_error",
  water_amount: "mop_intensity",
  work_mode: "cleaning_mode",
  station_state: "ecovacs_station",
};
// iRobot (roomba) translation_key → the Roborock integration's. Its battery sensor has no translation_key (found by
// its device class); the current clean is in the attributes of the vacuum.
export const ROOMBA_KEYS = {
  total_missions: "total_cleaning_count",
  total_cleaned_area: "total_cleaning_area",
  last_mission: "last_clean_start",
};
// iRobot Braava 240 (braava_240_ble, over Bluetooth) translation_key → the Roborock integration's. Its battery,
// cleaning_mode and total_cleaning_time keys are already the card's; the cleaning binary sensor tells a job is running.
// Its own pad_type sensor, wetness_* selects (one per pad kind) and mission counters keep their keys.
// braava_240_ble 0.4.1+ gives the vacuum entity a translation key ("braava") to translate its attributes.
export const BRAAVA_240_KEYS = { braava: "_vacuum", total_missions: "total_cleaning_count", cleaning: "in_cleaning" };
// SwitchBot (switchbot, over Bluetooth) translation_key → the card's: its vacuum has the "vacuum" key; its battery
// sensor has none (found by its device class). SwitchBot Cloud gives its vacuum no key.
export const SWITCHBOT_KEYS = { vacuum: "_vacuum" };
export const KEY_MAPS = { xiaomi_miio: MIIO_KEYS, dreame_vacuum: DREAME_KEYS, ecovacs: ECOVACS_KEYS, roomba: ROOMBA_KEYS, braava_240_ble: BRAAVA_240_KEYS, switchbot: SWITCHBOT_KEYS };
export const PENDING_MS = 45000;
export const DEFAULT_COLLAPSED = ["stats", "dock"];
