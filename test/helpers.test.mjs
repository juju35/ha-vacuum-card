import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { load } from "./load.mjs";

const vc = load();

test("fmtHours carries rounded minutes over to the hours", () => {
  assert.equal(vc.fmtHours(1.995), "2 h");
  assert.equal(vc.fmtHours(9.996), "10 h");
  assert.equal(vc.fmtHours(0.999), "1 h");
  assert.equal(vc.fmtHours(0.9999), "1 h");
});

test("fmtHours keeps its other formats", () => {
  assert.equal(vc.fmtHours(null), "—");
  assert.equal(vc.fmtHours(0), "0 h");
  assert.equal(vc.fmtHours(0.001), "1 min");
  assert.equal(vc.fmtHours(0.5), "30 min");
  assert.equal(vc.fmtHours(1), "1 h");
  assert.equal(vc.fmtHours(2.5), "2 h 30");
  assert.equal(vc.fmtHours(1.05), "1 h 03");
  assert.equal(vc.fmtHours(12.4), "12 h");
});

test("hours converts duration units", () => {
  const s = (state, unit) => ({ state, attributes: { unit_of_measurement: unit } });
  assert.equal(vc.hours(s("90", "min")), 1.5);
  assert.equal(vc.hours(s("7200", "s")), 2);
  assert.equal(vc.hours(s("1", "d")), 24);
  assert.equal(vc.hours(s("3", "h")), 3);
  assert.equal(vc.hours(s("unknown", "h")), null);
});

test("statusClass maps states to colors", () => {
  assert.equal(vc.statusClass("error"), "crit");
  assert.equal(vc.statusClass("paused"), "warn");
  assert.equal(vc.statusClass("segment_cleaning"), "active");
  assert.equal(vc.statusClass("charging"), "ok");
  assert.equal(vc.statusClass("idle"), "idle");
});

test("esc escapes text and attribute values", () => {
  assert.equal(vc.esc(`<b title="x">'&`), "&lt;b title=&quot;x&quot;&gt;&#39;&amp;");
});

test("resolve merges the dock into its robot", () => {
  const model = vc.resolve({ entities, devices, states });
  const saros = model.devices.find((d) => d.id === "saros");
  assert.equal(saros.vacuum, "vacuum.aspirateur");
  assert.ok(Object.keys(saros.dock).length > 0);
  assert.ok(!model.devices.some((d) => d.id === "saros_dock"));
});

test("the device picture follows the model, the image option overrides it", () => {
  const { autoSvg, IMAGES, robotSvg, wetdrySvg } = vc;
  const robot = (name, dock = {}) => autoSvg({ kind: "robot", rawName: name, dock });
  assert.equal(robot("Roborock Saros 20"), robotSvg({ turret: false }));
  assert.equal(robot("Roborock S8 MaxV Ultra"), robotSvg());
  assert.equal(robot("Roborock Qrevo Curv"), robotSvg({ white: true }));
  assert.equal(robot("Roborock Q7 Max"), robotSvg({ white: true, dock: false }));
  assert.equal(robot("Roborock S6", { dock_error: "sensor.x" }), robotSvg()); // dock reported by the integration
  assert.equal(robot("Roborock S5 Max"), robotSvg({ dock: false }));
  assert.equal(autoSvg({ kind: "wetdry", rawName: "Roborock F25 Ultra" }), wetdrySvg());
  assert.equal(autoSvg({ kind: "wetdry", rawName: "Roborock Dyad Pro" }), wetdrySvg({ white: false }));
  assert.equal(autoSvg({ kind: "other", rawName: "Roborock Saros 20 Dock" }), null);
  assert.equal(IMAGES.f25_ultra(), wetdrySvg());
  // Renamed devices: the model id gives the commercial name.
  const byModel = (model, kind = "robot") => autoSvg({ kind, rawName: "DustBusters", model });
  assert.equal(byModel("roborock.vacuum.a72"), robotSvg({ white: true, dock: false })); // Q5 Pro
  assert.equal(byModel("roborock.vacuum.a147"), robotSvg({ turret: false })); // Saros 10
  assert.equal(byModel("roborock.vacuum.a65"), robotSvg()); // S7 MaxV Ultra
  assert.equal(byModel("roborock.vacuum.a26"), robotSvg()); // G10S Pro, with its dock
  assert.equal(byModel("roborock.vacuum.a01"), robotSvg({ turret: false, dock: false })); // E4, no LiDAR
  assert.equal(byModel("roborock.vacuum.m1s"), robotSvg({ white: true, dock: false })); // Mi Robot Vacuum 1S
  assert.equal(byModel("xiaomi.vacuum.b108gl"), robotSvg({ white: true, dock: false })); // Xiaomi brand
  assert.equal(byModel("roborock.wetdryvac.a56", "wetdry"), wetdrySvg({ white: false })); // Dyad Pro
  assert.equal(byModel("roborock.vacuum.zz99"), robotSvg({ dock: false })); // unknown model
  // color option: forces white (true) or dark (false) on the automatic picture and the presets.
  assert.equal(autoSvg({ kind: "wetdry", rawName: "Roborock F25 Ultra" }, null, false), wetdrySvg({ white: false }));
  assert.equal(autoSvg({ kind: "robot", rawName: "Roborock Qrevo Curv" }, null, false), robotSvg());
  assert.equal(autoSvg({ kind: "robot", rawName: "Roborock S8 MaxV Ultra" }, null, true), robotSvg({ white: true }));
  assert.equal(IMAGES.f25_ultra(null, false), wetdrySvg({ white: false }));
  assert.equal(IMAGES.saros_20(null, undefined), robotSvg({ turret: false }));
  // Xiaomi models
  assert.equal(byModel("dreame.vacuum.mc1808"), robotSvg({ turret: false, white: true, dock: false })); // Mi 1C
  assert.equal(byModel("mijia.vacuum.v2"), robotSvg({ turret: false, white: true, dock: false })); // Essential G1
  assert.equal(byModel("dreame.vacuum.p2041o"), robotSvg({ white: true })); // Mop 2 Pro+, with its dock
  assert.equal(vc.brandOf("viomi.vacuum.v8"), "xiaomi");
  assert.equal(vc.brandOf("dreame.vacuum.p2009"), "dreame");
  assert.equal(vc.brandOf("viomi.vacuum.v99"), null);
  assert.equal(vc.brandOf("dreame.vacuum.p2114a"), "xiaomi"); // Mi Robot Vacuum X10+
  assert.equal(byModel("dreame.vacuum.p2114a"), robotSvg({ white: true })); // with its station
  assert.equal(byModel("xiaomi.vacuum.c102cn"), robotSvg({ white: true })); // Mijia Omni 2
  assert.equal(byModel("roborock.vacuum.a187"), robotSvg({ white: true })); // Qrevo Edge
  // Dyson 360: its own drawing (drum on tracks, 360° camera), Vis Nav wider with a purple band.
  assert.equal(byModel("n223"), vc.dysonSvg()); // 360 Eye
  assert.equal(byModel("277"), vc.dysonSvg({ visnav: true })); // 360 Vis Nav
  assert.match(vc.dysonSvg({ activity: "vacuum" }), /class="roll"/);
  assert.match(vc.dysonSvg({ activity: "returning" }), /class="home"/);
  assert.doesNotMatch(vc.dysonSvg(), /<style>/);
  // One editor preset per commercial name, labelled with the brand.
  const labels = vc.MODEL_PRESETS.map((p) => p.label);
  assert.equal(new Set(labels).size, labels.length);
  assert.ok(labels.includes("Roborock Q5 Pro") && labels.includes("Xiaomi Mi Robot Vacuum 1S") && labels.includes("Roborock F25 Ultra"));
});

test("the picture animation follows the status, the cleaning mode and the dock drying", () => {
  const { activityOf, robotSvg } = vc;
  assert.equal(activityOf("segment_cleaning", "vacuum"), "vacuum");
  assert.equal(activityOf("cleaning", "vac_and_mop"), "vacmop");
  assert.equal(activityOf("zoned_cleaning", "mop"), "mop");
  assert.equal(activityOf("mopping", "vac_and_mop"), "mop");
  assert.equal(activityOf("cleaning", undefined), "vacuum");
  assert.equal(activityOf("returning_home"), "returning");
  assert.equal(activityOf("going_to_wash_the_mop"), "returning");
  assert.equal(activityOf("washing_the_mop"), "washing");
  assert.equal(activityOf("drying"), "drying");
  assert.equal(activityOf("charging", "vacuum", true), "drying");
  assert.equal(activityOf("cleaning", "vacuum", true), "vacuum"); // out cleaning: the dock flag does not count
  assert.equal(activityOf("charging", "vacuum"), null);
  assert.doesNotMatch(robotSvg(), /<style>/); // at rest: no animation
  assert.match(robotSvg({ activity: "vacuum" }), /class="spin"/);
  assert.match(robotSvg({ activity: "mop" }), /class="drop/);
  assert.match(robotSvg({ activity: "returning" }), /class="home"/);
  assert.match(robotSvg({ activity: "washing" }), /class="bub/);
  assert.match(robotSvg({ activity: "drying" }), /class="heat/);
});

const LANGS = ["fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl"];

test("every language has exactly the English keys and placeholders, and no empty value", () => {
  const en = Object.keys(vc.STRINGS.en).sort();
  const vars = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
  assert.deepEqual(Object.keys(vc.STRINGS).sort(), ["en", ...LANGS].sort());
  for (const l of ["en", ...LANGS]) {
    assert.ok(vc.STRINGS[l], `missing language ${l}`);
    assert.deepEqual(Object.keys(vc.STRINGS[l]).sort(), en, `keys of ${l}`);
    for (const k of en) {
      assert.equal(typeof vc.STRINGS[l][k], "string", `type of ${l}.${k}`);
      assert.ok(vc.STRINGS[l][k].trim(), `empty ${l}.${k}`);
      assert.equal(vars(vc.STRINGS[l][k]), vars(vc.STRINGS.en[k]), `placeholders of ${l}.${k}`);
    }
  }
});

test("Serbian: the Cyrillic and Latin blocks keep to their script", () => {
  // Brand names, Home Assistant, units and placeholders stay in Latin letters in the Cyrillic block.
  const latin = (s) => String(s).replace(/\{\w+\}|Home Assistant|Roborock|Xiaomi Cloud Map Extractor|Xiaomi|Dreame|Ecovacs|Dyson|iRobot|SmartPlan|px/g, "");
  for (const [k, v] of Object.entries(vc.STRINGS.sr)) assert.doesNotMatch(latin(v), /[A-Za-z]/, `Latin letter in sr.${k}`);
  for (const [k, v] of Object.entries(vc.STRINGS["sr-Latn"])) assert.doesNotMatch(v, /[\u0400-\u04FF]/, `Cyrillic letter in sr-Latn.${k}`);
});

test("the language: full code if translated, else the part before the dash, else English", () => {
  const hass = (language) => ({ language });
  assert.equal(vc.lang(hass("fr-FR")), "fr");
  assert.equal(vc.lang(hass("de-CH")), "de");
  assert.equal(vc.lang(hass("sr-Latn")), "sr-Latn");
  assert.equal(vc.lang(hass("sr")), "sr");
  assert.equal(vc.lang(hass("it-IT")), "it");
  assert.equal(vc.lang(hass("nl-BE")), "nl");
  assert.equal(vc.lang(hass("pt")), "pt");
  assert.equal(vc.lang(hass("pt-BR")), "pt"); // assumed fallback to European Portuguese
  assert.equal(vc.lang(hass("pl-PL")), "pl");
  assert.equal(vc.lang(hass("ja")), "en");
  assert.equal(vc.lang({ language: "en", locale: { language: "sr-Latn" } }), "sr-Latn");
  assert.equal(vc.lang(hass("fr"), { language: "sr-Latn" }), "sr-Latn");
  assert.equal(vc.lang(undefined, undefined), "en");
});

test("iRobot: the SKU gives the model name and the brand, the picture follows the model", () => {
  const { irobotName, brandOf, autoSvg, roombaSvg } = vc;
  assert.equal(irobotName("R980020"), "Roomba 980");
  assert.equal(irobotName("i755840"), "Roomba i7+"); // American SKU
  assert.equal(irobotName("i715020"), "Roomba i7");
  assert.equal(irobotName("s955020"), "Roomba s9+");
  assert.equal(irobotName("j755020"), "Roomba j7+");
  assert.equal(irobotName("c975020"), "Roomba Combo j9+");
  assert.equal(irobotName("e515020"), "Roomba e5");
  assert.equal(irobotName("m613820"), "Braava jet m6");
  assert.equal(irobotName("roborock.vacuum.a72"), null);
  assert.equal(irobotName("n223"), null);
  assert.equal(brandOf("j755020"), "irobot");
  assert.equal(brandOf("277"), "dyson");
  const byModel = (model, platform) => autoSvg({ kind: "robot", rawName: "Robot", model, platform, dock: {} });
  assert.equal(byModel("r980020"), roombaSvg());
  assert.equal(byModel("i755020"), roombaSvg({ base: true }));
  assert.equal(byModel("s955840"), roombaSvg({ shape: "d", base: true }));
  assert.equal(byModel("j715020"), roombaSvg({ camera: true }));
  assert.equal(byModel("c755020"), roombaSvg({ camera: true, base: true, combo: true }));
  assert.equal(byModel("m611020"), roombaSvg({ shape: "square", white: true }));
  assert.equal(byModel(null, "roomba"), roombaSvg()); // no SKU reported: the integration still gives a Roomba
  assert.equal(autoSvg({ kind: "robot", rawName: "Robot", model: "m611020", dock: {} }, null, false), roombaSvg({ shape: "square" }));
  // Animations: side brush and dust, Braava mopping, Combo both, returning to and emptying at the Clean Base.
  assert.doesNotMatch(roombaSvg({ base: true }), /<style>/);
  assert.match(roombaSvg({ activity: "vacuum" }), /class="spin"/);
  assert.doesNotMatch(roombaSvg({ shape: "square", activity: "vacuum" }), /class="(spin|dust)/);
  assert.match(roombaSvg({ shape: "square", activity: "vacuum" }), /class="drop/);
  assert.match(roombaSvg({ combo: true, activity: "vacuum" }), /class="drop[\s\S]*|class="dust/);
  assert.match(roombaSvg({ base: true, activity: "returning" }), /class="home"/);
  assert.match(roombaSvg({ base: true, activity: "emptying" }), /class="evac/);
  // Every recognized SKU is an editor preset labelled iRobot.
  const labels = vc.MODEL_PRESETS.map((p) => p.label);
  assert.ok(labels.includes("iRobot Roomba j7+") && labels.includes("iRobot Braava jet m6") && labels.includes("iRobot Roomba Combo j9+"));
});

test("the README lists every recognized model (node scripts/models.mjs keeps it in sync)", async () => {
  const { readFileSync } = await import("node:fs");
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const list = readme.slice(readme.indexOf("<!-- models:start -->"), readme.indexOf("<!-- models:end -->"));
  for (const id of Object.keys(vc.MODEL_NAMES)) assert.ok(list.includes(`\`${id}\``), `${id} missing from the README model list`);
});

test("every translation key is read somewhere in the code (no orphan key)", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/vacuum-card.js", import.meta.url), "utf8");
  // The code outside the STRINGS table: keys are always written as string literals there (also the
  // ones looked up through a variable, which come from tables of literals).
  const start = src.indexOf("const STRINGS = {");
  const end = src.indexOf("\n};", start);
  const code = src.slice(0, start) + src.slice(end);
  // Keys built from a prefix (`color_${v}` over ["auto", "white", "dark"]): prefix + quoted suffix.
  const prefixes = [...code.matchAll(/`(\w+_)\$\{/g)].map((m) => m[1]);
  // Keys looked up from an entity state by _fmt(state, "s_") are state values of the integrations: not checked.
  const statePrefixes = [...code.matchAll(/_fmt\([^,()]*, "(\w+_)"/g)].map((m) => m[1]);
  assert.ok(statePrefixes.includes("s_"));
  const read = (k) =>
    statePrefixes.some((p) => k.startsWith(p)) || code.includes(`"${k}"`) || prefixes.some((p) => k.startsWith(p) && code.includes(`"${k.slice(p.length)}"`));
  for (const k of Object.keys(vc.STRINGS.en)) assert.ok(read(k), `orphan translation key ${k}`);
});
