// Consumables: [translation_key, label, icon, lifetime in hours for the robot ("pct" when the sensor is a percentage),
//               translation_key of the integration's reset button]
import { DREAME_DOCK_KEYS, KEY_MAPS, PLATFORMS } from "./integrations.js";
import { ICONS } from "./icons.js";
import { STRINGS } from "./i18n/strings.js";

export const CONSUMABLES = [
  ["main_brush_time_left", "main_brush", ICONS.brush, 300, "reset_main_brush_consumable"],
  ["side_brush_time_left", "side_brush", ICONS.brush, 200, "reset_side_brush_consumable"],
  ["filter_time_left", "filter", ICONS.filter, 150, "reset_air_filter_consumable"],
  ["sensor_time_left", "sensors", ICONS.sensor, 30, "reset_sensor_consumable"],
  ["mop_life_time_left", "mop", ICONS.water, null],
  ["brush_remaining", "roller", ICONS.brush, null],
  ["main_brush_life", "main_brush", ICONS.brush, "pct", "reset_main_brush_consumable"],
  ["side_brush_life", "side_brush", ICONS.brush, "pct", "reset_side_brush_consumable"],
  ["filter_life", "filter", ICONS.filter, "pct", "reset_air_filter_consumable"],
  ["sensor_life", "sensors", ICONS.sensor, "pct", "reset_sensor_consumable"],
  ["mop_life", "mop", ICONS.water, "pct", "reset_mop_consumable"],
  ["strainer_time_left", "strainer", ICONS.filter, null, "reset_dock_strainer_consumable"],
  ["cleaning_brush_time_left", "cleaning_brush", ICONS.brush, null, "reset_dock_cleaning_brush_consumable"],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const lang = (hass, config) => {
  const l = (config?.language) || (hass && (hass.locale?.language || hass.language)) || "en";
  return STRINGS[l] ? l : STRINGS[l.split("-")[0]] ? l.split("-")[0] : "en";
};

// Locale for Intl / toLocale*: the card's language: option, else HA's full locale (keeps its region, e.g.
// pt-BR, de-CH) when its base matches the resolved card language, else that language. A bare "pt" (HA's
// code for European Portuguese) becomes "pt-PT", otherwise Intl formats it the Brazilian way.
export const intlLocale = (hass, config) => {
  const l = lang(hass, config);
  const src = config?.language || (hass && (hass.locale?.language || hass.language)) || "";
  const out = src && src.split("-")[0] === l.split("-")[0] ? src : l;
  return out === "pt" ? "pt-PT" : out;
};

export const t = (hass, config, key, vars = {}) =>
  String(STRINGS[lang(hass, config)][key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export const num = (s) => {
  if (!s) return null;
  const v = parseFloat(s.state);
  return Number.isFinite(v) ? v : null;
};

export const valid = (s) => s && !["unknown", "unavailable", ""].includes(s.state);

export const pretty = (v) => {
  const s = String(v ?? "").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Duration sensor → hours, whatever its unit.
export const hours = (s) => {
  const v = num(s);
  if (v === null) return null;
  const u = s.attributes?.unit_of_measurement;
  return u === "min" ? v / 60 : u === "s" ? v / 3600 : u === "d" ? v * 24 : v;
};

// Unit of an area sensor as Home Assistant sends it (ft² when chosen in the entity settings), m² by default.
export const areaUnitOf = (s) => {
  const u = s?.attributes?.unit_of_measurement;
  return typeof u === "string" && u.trim() ? u : "m²";
};

// Duration in hours, written with the units of the language ("2 h 30 min", "2 Std. 30 Min.", "2 hr 30 min").
// Rounded to the minute first, so that 1.995 h reads "2 h" (not "1 h 60") and 0.999 h "1 h" (not "60 min").
export const UNIT_FMT = {};
export const fmtUnit = (v, unit, locale) => (UNIT_FMT[`${locale}|${unit}`] ??= new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" })).format(v);
export const fmtHours = (h, locale) => {
  if (h === null || h === undefined) return "—";
  if (h <= 0) return fmtUnit(0, "hour", locale);
  const total = Math.round(h * 60);
  if (total < 60) return fmtUnit(Math.max(1, total), "minute", locale);
  if (total < 600) {
    const m = total % 60;
    const H = fmtUnit(Math.floor(total / 60), "hour", locale);
    return m ? `${H} ${fmtUnit(m, "minute", locale)}` : H;
  }
  return fmtUnit(Math.round(h), "hour", locale);
};

export const fmtNum = (v, digits = 0, locale) => (v === null ? "—" : Number(v).toLocaleString(locale, { maximumFractionDigits: digits }));

// One formatter per language, built on first use.
export const RTF = {};
export const ago = (hass, config, iso) => {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return null;
  const diff = (d - Date.now()) / 1000;
  const l = intlLocale(hass, config);
  const rtf = (RTF[l] ??= new Intl.RelativeTimeFormat(l, { numeric: "auto" }));
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
};

// Robot / device status → color class.
export const statusClass = (state) => {
  const s = String(state || "").toLowerCase();
  if (/error|problem|offline|locked|fail|unavailable/.test(s)) return "crit";
  if (/paused|waiting|updating|starting|unknown/.test(s)) return "warn";
  if (/clean|mop|sweep|washing|mapping|target|return|docking|emptying|drying|dusting|patrol|ventilating/.test(s)) return "active";
  if (/charg|docked|ready/.test(s)) return "ok";
  return "idle";
};

// Water tank level in percent → color class (empty at 10 %, low at 25 %).
export const tankClass = (pct) => (pct <= 10 ? "crit" : pct <= 25 ? "warn" : "ok");

export const svgIcon = (path, cls = "") => `<svg class="icon ${cls}" viewBox="0 0 24 24"><path d="${path}"/></svg>`;

// ---------------------------------------------------------------------------
// Registry-based resolution
// ---------------------------------------------------------------------------

export const _cache = new WeakMap();

/**
 * Build the Roborock model from hass.entities / hass.devices:
 * { devices: [{ id, name, kind, entities, extra: { sensor: [...], button: [...], image: [...] } }] }
 * Entities are keyed by translation_key ("_<domain>" when they have none). Dock entities live on a
 * separate "<name> Dock" device and are merged into their robot under the "dock" map.
 */
// Dreame Vacuum station tiles: [key, icon, label], and the class of a state (null: not shown). Installed / idle
// read "OK"; a missing or full tank, a missing dust bag are critical; low water or detergent, a bag to check warn.
export const DREAME_DOCK_TILES = [
  ["auto_empty_status", ICONS.bin, "dust_mode"],
  ["clean_water_tank_status", ICONS.water, "clean_water"],
  ["dirty_water_tank_status", ICONS.water_off, "dirty_water"],
  ["dust_bag_status", ICONS.bin, "dust_bag"],
  ["detergent_status", ICONS.fluid, "cleaning_fluid"],
];
export const dreameDockClass = (key, state) => {
  if (state === undefined || state === "unknown" || state === "unavailable" || state === "not_available") return null;
  if (key === "auto_empty_status") return { idle: "ok", not_performed: "warn" }[state] ?? "active";
  if (key === "detergent_status" && state === "disabled") return null;
  if (state === "installed") return "ok";
  return { low_water: "warn", low_detergent: "warn", check: "warn" }[state] ?? "crit";
};

// Dreame Vacuum station entities, taken out of the robot's entities.
const dreameDock = (entities) => {
  const dock = {};
  for (const k of DREAME_DOCK_KEYS)
    if (k in entities) {
      dock[k] = entities[k];
      delete entities[k];
    }
  return dock;
};

export const resolve = (hass) => {
  if (!hass.entities || !hass.devices) return null;
  const cached = _cache.get(hass.entities);
  if (cached && cached.devices === hass.devices) return cached.model;

  const byDevice = new Map();
  for (const e of Object.values(hass.entities)) {
    if (!(e.platform in PLATFORMS) || !e.device_id || e.hidden) continue;
    const domain = e.entity_id.split(".")[0];
    const item = byDevice.get(e.device_id) || { platform: e.platform, entities: {}, extra: {} };
    let key = KEY_MAPS[e.platform]?.[e.translation_key] || e.translation_key;
    if (e.platform === "dreame_vacuum" && domain === "button" && DREAME_DOCK_KEYS.includes(`${key}_button`)) key = `${key}_button`;
    if (key && key !== "map") {
      if (!(key in item.entities)) item.entities[key] = e.entity_id;
    } else {
      (item.extra[domain] = item.extra[domain] || []).push(e.entity_id);
      if (!(`_${domain}` in item.entities)) item.entities[`_${domain}`] = e.entity_id;
    }
    byDevice.set(e.device_id, item);
  }

  const devName = (d) => d.name_by_user || d.name || "";
  const isDock = (d) => /\sDock$/.test(d.model || "") || (d.identifiers || []).some((i) => /_dock$/.test(String(i[1])));
  const devices = [];
  const docks = [];
  for (const [id, item] of byDevice) {
    const d = hass.devices[id];
    if (!d) continue;
    const vacuum = item.entities.roborock || item.entities._vacuum;
    // The Xiaomi integrations cover every Xiaomi device (purifiers, lamps…): only their vacuums are kept.
    // Neither are Dreame devices without a vacuum (lawn mowers…).
    if (item.platform !== "roborock" && !vacuum) continue;
    if (item.platform === "roborock" && isDock(d)) docks.push({ d, item });
    else {
      const kind = vacuum?.startsWith("vacuum.") ? "robot" : /\.(wdv|wetdryvac)\./.test(d.model || "") ? "wetdry" : "other";
      // Vacuums only: no washing machine (Roborock Zeo), fan, purifier or air conditioner.
      if (kind === "other") continue;
      devices.push({
        id,
        name: devName(d),
        rawName: d.name,
        model: d.model,
        platform: item.platform,
        kind,
        vacuum,
        entities: item.entities,
        extra: item.extra,
        dock: item.platform === "dreame_vacuum" ? dreameDock(item.entities) : {},
      });
    }
  }
  for (const { d, item } of docks) {
    const ids = (d.identifiers || []).map((i) => String(i[1]).replace(/_dock$/, ""));
    const owner =
      devices.find((r) => (hass.devices[r.id].identifiers || []).some((i) => ids.includes(String(i[1])))) ||
      devices.find((r) => d.name === `${r.rawName} Dock`) ||
      devices.find((r) => d.model === `${r.model} Dock`);
    if (owner) owner.dock = item.entities;
  }
  const model = { devices: devices.sort((a, b) => a.name.localeCompare(b.name)) };
  _cache.set(hass.entities, { devices: hass.devices, model });
  return model;
};

// Map pictures of a device: the integration's map images (Roborock) or cameras (Dreame Vacuum), or the camera /
// image entity set with map_entity (Xiaomi Cloud Map Extractor, Valetudo…), which belongs to no device.
// Same dependency list (same length, same objects): what a memoized value was built from has not changed.
export const sameDeps = (a, b) => !!a && a.length === b.length && a.every((d, i) => d === b[i]);
export const mapIds = (dev, config) => (config?.map_entity ? [config.map_entity] : [...(dev.extra.image || []), ...(dev.extra.camera || [])]);

// Vacuum Map (https://github.com/juju35/ha-vacuum-map): its integration loads the vacuum-map-card element on every
// dashboard. A Roborock robot then gets that live vector map (rooms, path, robot) instead of the map picture, unless
// map_entity is set or vector_map is false. Its own options go in vector_map_options (view, rotation, rooms…).
export const VECTOR_MAP = "vacuum-map-card";
export const vectorMapOn = (dev, config) =>
  dev.platform === "roborock" && !config.map_entity && config.vector_map !== false && !!customElements.get?.(VECTOR_MAP);

export const listDevices = (hass) => {
  const m = hass && resolve(hass);
  return m ? m.devices.map((d) => ({ value: d.id, label: d.name })) : [];
};

export const findDevice = (hass, config) => {
  const m = resolve(hass);
  if (!m) return { error: "no_registry" };
  if (!m.devices.length) return { error: "no_device" };
  if (!config.device) return { dev: m.devices.find((d) => d.kind === "robot") || m.devices[0] };
  const dev = m.devices.find((d) => d.id === config.device || d.name === config.device);
  return dev ? { dev } : { error: "unknown_device" };
};
