// Renders the galleries of drawn device pictures shown in the README, one per brand, from the card's own
// drawing code (images/models-<brand>.svg), and the README list of recognized models, from the card's model table
// (between the <!-- models:start --> and <!-- models:end --> markers).
// Usage: node scripts/models.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { load } from "../test/load.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { autoSvg, brandOf, BRAND_LABELS, MODEL_NAMES } = load();

// [model id, label] per brand: a robot of each look (turret or not, dock or not, white or dark) and the wet-dry vacuums.
const GALLERIES = {
  roborock: [
    ["roborock.vacuum.a288", "Saros 20"],
    ["roborock.vacuum.a97", "S8 MaxV Ultra"],
    ["roborock.vacuum.a135", "Qrevo Curv"],
    ["roborock.vacuum.a38", "Q7 Max"],
    ["roborock.vacuum.a01", "E4"],
    ["roborock.wdv.a194", "F25 Ultra"],
    ["roborock.wetdryvac.a56", "Dyad Pro"],
  ],
  xiaomi: [
    ["rockrobo.vacuum.v1", "Mi Robot Vacuum"],
    ["roborock.vacuum.m1s", "Mi Robot Vacuum 1S"],
    ["mijia.vacuum.v2", "Essential G1"],
    ["dreame.vacuum.p2041o", "Vacuum-Mop 2 Pro+"],
    ["dreame.vacuum.p2114a", "X10+"],
    ["xiaomi.vacuum.c102cn", "Mijia Omni 2"],
  ],
  dreame: [
    ["dreame.vacuum.p2009", "D9"],
    ["dreame.vacuum.p2029", "L10 Pro"],
    ["dreame.vacuum.r2205", "D10 Plus"],
    ["dreame.vacuum.r2228o", "L10s Ultra"],
  ],
  ecovacs: [
    ["deebot n8", "DEEBOT N8"],
    ["deebot t8 aivi", "DEEBOT T8 AIVI"],
    ["deebot t9+", "DEEBOT T9+"],
    ["deebot x1 omni", "DEEBOT X1 Omni"],
    ["deebot t30 omni", "DEEBOT T30 Omni"],
  ],
  dyson: [
    ["n223", "360 Eye"],
    ["276", "360 Heurist"],
    ["277", "360 Vis Nav"],
  ],
  irobot: [
    ["r976020", "Roomba 976"],
    ["r980020", "Roomba 980"],
    ["e515020", "Roomba e5"],
    ["i755020", "Roomba i7+"],
    ["s955020", "Roomba s9+"],
    ["j755020", "Roomba j7+"],
    ["c975020", "Combo j9+"],
    ["m611020", "Braava jet m6"],
  ],
};

const CELL = 140;
const PIC = 90;
for (const [brand, models] of Object.entries(GALLERIES)) {
  const cells = models.map(([model, label], i) => {
    const kind = /\.(wdv|wetdryvac)\./.test(model) ? "wetdry" : "robot";
    // Nested pictures share one document: their ids (gradient "d") get a per-picture suffix.
    const svg = autoSvg({ kind, model, dock: {} })
      .replace(/id="(\w+)"/g, `id="$1${i}"`)
      .replace(/url\(#(\w+)\)/g, `url(#$1${i})`)
      .replace("<svg ", `<svg x="${i * CELL + (CELL - PIC) / 2}" y="0" width="${PIC}" height="${PIC}" `);
    return `${svg}<text x="${i * CELL + CELL / 2}" y="${PIC + 22}" text-anchor="middle">${label}</text>`;
  });
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${models.length * CELL} ${PIC + 30}"><style>text{font:12px -apple-system,Segoe UI,Roboto,sans-serif;fill:#8b949e}</style>${cells.join("")}</svg>\n`;
  writeFileSync(`${root}images/models-${brand}.svg`, out);
  console.log(`images/models-${brand}.svg`);
}

// README list: one row per commercial name with every model id it is reported as, by brand (the brand order of the
// galleries), then by name.
const rows = {};
for (const [id, name] of Object.entries(MODEL_NAMES)) {
  const brand = brandOf(id) || "roborock";
  const list = (rows[brand] ||= new Map());
  list.set(name, [...(list.get(name) || []), id]);
}
const sections = Object.keys(GALLERIES).map((brand) => {
  const list = [...rows[brand]].sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }));
  const lines = list.map(([name, ids]) => `| ${name} | ${ids.map((id) => `\`${id}\``).join(", ")} |`);
  return `<details><summary>${BRAND_LABELS[brand]} (${list.length})</summary>\n\n| Model | Model id |\n|---|---|\n${lines.join("\n")}\n\n</details>`;
});
const readme = readFileSync(`${root}README.md`, "utf8");
const marked = /<!-- models:start -->[\s\S]*<!-- models:end -->/;
if (!marked.test(readme)) throw new Error("README.md: models markers not found");
writeFileSync(`${root}README.md`, readme.replace(marked, `<!-- models:start -->\n${sections.join("\n\n")}\n<!-- models:end -->`));
console.log("README.md (models list)");
