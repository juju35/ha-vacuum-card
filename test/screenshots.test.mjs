import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import { gifs, shots } from "../scripts/screenshot-list.mjs";

const twinOf = (list, s) => list.find((t) => t.file === `${s.file}-${s.theme === "light" ? "dark" : "light"}`);
const rest = ({ file, theme, ...r }) => r;

for (const [kind, list] of [
  ["screenshot", shots],
  ["animation", gifs],
]) {
  test(`every ${kind} has a twin in the other theme showing the same state`, () => {
    const paired = new Set();
    for (const s of list) {
      if (paired.has(s.file)) continue;
      const twin = twinOf(list, s);
      assert.ok(twin, `${s.file} has no ${s.theme === "light" ? "-dark" : "-light"} twin`);
      assert.notEqual(twin.theme, s.theme, `${s.file} and ${twin.file} use the same theme`);
      // Same card, config, mock states and clicks: only the theme may change.
      assert.deepEqual(rest(twin), rest(s), `${twin.file} does not show the same state as ${s.file}`);
      paired.add(s.file).add(twin.file);
    }
    assert.equal(paired.size, list.length);
  });
}

test("every file in screenshots/ is rendered by the screenshot script", () => {
  const rendered = new Set([...shots.map((s) => `${s.file}.png`), ...gifs.map((g) => `${g.file}.gif`)]);
  const files = readdirSync(new URL("../screenshots/", import.meta.url));
  assert.deepEqual(files.filter((f) => !rendered.has(f)), []);
  assert.deepEqual([...rendered].filter((f) => !files.includes(f)), []);
});
