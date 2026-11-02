// Narrow cards (the smallest width getGridOptions allows, 4 to 6 columns of a Sections view, ~156-250 px):
// the title never shrinks to nothing, no button or chip leaves the card, long labels end with an ellipsis.
// There are no browser tests in this repository: these check the CSS rules and markup that the rendering in
// Chromium was measured with (see the pull request of review pass 9).
import assert from "node:assert/strict";
import { test } from "node:test";
import { devices, entities, states } from "../scripts/mock-states.mjs";
import { shots } from "../scripts/screenshot-list.mjs";
import { load } from "./load.mjs";

const vc = load();

const makeHass = (language = "en") => ({ entities, devices, states, language, callService() {} });

const render = (Card, config = {}, language = "en") => {
  const card = new Card();
  card.setConfig({ device: "saros", show_map: "never", collapsed: [], ...config });
  card.hass = makeHass(language);
  return card.shadowRoot.innerHTML;
};

const css = (html) => (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1].replace(/\s+/g, " ");

// Declarations of the last rule whose selector list is exactly `selector` (outside container queries when
// `scope` is omitted, else inside the @container block whose condition contains `scope`).
const rule = (sheet, selector, scope) => {
  let text = "";
  if (scope) {
    // Every @container block with this condition (the shared and the card's own styles may each have one).
    for (let at = sheet.indexOf(`@container ${scope}`); at >= 0; at = sheet.indexOf(`@container ${scope}`, at + 1)) {
      const open = sheet.indexOf("{", at);
      text += ` ${sheet.slice(open + 1, blockEnd(sheet, open))}`;
    }
    assert.ok(text, `no @container ${scope}`);
  } else text = sheet.replace(/@container[^{]*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g, "");
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const all = [...text.matchAll(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, "g"))];
  assert.ok(all.length, `no rule for ${selector}${scope ? ` in @container ${scope}` : ""}`);
  return all.map((m) => m[1]).join(";");
};

const blockEnd = (s, open) => {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  return s.length;
};

for (const [name, Card] of [
  ["full", vc.VacuumCard],
  ["mini", vc.VacuumMiniCard],
]) {
  test(`${name} card header: the title keeps a few characters, the chip shrinks, icon buttons never do`, () => {
    const sheet = css(render(Card));
    const haCard = rule(sheet, "ha-card");
    assert.match(haCard, /container-type:\s*inline-size/);
    // A size container has no width of its own: in an inline-block or a grid "auto" column (layout-card,
    // button-card…) the card fell to its borders (~2 px in Chromium). Its natural width comes from a zero-height
    // grid on :host::before, with no minimum: contain-intrinsic-inline-size (or a min-width in px on the host) is
    // also a min-content width, and the card overflowed a "1fr 1fr" grid or a flex row on a phone (362 px in 320).
    assert.doesNotMatch(sheet, /contain-intrinsic/);
    const host = rule(sheet, ":host");
    assert.match(host, /display:\s*block/);
    assert.match(host, /min-width:\s*0\s*(;|$)/);
    assert.doesNotMatch(host, /min-width:\s*[1-9]\d*px/);
    const before = rule(sheet, ":host::before");
    assert.match(before, /display:\s*grid/);
    assert.match(before, /grid-template-columns:\s*minmax\(0,\s*var\(--vc-natural-width\)\)/);
    assert.match(before, /height:\s*0/);
    const natural = [...host.matchAll(/--vc-natural-width:\s*(\d+)px/g)].map((m) => Number(m[1])).pop();
    assert.ok(natural >= 280 && natural <= 400, String(natural));
    const titles = rule(sheet, ".titles");
    // flex-basis 0: the title takes what the chip leaves, the chip keeps its whole label at usual widths (with
    // flex-basis auto a long name pushed "Charging" into "Charg…" at 280-320 px).
    assert.match(titles, /flex:\s*1 1 0(px|%)?\s*(;|$)/);
    assert.match(titles, /min-width:\s*\d+(\.\d+)?ch/);
    assert.match(rule(sheet, ".name"), /text-overflow:\s*ellipsis/);
    const chip = rule(sheet, ".chip");
    assert.match(chip, /flex:\s*0 1 auto/);
    assert.match(chip, /min-width:\s*0/);
    assert.match(chip, /max-width:\s*50%/);
    assert.match(rule(sheet, ".chip-text"), /text-overflow:\s*ellipsis/);
    assert.match(rule(sheet, ".zoom"), /flex:\s*none/);
    assert.match(rule(sheet, "a.logo-link"), /flex:\s*none/);
    // Below the threshold the chip shows only its colored dot.
    // Only below the narrowest phone width of a usual card (245 px keeps the label).
    assert.match(rule(sheet, ".chip-text", "(max-width: 230px)"), /display:\s*none/);
    for (const m of sheet.matchAll(/@container \(max-width: (\d+)px\)\s*\{[^@]*?\.chip-text\s*\{[^}]*display:\s*none/g))
      assert.ok(Number(m[1]) < 245, `the chip loses its label up to ${m[1]} px`);
  });

  test(`${name} card: the status chip keeps its text for screen readers and as a tooltip, in every language`, () => {
    for (const language of ["en", "pl", "sr-Latn"]) {
      const html = render(Card, {}, language);
      const chip = html.match(/<span class="chip [^>]*>([\s\S]*?)<\/span><\/span>/);
      assert.ok(chip, "chip");
      const text = chip[1].match(/<span class="chip-text">([^<]*)/)[1];
      assert.ok(text.length > 1);
      assert.match(chip[0], new RegExp(`title="${text}"`));
      assert.match(chip[0], new RegExp(`aria-label="${text}"`));
    }
  });
}

test("the full card declares a minimum width it can be read at", () => {
  const card = new vc.VacuumCard();
  const { columns, min_columns } = card.getGridOptions();
  assert.equal(columns, 12);
  // 9 of 12 columns: ≥ 238 px in the narrowest Sections view (320 px), where its layout below still holds.
  assert.ok(min_columns >= 9, `min_columns ${min_columns}`);
});

test("the full card at narrow widths: consumable bars give way to the labels, stats on one column, smaller picture", () => {
  const sheet = css(render(vc.VacuumCard));
  assert.match(rule(sheet, ".cons .bar, .cons .nobar", "(max-width: 360px)"), /display:\s*none/);
  assert.match(rule(sheet, ".cons", "(max-width: 360px)"), /grid-template-columns:\s*18px minmax\(0, 1fr\) auto/);
  assert.match(rule(sheet, ".cons.with-reset", "(max-width: 360px)"), /grid-template-columns:\s*18px minmax\(0, 1fr\) auto 28px/);
  assert.match(rule(sheet, ".tiles.two", "(max-width: 300px)"), /grid-template-columns:\s*minmax\(0, 1fr\)/);
  // Below its 9 columns (a "1fr 1fr" layout-card on a phone, ~156-176 px), "100 %" was cut to "10" (+28 px).
  assert.match(rule(sheet, ".picture", "(max-width: 200px)"), /width:\s*48px/);
  assert.match(rule(sheet, ".batt .pct", "(max-width: 200px)"), /font-size:\s*24px/);
  assert.match(rule(sheet, ".picture", "(max-width: 300px)"), /width:\s*72px/);
});

test("tile labels, mode tags and button labels are in their own element so that they end with an ellipsis", () => {
  const html = render(vc.VacuumCard, {}, "pl");
  const sheet = css(html);
  // text-overflow does not apply to the bare text of a flex container: the text must sit in a span.
  assert.match(html, /<div class="k"><svg[^>]*>[\s\S]*?<\/svg><span>[^<]+<\/span><\/div>/);
  assert.doesNotMatch(html, /<div class="k">(?:<svg[\s\S]*?<\/svg>)?[^<]+</);
  assert.match(rule(sheet, ".tile .k span"), /text-overflow:\s*ellipsis/);
  assert.match(html, /<span class="tag [^>]*><svg[\s\S]*?<\/svg><span>[^<]+<\/span><\/span>/);
  assert.match(rule(sheet, ".tag span"), /text-overflow:\s*ellipsis/);
  assert.match(rule(sheet, ".tag"), /max-width:\s*100%/);
  assert.match(rule(sheet, ".btn span"), /text-overflow:\s*ellipsis/);
});

test("the mini card at narrow widths: its buttons move under the robot, the picture gives way first", () => {
  const sheet = css(render(vc.VacuumMiniCard));
  assert.match(rule(sheet, ".content", "(max-width: 300px)"), /flex-wrap:\s*wrap/);
  assert.match(rule(sheet, ".controls", "(max-width: 300px)"), /flex-basis:\s*100%/);
  assert.match(rule(sheet, ".picture", "(max-width: 200px)"), /display:\s*none/);
  // The round buttons never shrink.
  assert.match(rule(sheet, ".controls"), /flex:\s*none/);
});

test("the README screenshots show both cards at a narrow width, so a narrow-layout break shows in review", () => {
  for (const type of ["vacuum-card", "vacuum-mini-card"]) {
    const narrow = shots.filter((s) => s.type === type && s.width <= 246);
    assert.ok(narrow.length >= 2, `${type}: no narrow screenshot`);
    assert.deepEqual(new Set(narrow.map((s) => s.theme)), new Set(["light", "dark"]));
  }
});
