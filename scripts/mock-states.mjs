// Mock Home Assistant registries and states shaped like the Roborock integration (a Saros 20 with
// its dock and an F25 Ultra) the Xiaomi Miio integration (a Mi Robot Vacuum 1S, and a purifier the cards must skip) and the Dreame Vacuum
// integration (an L10s Ultra), Ecovacs, Dyson and iRobot (a Roomba j7+ and a Braava jet m6), used to render screenshots. Entity ids are in French on purpose
// (the cards never rely on them); the names shown are in English.
export const states = {};
export const entities = {};
export const devices = {};

const device = (id, name, model, identifier, domain = "roborock") =>
  (devices[id] = { id, name, model, identifiers: [[domain, identifier]], name_by_user: null });
const entity = (entity_id, device_id, translation_key, state, attributes = {}, platform = "roborock") => {
  entities[entity_id] = { entity_id, device_id, platform, translation_key: translation_key || null };
  states[entity_id] = { entity_id, state: String(state), attributes };
};
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();

// Floor plan standing in for the map image entity.
const MAP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220">
  <rect width="400" height="220" fill="#1f2a36" rx="12"/>
  <g stroke="#0d141b" stroke-width="3">
    <rect x="20" y="20" width="150" height="110" fill="#4f8fd6"/>
    <rect x="170" y="20" width="110" height="80" fill="#5fb88f"/>
    <rect x="280" y="20" width="100" height="120" fill="#e0a64a"/>
    <rect x="20" y="130" width="90" height="70" fill="#c46a9a"/>
    <rect x="110" y="100" width="170" height="40" fill="#8a96a8"/>
    <rect x="110" y="140" width="120" height="60" fill="#7a73d0"/>
    <rect x="230" y="140" width="150" height="60" fill="#d36b5e"/>
  </g>
  <path d="M40 40h110M40 52h110M40 64h110M40 76h110M40 88h70" stroke="#ffffff" stroke-opacity=".35" stroke-width="6" fill="none"/>
  <circle cx="125" cy="95" r="7" fill="#fff" stroke="#ea0029" stroke-width="3"/>
  <rect x="300" y="125" width="16" height="10" rx="2" fill="#fff"/>
</svg>`;

// Saros 20 + dock
device("saros", "Roborock Saros 20", "roborock.vacuum.a288", "saros");
device("saros_dock", "Roborock Saros 20 Dock", "roborock.vacuum.a288 Dock", "saros_dock");
entity("vacuum.aspirateur", "saros", "roborock", "docked", {
  fan_speed: "turbo",
  fan_speed_list: ["quiet", "balanced", "turbo", "max", "max_plus", "off", "smart_mode", "custom"],
  friendly_name: "Roborock Saros 20",
});
entity("sensor.aspirateur_etat", "saros", "status", "charging");
entity("sensor.aspirateur_batterie", "saros", null, "100", { device_class: "battery", unit_of_measurement: "%" });
entity("sensor.aspirateur_piece_actuelle", "saros", "current_room", "Living room");
entity("sensor.aspirateur_erreur", "saros", "vacuum_error", "none");
entity("sensor.aspirateur_progression", "saros", "clean_percent", "0", { unit_of_measurement: "%" });
entity("sensor.aspirateur_surface", "saros", "cleaning_area", "42.5", { unit_of_measurement: "m²" });
entity("sensor.aspirateur_duree", "saros", "cleaning_time", "38.5", { unit_of_measurement: "min", device_class: "duration" });
entity("sensor.aspirateur_nombre_total", "saros", "total_cleaning_count", "222");
entity("sensor.aspirateur_surface_totale", "saros", "total_cleaning_area", "4087", { unit_of_measurement: "m²" });
entity("sensor.aspirateur_duree_totale", "saros", "total_cleaning_time", "115.48", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.aspirateur_debut", "saros", "last_clean_start", hoursAgo(20.6), { device_class: "timestamp" });
entity("sensor.aspirateur_fin", "saros", "last_clean_end", hoursAgo(20), { device_class: "timestamp" });
entity("sensor.aspirateur_brosse_principale", "saros", "main_brush_time_left", "296.4", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.aspirateur_brosse_laterale", "saros", "side_brush_time_left", "192.0", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.aspirateur_filtre", "saros", "filter_time_left", "146.4", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.aspirateur_capteurs", "saros", "sensor_time_left", "2.5", { unit_of_measurement: "h", device_class: "duration" });
for (const k of ["main_brush", "side_brush", "air_filter", "sensor"])
  entity(`button.aspirateur_reinitialiser_${k}`, "saros", `reset_${k}_consumable`, "unknown");
entity("button.station_reinitialiser_crepine", "saros_dock", "reset_dock_strainer_consumable", "unknown");
entity("binary_sensor.aspirateur_penurie_d_eau", "saros", "water_shortage", "off");
entity("binary_sensor.aspirateur_nettoyage", "saros", "in_cleaning", "off");
entity("select.aspirateur_mode", "saros", "cleaning_mode", "vac_and_mop", { options: ["vacuum", "vac_and_mop", "mop"] });
entity("select.aspirateur_intensite", "saros", "mop_intensity", "moderate");
entity("select.aspirateur_parcours", "saros", "cleaning_route", "deep_plus");
entity("select.aspirateur_carte", "saros", "selected_map", "Apartment");
entity("image.aspirateur_appartement", "saros", null, hoursAgo(1), {
  friendly_name: "Roborock Saros 20 Apartment",
  entity_picture: `data:image/svg+xml;base64,${Buffer.from(MAP).toString("base64")}`,
});
for (const [slug, name] of [
  ["salon", "Living room"],
  ["cuisine", "Kitchen"],
  ["chambres", "Bedrooms"],
  ["tout", "Whole home"],
])
  entity(`button.aspirateur_${slug}`, "saros", null, "unknown", { friendly_name: `Roborock Saros 20 ${name}` });

entity("sensor.station_erreur", "saros_dock", "dock_error", "ok");
entity("binary_sensor.station_eau_propre", "saros_dock", "clean_box_empty", "off");
entity("binary_sensor.station_eau_sale", "saros_dock", "dirty_box_full", "off");
entity("binary_sensor.station_detergent", "saros_dock", "clean_fluid_empty", "off");
entity("select.station_vidage", "saros_dock", "dust_collection_mode", "smart");
entity("sensor.station_sechage", "saros_dock", "mop_drying_remaining_time", "0", { unit_of_measurement: "s", device_class: "duration" });
entity("switch.station_vidage_de_la_poussiere", "saros_dock", "dust_emptying", "off");
entity("switch.station_lavage_de_la_serpilliere", "saros_dock", "mop_washing", "off");
entity("switch.station_sechage_de_la_serpilliere", "saros_dock", "mop_drying", "off");
entity("sensor.station_crepine", "saros_dock", "strainer_time_left", "59", { unit_of_measurement: "h", device_class: "duration" });

// F25 Ultra
device("f25", "Roborock F25 Ultra", "roborock.wdv.a194", "f25");
entity("sensor.balai_etat", "f25", "a01_status", "charging");
entity("sensor.balai_batterie", "f25", null, "87", { device_class: "battery", unit_of_measurement: "%" });
entity("sensor.balai_erreur", "f25", "a01_error", "none");
entity("sensor.balai_filtre", "f25", "filter_time_left", "95.95", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.balai_rouleau", "f25", "brush_remaining", "95.95", { unit_of_measurement: "h", device_class: "duration" });
entity("sensor.balai_duree_totale", "f25", "total_cleaning_time", "0.0", { unit_of_measurement: "h", device_class: "duration" });

// Mi Robot Vacuum 1S (renamed « Robot vacuum ») set up with Xiaomi Miio (translation keys of that integration, durations in hours as HA shows them),
// with its map from a Xiaomi Cloud Map Extractor camera, which belongs to no device.
const miio = (entity_id, translation_key, state, attributes = {}) => entity(entity_id, "q5", translation_key, state, attributes, "xiaomi_miio");
device("q5", "Robot vacuum", "roborock.vacuum.m1s", "q5", "xiaomi_miio");
miio("vacuum.dustbusters", null, "docked", {
  status: "Charging",
  fan_speed: "Standard",
  fan_speed_list: ["Silent", "Standard", "Medium", "Turbo", "Gentle", "Auto"],
  friendly_name: "Robot vacuum",
});
miio("sensor.dustbusters_battery", null, "100", { device_class: "battery", unit_of_measurement: "%" });
miio("sensor.dustbusters_current_clean_duration", "clean_time", "0.6", { unit_of_measurement: "h", device_class: "duration" });
miio("sensor.dustbusters_current_clean_area", "clean_area", "31.5", { unit_of_measurement: "m²" });
miio("sensor.dustbusters_last_clean_duration", "duration", "2160", { unit_of_measurement: "s", device_class: "duration" });
miio("sensor.dustbusters_total_duration", "total_duration", "677.7", { unit_of_measurement: "h", device_class: "duration" });
miio("sensor.dustbusters_total_clean_area", "total_area", "16921.76", { unit_of_measurement: "m²" });
miio("sensor.dustbusters_total_clean_count", "count", "1182");
miio("sensor.dustbusters_last_clean_start", "last_clean_start", hoursAgo(26.6), { device_class: "timestamp" });
miio("sensor.dustbusters_last_clean_end", "last_clean_end", hoursAgo(26), { device_class: "timestamp" });
miio("sensor.dustbusters_main_brush_remaining", "main_brush_left", "212.4", { unit_of_measurement: "h", device_class: "duration" });
miio("sensor.dustbusters_side_brush_remaining", "side_brush_left", "112.4", { unit_of_measurement: "h", device_class: "duration" });
miio("sensor.dustbusters_filter_remaining", "filter_left", "62.4", { unit_of_measurement: "h", device_class: "duration" });
miio("sensor.dustbusters_sensor_dirty_remaining", "sensor_dirty_left", "-6.5", { unit_of_measurement: "h", device_class: "duration" });
for (const k of ["main_brush", "side_brush", "filter", "sensor_dirty"]) miio(`button.dustbusters_reset_${k}`, `reset_vacuum_${k}`, "unknown");
entities["camera.dustbusters_map"] = { entity_id: "camera.dustbusters_map", device_id: null, platform: "xiaomi_cloud_map_extractor", translation_key: null };
states["camera.dustbusters_map"] = {
  entity_id: "camera.dustbusters_map",
  state: "idle",
  attributes: { friendly_name: "DustBusters map", entity_picture: `data:image/svg+xml;base64,${Buffer.from(MAP).toString("base64")}` },
};
device("purifier", "Air purifier", "zhimi.airpurifier.mb4", "purifier", "xiaomi_miio");
entity("sensor.purificateur_filtre", "purifier", "filter_life_remaining", "80", { unit_of_measurement: "%" }, "xiaomi_miio");

// L10s Ultra set up with Dreame Vacuum (translation keys of that integration), with its map camera.
const dreame = (entity_id, translation_key, state, attributes = {}) => entity(entity_id, "l10", translation_key, state, attributes, "dreame_vacuum");
device("l10", "Upstairs robot", "dreame.vacuum.r2228o", "l10", "dreame_vacuum");
dreame("vacuum.etage", null, "docked", {
  fan_speed: "standard",
  fan_speed_list: ["silent", "standard", "strong", "turbo"],
  friendly_name: "Upstairs robot",
});
dreame("sensor.etage_statut", "status", "charging");
dreame("sensor.etage_batterie", "battery_level", "96", { device_class: "battery", unit_of_measurement: "%" });
dreame("sensor.etage_erreur", "error", "no_error");
dreame("sensor.etage_piece", "current_room", "Office");
dreame("sensor.etage_duree", "cleaning_time", "42", { unit_of_measurement: "min", device_class: "duration" });
dreame("sensor.etage_surface", "cleaned_area", "36", { unit_of_measurement: "m²" });
dreame("sensor.etage_nombre", "cleaning_count", "318");
dreame("sensor.etage_surface_totale", "total_cleaned_area", "9120", { unit_of_measurement: "m²" });
dreame("sensor.etage_duree_totale", "total_cleaning_time", "14520", { unit_of_measurement: "min", device_class: "duration" });
dreame("sensor.etage_brosse_principale", "main_brush_time_left", "251", { unit_of_measurement: "h", device_class: "duration" });
dreame("sensor.etage_brosse_laterale", "side_brush_time_left", "143", { unit_of_measurement: "h", device_class: "duration" });
dreame("sensor.etage_filtre", "filter_time_left", "88", { unit_of_measurement: "h", device_class: "duration" });
dreame("sensor.etage_capteurs", "sensor_dirty_time_left", "21", { unit_of_measurement: "h", device_class: "duration" });
dreame("sensor.etage_serpilliere", "mop_pad_time_left", "64", { unit_of_measurement: "h", device_class: "duration" });
for (const k of ["main_brush", "side_brush", "filter", "sensor"]) dreame(`button.etage_reset_${k}`, `reset_${k}`, "unknown");
dreame("camera.etage_carte", "map", "idle", {
  friendly_name: "Upstairs robot map",
  entity_picture: `data:image/svg+xml;base64,${Buffer.from(MAP).toString("base64")}`,
});

// DEEBOT X1 Omni set up with Ecovacs (translation keys of that integration, percentage consumables).
const eco = (entity_id, translation_key, state, attributes = {}) => entity(entity_id, "x1", translation_key, state, attributes, "ecovacs");
device("x1", "Studio robot", "DEEBOT X1 OMNI", "x1", "ecovacs");
eco("vacuum.studio", "vacuum", "docked", { fan_speed: "normal", fan_speed_list: ["quiet", "normal", "max", "max+"], friendly_name: "Studio robot" });
eco("sensor.studio_batterie", null, "82", { device_class: "battery", unit_of_measurement: "%" });
eco("sensor.studio_erreur", "error", "0", { description: "NoError: Robot is operational" });
eco("sensor.studio_surface", "stats_area", "48", { unit_of_measurement: "m²" });
eco("sensor.studio_duree", "stats_time", "52", { unit_of_measurement: "min", device_class: "duration" });
eco("sensor.studio_surface_totale", "total_stats_area", "6240", { unit_of_measurement: "m²" });
eco("sensor.studio_duree_totale", "total_stats_time", "412", { unit_of_measurement: "h", device_class: "duration" });
eco("sensor.studio_nombre", "total_stats_cleanings", "187");
eco("sensor.studio_brosse", "lifespan_brush", "71", { unit_of_measurement: "%" });
eco("sensor.studio_brosse_laterale", "lifespan_side_brush", "54", { unit_of_measurement: "%" });
eco("sensor.studio_filtre", "lifespan_filter", "38", { unit_of_measurement: "%" });
eco("sensor.studio_serpilliere", "lifespan_round_mop", "8", { unit_of_measurement: "%" });
for (const k of ["brush", "side_brush", "filter", "round_mop"]) eco(`button.studio_reset_${k}`, `reset_lifespan_${k}`, "unknown");
eco("select.studio_mode", "work_mode", "vacuum_and_mop", { options: ["vacuum", "mop", "vacuum_and_mop", "mop_after_vacuum"] });
eco("select.studio_eau", "water_amount", "high", { options: ["low", "medium", "high", "ultrahigh"] });
eco("sensor.studio_station", "station_state", "idle", { device_class: "enum", options: ["idle", "emptying_dustbin", "washing_mop", "drying_mop"] });
eco("image.studio_carte", "map", hoursAgo(2), { entity_picture: `data:image/svg+xml;base64,${Buffer.from(MAP).toString("base64")}` });

// 360 Vis Nav set up with Dyson (dyson_local): a vacuum entity only, battery as an attribute.
device("visnav", "Toy room robot", "277", "visnav", "dyson_local");
entity("vacuum.salle_de_jeux", "visnav", null, "docked", {
  battery_level: 100,
  status: "Inactive, charged",
  fan_speed: "Auto",
  fan_speed_list: ["Auto", "Quick", "Quiet", "Boost"],
  // START | PAUSE | RETURN_HOME | FAN_SPEED | BATTERY | STATUS | STATE, as ha-dyson reports it: no Stop, no Locate.
  supported_features: 12532,
  friendly_name: "Toy room robot",
}, "dyson_local");

// Roomba j7+ (SKU j755020) renamed « Workshop robot » and Braava jet m6 (m611020) renamed « Washroom robot », set up
// with the iRobot integration (roomba): battery sensor without translation_key, mission statistics, bin full sensor,
// status and current clean as attributes of the vacuum.
const roomba = (entity_id, device_id, translation_key, state, attributes = {}) => entity(entity_id, device_id, translation_key, state, attributes, "roomba");
device("j7", "Workshop robot", "j755020", "roomba_j7", "roomba");
roomba("vacuum.couloir", "j7", null, "docked", { status: "Charging", software_version: "lewis+22.52.10", friendly_name: "Workshop robot" });
roomba("sensor.couloir_batterie", "j7", null, "100", { device_class: "battery", unit_of_measurement: "%" });
roomba("sensor.couloir_duree_totale", "j7", "total_cleaning_time", "86", { unit_of_measurement: "h", device_class: "duration" });
roomba("sensor.couloir_duree_moyenne", "j7", "average_mission_time", "41", { unit_of_measurement: "min", device_class: "duration" });
roomba("sensor.couloir_missions", "j7", "total_missions", "164", { unit_of_measurement: "Missions" });
roomba("sensor.couloir_missions_reussies", "j7", "successful_missions", "152", { unit_of_measurement: "Missions" });
roomba("sensor.couloir_surface_totale", "j7", "total_cleaned_area", "5310", { unit_of_measurement: "m²" });
roomba("sensor.couloir_derniere_mission", "j7", "last_mission", hoursAgo(9), { device_class: "timestamp" });
roomba("sensor.couloir_cycles_batterie", "j7", "battery_cycles", "212");
roomba("binary_sensor.couloir_bac_plein", "j7", "bin_full", "off");
roomba("binary_sensor.couloir_en_charge", "j7", null, "on", { device_class: "battery_charging" });
device("m6", "Washroom robot", "m611020", "roomba_m6", "roomba");
roomba("vacuum.salle_de_bain", "m6", null, "docked", {
  status: "Charging",
  fan_speed: "Standard",
  fan_speed_list: ["Standard", "Deep", "Extended"],
  detected_pad: "reusableWet",
  tank_level: 80,
  friendly_name: "Washroom robot",
});
roomba("sensor.salle_de_bain_batterie", "m6", null, "92", { device_class: "battery", unit_of_measurement: "%" });
roomba("sensor.salle_de_bain_reservoir", "m6", "tank_level", "80", { unit_of_measurement: "%" });
roomba("sensor.salle_de_bain_duree_totale", "m6", "total_cleaning_time", "31", { unit_of_measurement: "h", device_class: "duration" });
roomba("sensor.salle_de_bain_missions", "m6", "total_missions", "58", { unit_of_measurement: "Missions" });
roomba("sensor.salle_de_bain_derniere_mission", "m6", "last_mission", hoursAgo(30), { device_class: "timestamp" });

// SwitchBot K10+ Pro renamed « Study robot », set up with the SwitchBot integration over Bluetooth (switchbot): the vacuum
// (translation_key "vacuum", Start / Return home only) and a battery sensor without translation_key. SwitchBot S10
// renamed « Sitting room robot », set up with SwitchBot Cloud (switchbot_cloud): a vacuum without translation_key, with its
// four suction levels. Both names sort after « Roborock Saros 20 »: the cards without `device` show the first robot by
// name, which must stay the Roborock of the default captures.
device("k10", "Study robot", "K10+ Pro Vacuum", "aa:bb:cc:dd:ee:10", "switchbot");
entity("vacuum.bureau", "k10", "vacuum", "docked", { supported_features: 12304, friendly_name: "Study robot" }, "switchbot");
entity("sensor.bureau_batterie", "k10", null, "100", { device_class: "battery", unit_of_measurement: "%" }, "switchbot");
entity("sensor.bureau_signal", "k10", "bluetooth_signal", "-62", { device_class: "signal_strength", unit_of_measurement: "dBm" }, "switchbot");
device("s10", "Sitting room robot", "Robot Vacuum Cleaner S10", "S10-6C1F", "switchbot_cloud");
entity("vacuum.salon_s10", "s10", null, "docked", {
  fan_speed: "standard",
  fan_speed_list: ["quiet", "standard", "strong", "max"],
  supported_features: 12340,
  friendly_name: "Sitting room robot",
}, "switchbot_cloud");

// Same robot while it is cleaning (vacuum + mop), with the mop drying in the dock and the dirty water tank
// full. Picture activity: "vacmop" — the robot sways, its side brushes spin and dust and water trail behind.
export const cleaning = {
  "vacuum.aspirateur": { state: "cleaning" },
  "sensor.aspirateur_etat": { state: "segment_cleaning" },
  "sensor.aspirateur_batterie": { state: "64" },
  "sensor.aspirateur_piece_actuelle": { state: "Kitchen" },
  "sensor.aspirateur_progression": { state: "45" },
  "sensor.aspirateur_surface": { state: "18.2" },
  "sensor.aspirateur_duree": { state: "16" },
  "binary_sensor.station_eau_sale": { state: "on" },
  "switch.station_sechage_de_la_serpilliere": { state: "on" },
  "sensor.station_sechage": { state: "4800" },
  "sensor.station_erreur": { state: "waste_water_tank_full" },
};

// The robot on its way back to the dock, the dock idle. Picture activity: "returning" — the robot slides in
// from the left and settles in front of the dock.
export const returning = {
  "vacuum.aspirateur": { state: "returning" },
  "sensor.aspirateur_etat": { state: "returning_home" },
  "sensor.aspirateur_batterie": { state: "34" },
  "sensor.aspirateur_piece_actuelle": { state: "Hallway" },
  "sensor.aspirateur_progression": { state: "100" },
};

// The robot docked, self-cleaning (washing) its mop. Picture activity: "washing" — blue bubbles rise at the dock.
export const washing = {
  "vacuum.aspirateur": { state: "docked" },
  "sensor.aspirateur_etat": { state: "washing_the_mop" },
  "sensor.aspirateur_batterie": { state: "78" },
  "switch.station_lavage_de_la_serpilliere": { state: "on" },
};

// The robot docked with its mop drying. Picture activity: "drying" — orange heat waves rise at the dock.
export const drying = {
  "vacuum.aspirateur": { state: "docked" },
  "sensor.aspirateur_etat": { state: "drying" },
  "sensor.aspirateur_batterie": { state: "92" },
  "switch.station_sechage_de_la_serpilliere": { state: "on" },
  "sensor.station_sechage": { state: "3600" },
};

// The F25 Ultra wet-dry vacuum mid-clean. Picture activity: "vacuum" — the body rocks (tilt) and the floor
// roller turns (roll); those two keyframes only ever play for a wet-dry vacuum.
export const f25Cleaning = {
  "sensor.balai_etat": { state: "cleaning" },
  "sensor.balai_batterie": { state: "54" },
};

// The DEEBOT X1 Omni vacuuming and mopping. Picture activity: "vacmop" — out of its station, white.
export const ecovacsCleaning = {
  "vacuum.studio": { state: "cleaning" },
  "sensor.studio_batterie": { state: "61" },
};

// The DEEBOT X1 Omni heading back to its station. Picture activity: "returning" (home).
export const ecovacsReturning = { "vacuum.studio": { state: "returning" }, "sensor.studio_batterie": { state: "23" } };

// The DEEBOT X1 Omni docked, its station washing then drying the mops. Picture activities: "washing" (bub), "drying" (heat).
export const ecovacsWashing = { "sensor.studio_station": { state: "washing_mop" } };
export const ecovacsDrying = { "sensor.studio_station": { state: "drying_mop" } };

// The Dyson 360 Vis Nav vacuuming. Picture activity: "vacuum" — the drum sways, its tracks roll (roll) and dust
// is sucked in.
export const dysonCleaning = { "vacuum.salle_de_jeux": { state: "cleaning" } };

// The Dyson 360 Vis Nav heading home. Picture activity: "returning" — it slides in from the side (home).
export const dysonReturning = { "vacuum.salle_de_jeux": { state: "returning" } };

// The Roomba j7+ vacuuming: the current clean comes from the vacuum's attributes. Picture activity: "vacuum" —
// out on the floor, its single side brush spinning, dust trailing behind.
export const irobotCleaning = {
  "vacuum.couloir": { state: "cleaning", attributes: { status: "Running", cleaning_time: 23, cleaned_area: 19, friendly_name: "Workshop robot" } },
  "sensor.couloir_batterie": { state: "71" },
  "binary_sensor.couloir_en_charge": { state: "off" },
};

// The Roomba j7+ heading back to its Clean Base. Picture activity: "returning" (home).
export const irobotReturning = {
  "vacuum.couloir": { state: "returning", attributes: { status: "Docking - End Mission", friendly_name: "Workshop robot" } },
  "sensor.couloir_batterie": { state: "38" },
  "binary_sensor.couloir_en_charge": { state: "off" },
};

// The Clean Base emptying the j7+'s bin (status "Emptying Bin", the vacuum "returning"). Picture activity: "emptying" —
// dust rises up the base's duct (evac).
export const irobotEmptying = {
  "vacuum.couloir": { state: "returning", attributes: { status: "Emptying Bin", friendly_name: "Workshop robot" } },
  "sensor.couloir_batterie": { state: "39" },
};

// The Braava jet m6 mopping. Picture activity: "mop" — a wet trail and spray drops in front of it.
export const braavaMopping = {
  "vacuum.salle_de_bain": { state: "cleaning", attributes: { ...states["vacuum.salle_de_bain"].attributes, status: "Running", cleaning_time: 14, cleaned_area: 9 } },
  "sensor.salle_de_bain_batterie": { state: "64" },
  "sensor.salle_de_bain_reservoir": { state: "45" },
};

// The SwitchBot K10+ Pro vacuuming. Picture activity: "vacuum" — the mini robot out on the floor, its side brush
// spinning, dust trailing behind.
export const switchbotCleaning = { "vacuum.bureau": { state: "cleaning" }, "sensor.bureau_batterie": { state: "68" } };

// The SwitchBot K10+ Pro heading back to its auto-empty tower. Picture activity: "returning" (home).
export const switchbotReturning = { "vacuum.bureau": { state: "returning" }, "sensor.bureau_batterie": { state: "35" } };

// The SwitchBot S10 vacuuming (SwitchBot Cloud starts a vacuum-only clean). Picture activity: "vacuum" — side brush and
// dust, its roller mop still.
export const switchbotS10Cleaning = { "vacuum.salon_s10": { state: "cleaning" } };

// Response of the roborock.get_maps service, used by the room selector.
export const maps = {
  "vacuum.aspirateur": {
    maps: [
      {
        flag: 0,
        name: "Apartment",
        rooms: { 1: "Guest room", 2: "Living room", 3: "Kids' room", 4: "Hallway", 5: "Entrance", 6: "Main bedroom", 7: "Bathroom", 8: "Toilet", 9: "Dining room", 11: "Kitchen" },
      },
    ],
  },
};
