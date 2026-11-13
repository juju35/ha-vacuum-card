// Bundles src/vacuum-card.js into the single HACS file dist/vacuum-card.js,
// inlining the integration logos (Roborock, Xiaomi Mi Home, Xiaomi, Dreame, Ecovacs, Dyson, iRobot) so the card needs no extra resource.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitDist } from "./i18n-split.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const dataUri = (file) =>
  `data:${file.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${readFileSync(`${root}images/${file}`).toString("base64")}`;

const out = readFileSync(`${root}src/vacuum-card.js`, "utf8")
  .replace("__VERSION__", pkg.version)
  .replace("__IMG_LOGO__", dataUri("logo.svg"))
  .replace("__IMG_LOGO_MIHOME__", dataUri("mihome.png"))
  .replace("__IMG_LOGO_XIAOMI__", dataUri("xiaomi.png"))
  .replace("__IMG_LOGO_DREAME__", dataUri("dreame.png"))
  .replace("__IMG_LOGO_ECOVACS__", dataUri("ecovacs.png"))
  .replace("__IMG_LOGO_DYSON__", dataUri("dyson.png"))
  .replace("__IMG_LOGO_IROBOT__", dataUri("irobot.png"));

const target = `${root}dist/vacuum-card.js`;
mkdirSync(`${root}dist`, { recursive: true });
writeFileSync(target, out);
// Same file under the former name, attached to the releases for manual installs that still load it.
writeFileSync(`${root}dist/roborock-card.js`, out);
console.log(`Built dist/vacuum-card.js and dist/roborock-card.js (${(out.length / 1024).toFixed(1)} KB)`);

// Translations: English stays in the bundle, each other language goes to dist/vacuum-card.i18n.<lang>.js,
// fetched when a card needs it (scripts/i18n-split.mjs).
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) splitDist(`${root}dist`, "vacuum-card.js", { version: pkg.version, aliases: ["roborock-card.js"] });
