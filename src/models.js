// Commercial names of the common Roborock models, by the model id the integrations report (Roborock, Xiaomi Miio
// and Xiaomi Home alike): the picture and the logo then follow the model even when the device was renamed
// (« DustBusters »). Sources: python-roborock (const.py, device_info.yaml), python-miio, the tested vacuums of
// python-roborock's local server and the Mijia list of Tasshack/dreame-vacuum (Xiaomi Home).
import { IROBOT_SKUS, SWITCHBOT_MODELS, dysonSvg, isSwitchbotModel, irobotName, robotSvg, roombaSvg, switchbotPicture, wetdrySvg } from "./illustrations.js";
import { PLATFORMS } from "./integrations.js";

export const MODEL_NAMES = {
  "rockrobo.vacuum.v1": "Mi Robot Vacuum",
  "roborock.vacuum.m1s": "Mi Robot Vacuum 1S",
  "mijia.vacuum.v1": "Mi Robot Vacuum-Mop Essential",
  "mijia.vacuum.v2": "Mi Robot Vacuum-Mop Essential G1",
  "dreame.vacuum.mc1808": "Mi Robot Vacuum-Mop 1C",
  "viomi.vacuum.v7": "Mi Robot Vacuum-Mop P",
  "viomi.vacuum.v8": "Mi Robot Vacuum-Mop P",
  "dreame.vacuum.p2150o": "Mi Robot Vacuum-Mop",
  "dreame.vacuum.p2140o": "Mi Robot Vacuum-Mop 2",
  "dreame.vacuum.p2140p": "Mi Robot Vacuum-Mop 2",
  "dreame.vacuum.p2140q": "Mi Robot Vacuum-Mop 2",
  "ijai.vacuum.v3": "Mi Robot Vacuum-Mop 2 Pro",
  "dreame.vacuum.p2041o": "Mi Robot Vacuum-Mop 2 Pro+",
  "dreame.vacuum.p2150a": "Mi Robot Vacuum-Mop 2 Ultra",
  "dreame.vacuum.p2150b": "Mi Robot Vacuum-Mop 2 Ultra Set",
  "dreame.vacuum.p2148o": "Mi Robot Vacuum-Mop Ultra Slim",
  "dreame.vacuum.r2209": "Mi Robot Vacuum X10",
  "dreame.vacuum.p2114a": "Mi Robot Vacuum X10+",
  "xiaomi.vacuum.c102gl": "Mi Robot Vacuum X20+",
  "dreame.vacuum.r2211o": "Robot Vacuum S10+",
  "dreame.vacuum.r2254": "Mijia 1S",
  "dreame.vacuum.p2041": "Mijia 1T",
  "dreame.vacuum.p2140": "Mijia 2C",
  "dreame.vacuum.p2140a": "Mijia 2C",
  "dreame.vacuum.r2210": "Mijia Cleaning and Mopping Robot 2 Pro",
  "dreame.vacuum.p2114o": "Mijia Self-Cleaning Robot Vacuum-Mop",
  "dreame.vacuum.p2149o": "Mijia Self-Cleaning Robot Vacuum-Mop Pro",
  "xiaomi.vacuum.d110ch": "Mijia M40",
  "xiaomi.vacuum.c102cn": "Mijia Omni 2",
  "xiaomi.vacuum.d103cn": "Mijia Omni M30S",
  "roborock.vacuum.c1": "C1",
  "roborock.vacuum.e2": "E2",
  "roborock.vacuum.a01": "E4",
  "roborock.vacuum.s4": "S4",
  "roborock.vacuum.a19": "S4 Max",
  "roborock.vacuum.s5": "S5",
  "roborock.vacuum.s5e": "S5 Max",
  "roborock.vacuum.s6": "S6",
  "roborock.vacuum.t6": "T6",
  "roborock.vacuum.a08": "S6 Pure",
  "roborock.vacuum.a10": "S6 MaxV",
  "roborock.vacuum.a11": "T7",
  "roborock.vacuum.a14": "T7S",
  "roborock.vacuum.a23": "T7S Plus",
  "roborock.vacuum.a15": "S7",
  "roborock.vacuum.a27": "S7 MaxV",
  "roborock.vacuum.a62": "S7 Pro Ultra",
  "roborock.vacuum.a65": "S7 MaxV Ultra",
  "roborock.vacuum.a51": "S8",
  "roborock.vacuum.a70": "S8 Pro Ultra",
  "roborock.vacuum.a97": "S8 MaxV Ultra",
  "roborock.vacuum.a29": "G10",
  "roborock.vacuum.a30": "G10",
  "roborock.vacuum.a46": "G10S",
  "roborock.vacuum.a26": "G10S Pro",
  "roborock.vacuum.a34": "Q5",
  "roborock.vacuum.a72": "Q5 Pro",
  "roborock.vacuum.a125": "Q5 Max+",
  "roborock.vacuum.a40": "Q7",
  "roborock.vacuum.a38": "Q7 Max",
  "roborock.vacuum.a73": "Q8 Max",
  "roborock.vacuum.sc01": "Q7 Series",
  "roborock.vacuum.sc05": "Q7 Series",
  "roborock.vacuum.ss07": "Q10",
  "roborock.vacuum.a75": "Qrevo",
  "roborock.vacuum.a87": "Qrevo MaxV",
  "roborock.vacuum.a101": "Qrevo Pro",
  "roborock.vacuum.a104": "Qrevo S",
  "roborock.vacuum.a117": "Qrevo Master",
  "roborock.vacuum.a135": "Qrevo Curv",
  "roborock.vacuum.a123": "Qrevo Plus",
  "roborock.vacuum.a170": "Qrevo C",
  "roborock.vacuum.a187": "Qrevo Edge",
  "roborock.vacuum.a245": "Qrevo Curv 2 Flow",
  "roborock.vacuum.a294": "Qrevo 2 Pro",
  "roborock.vacuum.a298": "Qrevo Edge 2",
  "roborock.vacuum.a326": "Qrevo S Pro",
  "roborock.vacuum.a168": "QV 35A",
  "roborock.vacuum.a306": "P30 Pro",
  "roborock.vacuum.a146": "G30",
  "roborock.vacuum.a143": "Saros 10R",
  "roborock.vacuum.a144": "Saros 10R",
  "roborock.vacuum.a147": "Saros 10",
  "roborock.vacuum.a288": "Saros 20",
  "roborock.vacuum.a279": "Saros 20 Sonic",
  "roborock.vacuum.a307": "Saros 20 Flow",
  "roborock.wetdryvac.a56": "Dyad Pro",
  "roborock.wetdryvac.a83": "Dyad Pro Combo",
  "roborock.wetdryvac.a107": "Dyad Air",
  "roborock.wdv.a194": "F25 Ultra",
  "roborock.wetdryvac.a01": "Dyad",
  "dreame.vacuum.p2008": "F9",
  "dreame.vacuum.p2009": "D9",
  "dreame.vacuum.p2028": "Z10 Pro",
  "dreame.vacuum.p2029": "L10 Pro",
  "dreame.vacuum.r2205": "D10 Plus",
  "dreame.vacuum.r2228o": "L10s Ultra",
  // Ecovacs: the integration reports the commercial name (deviceName) as the model.
  "deebot n8": "DEEBOT N8",
  "deebot n8 pro": "DEEBOT N8 Pro",
  "deebot n8 pro+": "DEEBOT N8 Pro+",
  "deebot ozmo 920": "DEEBOT OZMO 920",
  "deebot ozmo 950": "DEEBOT OZMO 950",
  "deebot ozmo t8": "DEEBOT OZMO T8",
  "deebot t8 aivi": "DEEBOT T8 AIVI",
  "deebot t8+": "DEEBOT T8+",
  "deebot t9": "DEEBOT T9",
  "deebot t9+": "DEEBOT T9+",
  "deebot t10 omni": "DEEBOT T10 Omni",
  "deebot t20 omni": "DEEBOT T20 Omni",
  "deebot t30 omni": "DEEBOT T30 Omni",
  "deebot x1 omni": "DEEBOT X1 Omni",
  "deebot x1 turbo": "DEEBOT X1 Turbo",
  "deebot x2 omni": "DEEBOT X2 Omni",
  "deebot x5 pro omni": "DEEBOT X5 Pro Omni",
  // Dyson: the integration reports the product type as the model.
  n223: "360 Eye",
  276: "360 Heurist",
  277: "360 Vis Nav",
  // iRobot: the SKU as the model.
  ...Object.fromEntries(IROBOT_SKUS.map((sku) => [sku, irobotName(sku)])),
  // SwitchBot: the Bluetooth model name or the Cloud device type, in lower case.
  ...SWITCHBOT_MODELS,
};
// Brand of a model id, for the logo: Xiaomi for the Mi / Xiaomi robots (built by Roborock for the first ones),
// Roborock for the other Roborock models, null when unknown (the logo of the integration is shown).
export const XIAOMI_MODELS = new Set(["rockrobo.vacuum.v1", "roborock.vacuum.m1s"]);
export const DYSON_MODELS = new Set(["n223", "276", "277"]);
export const brandOf = (model) => {
  const m = String(model || "").toLowerCase();
  // Dreame and Viomi build some of the Mi / Xiaomi / Mijia robots: their names in the table tell them apart.
  if (XIAOMI_MODELS.has(m) || /^(xiaomi|mijia|ijai)\./.test(m) || (/^(dreame|viomi)\./.test(m) && /^(mi |mijia|robot vacuum)/i.test(MODEL_NAMES[m] || ""))) return "xiaomi";
  if (/^(roborock|rockrobo)\./.test(m)) return "roborock";
  if (/^(deebot|ecovacs)\b/.test(m)) return "ecovacs";
  if (DYSON_MODELS.has(m)) return "dyson";
  if (irobotName(m)) return "irobot";
  if (isSwitchbotModel(m)) return "switchbot";
  return /^dreame\./.test(m) ? "dreame" : null;
};
// Label of the brand of a model, for the editor presets.
// Commercial name of a SwitchBot model, or "" when the model is not one of the table.
export const switchbotName = (dev) => {
  const m = String(dev.model || "").toLowerCase();
  return Object.hasOwn(SWITCHBOT_MODELS, m) ? SWITCHBOT_MODELS[m] : "";
};
// Brand of a model id of the tables (model list, presets): brandOf, plus the short SwitchBot Cloud types it leaves to
// the platform (« K10+ », « S20 »…).
export const modelBrand = (id) => brandOf(id) || (Object.hasOwn(SWITCHBOT_MODELS, String(id).toLowerCase()) ? "switchbot" : null);
export const BRAND_LABELS = { roborock: "Roborock", xiaomi: "Xiaomi", dreame: "Dreame", ecovacs: "Ecovacs", dyson: "Dyson", irobot: "iRobot", switchbot: "SwitchBot" };
// Model presets of the `image` option (the model id as value), one per commercial name, by brand then name.
export const MODEL_PRESETS = Object.entries(MODEL_NAMES)
  .filter(([, name], i, all) => all.findIndex(([, n]) => n === name) === i)
  .map(([value, name]) => ({ value, label: `${BRAND_LABELS[modelBrand(value)] || "Roborock"} ${name}` }))
  .sort((a, b) => a.label.localeCompare(b.label, "en", { numeric: true }));
// Device of a model preset, drawn like an automatic picture (without the dock the integration reports).
export const presetDevice = (model) => ({ kind: /\.(wdv|wetdryvac)\./.test(model) ? "wetdry" : "robot", model, dock: {} });
// Name the picture is drawn from: the device name and the commercial name of its model.
export const modelName = (dev) => {
  const m = String(dev.model || "").toLowerCase();
  return [dev.rawName || dev.name, MODEL_NAMES[m] || irobotName(m)].filter(Boolean).join(" ");
};
// Automatic picture: Saros robots, the E / C1 series and the Mi Essential / 1C have no LiDAR turret, the Q series
// (Q5…Q10, Qrevo), the Mi / Xiaomi and the Dreame robots are white, the dock is drawn when the integration reports one (or the
// model name implies it: Ultra, Plus / +, Saros, Qrevo, Omni, Self-Cleaning, G10 / G30); Dyad wet-dry vacuums are dark.
export const autoSvg = (dev, activity = null, white = undefined) => {
  const name = modelName(dev);
  if (dev.kind === "wetdry") return wetdrySvg({ white: white ?? !/dyad/i.test(name), activity });
  if (dev.kind !== "robot") return null;
  if (brandOf(dev.model) === "dyson" || dev.platform === "dyson_local") return dysonSvg({ visnav: /vis nav/i.test(name), white, activity });
  if (brandOf(dev.model) === "irobot" || PLATFORMS[dev.platform] === "irobot") {
    // braava_240_ble only sets up the Braava 240, whatever its device name.
    const b240 = dev.platform === "braava_240_ble";
    const braava = b240 || /braava|\bm6\b/i.test(name);
    return roombaSvg({
      shape: braava ? "square" : /\bs9/i.test(name) ? "d" : "round",
      camera: /\bj\d/i.test(name),
      silver: white === undefined && /\b97[46]\b/.test(name),
      white: white ?? braava,
      base: /\+|clean base/i.test(name),
      combo: /combo/i.test(name),
      small: b240 || (braava && /\b240\b/.test(name)),
      activity,
    });
  }
  if (brandOf(dev.model) === "switchbot" || PLATFORMS[dev.platform] === "switchbot") return switchbotPicture(switchbotName(dev) || name, activity);
  return robotSvg({
    turret: !/saros|essential|\b(e\d|c1|1c)\b/i.test(name),
    white: white ?? (/\bq\s?(revo|\d)|\bmi robot/i.test(name) || ["xiaomi", "dreame", "ecovacs"].includes(brandOf(dev.model))),
    dock: Object.keys(dev.dock || {}).length > 0 || /ultra|plus|\+|saros|q\s?revo|omni|self-cleaning|\bg\d\d/i.test(name),
    activity,
  });
};
// What the device is doing, for the picture animation, from its status, cleaning mode and the dock drying
// flag (null: at rest).
export const activityOf = (status, mode, drying) => {
  const s = String(status || "").toLowerCase();
  if (/dry/.test(s)) return "drying";
  if (/going_to_wash|return|docking/.test(s)) return "returning";
  if (/wash|self_clean/.test(s)) return "washing";
  if (/mopping/.test(s)) return "mop";
  // The dock drying flag only counts while the robot is not out cleaning.
  if (!/clean|sweep|dusting|mapping|target|working/.test(s)) return drying ? "drying" : null;
  const m = String(mode || "").toLowerCase();
  if (/vac|sweep/.test(m) && /mop/.test(m)) return "vacmop";
  return /mop/.test(m) ? "mop" : "vacuum";
};
// Kind of device for the header icon: wet-dry vacuum, mopping robot (a mop, a water tank or mop washing in the
// dock, or a Braava / Combo / m6), else robot vacuum.
export const MOP_KEYS = ["mop_life", "mop_life_time_left", "mop_intensity", "water_flow", "tank_level"];
export const deviceTypeOf = (dev) => {
  if (dev.kind === "wetdry") return "wet_dry";
  if (MOP_KEYS.some((k) => dev.entities?.[k]) || Object.keys(dev.dock || {}).some((k) => /mop/.test(k))) return "robot_mop";
  const name = modelName(dev);
  // SwitchBot: the roller-mop S10 / S20 / S30 mop, the K10+ Pro "Combo" is a robot vacuum with a handheld vacuum — from the
  // commercial name, the device name only for an unknown model (a renamed robot keeps its type).
  if (PLATFORMS[dev.platform] === "switchbot" || brandOf(dev.model) === "switchbot") return /\bs[123]0\b/i.test(switchbotName(dev) || name) ? "robot_mop" : "robot_vacuum";
  return dev.platform === "braava_240_ble" || /braava|combo|\bm6\b/i.test(name) ? "robot_mop" : "robot_vacuum";
};
export const svgUri = (svg) => svg && `data:image/svg+xml,${encodeURIComponent(svg)}`;
