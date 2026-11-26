// Bundles the ES modules of src/ (entry src/index.js) into the single Marketplace file dist/vacuum-card.js with esbuild,
// inlining the integration logos (Roborock, Xiaomi Mi Home, Xiaomi, Dreame, Ecovacs, Dyson, iRobot, SwitchBot) so the card needs no
// extra resource. The bundle is flat (no import/export left): a classic script, as scripts/i18n-split.mjs expects.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "acorn";
import { build } from "esbuild";
import { splitDist } from "./i18n-split.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const dataUri = (file) =>
  `data:${file.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${readFileSync(`${root}images/${file}`).toString("base64")}`;

// src/i18n/strings.js imports one module per language; in the bundle the table must stay a single object literal
// (that is what scripts/i18n-split.mjs splits), so the language files are inlined into it here.
const inlineStrings = {
  name: "inline-strings",
  setup(b) {
    b.onLoad({ filter: /[\\/]src[\\/]i18n[\\/]strings\.js$/ }, ({ path }) => {
      const code = readFileSync(path, "utf8");
      const files = new Map([...code.matchAll(/^import (\w+) from "\.\/([\w-]+\.js)";$/gm)].map((m) => [m[1], m[2]]));
      const literal = (id) => {
        const file = files.get(id);
        if (!file) throw new Error(`src/i18n/strings.js: no import for ${id}`);
        const body = readFileSync(new URL(file, `file://${path}`), "utf8").match(/^export default (\{[\s\S]*\});\s*$/m);
        if (!body) throw new Error(`src/i18n/${file}: expected "export default { … };"`);
        return body[1].replace(/\n/g, "\n  ");
      };
      const table = code.match(/^export const STRINGS = \{\n([\s\S]*?)\n\};$/m);
      if (!table) throw new Error("src/i18n/strings.js: expected `export const STRINGS = { … };`");
      const entries = table[1].split("\n").map((line) => {
        const m = line.match(/^ {2}(?:"([\w-]+)": (\w+)|(\w+)),$/);
        if (!m) throw new Error(`src/i18n/strings.js: unexpected line ${line}`);
        return `  ${m[1] ? JSON.stringify(m[1]) : m[3]}: ${literal(m[2] || m[3])},`;
      });
      return { contents: `export const STRINGS = {\n${entries.join("\n")}\n};\n`, loader: "js" };
    });
  },
};

// The bundled source, placeholders (__VERSION__, __IMG_LOGO_*__) left as they are: what the tests evaluate.
export const bundle = async () => {
  const { outputFiles } = await build({
    entryPoints: [`${root}src/index.js`],
    bundle: true,
    format: "esm",
    charset: "utf8",
    legalComments: "none",
    write: false,
    logLevel: "warning",
    plugins: [inlineStrings],
  });
  const code = outputFiles[0].text;
  // A classic script: Home Assistant may load it as a plain <script>, and i18n-split.mjs relies on it.
  parse(code, { ecmaVersion: "latest", sourceType: "script" });
  return code;
};

const main = async () => {
  const out = (await bundle())
    .replace("__VERSION__", pkg.version)
    .replace("__IMG_LOGO__", dataUri("logo.svg"))
    .replace("__IMG_LOGO_MIHOME__", dataUri("mihome.png"))
    .replace("__IMG_LOGO_XIAOMI__", dataUri("xiaomi.png"))
    .replace("__IMG_LOGO_DREAME__", dataUri("dreame.png"))
    .replace("__IMG_LOGO_ECOVACS__", dataUri("ecovacs.png"))
    .replace("__IMG_LOGO_DYSON__", dataUri("dyson.png"))
    .replace("__IMG_LOGO_IROBOT__", dataUri("irobot.png"))
    .replace("__IMG_LOGO_SWITCHBOT__", dataUri("switchbot.png"));

  const target = `${root}dist/vacuum-card.js`;
  mkdirSync(`${root}dist`, { recursive: true });
  writeFileSync(target, out);
  // Same file under the former name, attached to the releases for manual installs that still load it.
  writeFileSync(`${root}dist/roborock-card.js`, out);
  console.log(`Built dist/vacuum-card.js and dist/roborock-card.js (${(out.length / 1024).toFixed(1)} KB)`);

  // Translations: English stays in the bundle, each other language goes to dist/vacuum-card.i18n.<lang>.js,
  // fetched when a card needs it (scripts/i18n-split.mjs).
  splitDist(`${root}dist`, "vacuum-card.js", { version: pkg.version, aliases: ["roborock-card.js"] });
};

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) await main();
