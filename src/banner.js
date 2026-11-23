// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Illustrated header ("banner", 90 px): the title on the wall of a living room at the left, the card's own picture of
// the device drawn big at the right (with its dock or Clean Base when it has one, animated by what it does), on a
// 10 px parquet strip edge to edge. Day or night: illustration_theme, else Home Assistant's dark theme alone (a light
// theme keeps the day picture after sunset).
// ---------------------------------------------------------------------------
export const vcIsNight = (hass, config) => {
  const theme = config?.illustration_theme;
  if (theme === "night") return true;
  if (theme === "day") return false;
  return !!hass?.themes?.darkMode;
};
// The living room (200 × 80, its floor at y 80): a sofa and a floor lamp (lit at night), zoomed in from its bottom right corner so that the sofa and the lamp
// stand beside the device. No id inside: several cards on a page cannot clash.
export const vcSceneSvg = (n) =>
  `<svg class="vc-room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false"><g transform="translate(200 80) scale(1.28) translate(-200 -80)"><rect x="0" y="62" width="200" height="1.2" fill="${n ? "#3a4050" : "#e2d6c6"}"/><g fill="${
    n ? "#4a4470" : "#9d97e0"
  }"><rect x="58" y="52" width="56" height="20" rx="5"/><rect x="54" y="46" width="10" height="26" rx="4"/><rect x="108" y="46" width="10" height="26" rx="4"/></g>${
    n ? `<circle cx="127" cy="38" r="12" fill="#ffcf6e" opacity=".15"/>` : ""
  }<rect x="126" y="40" width="2" height="34" fill="#888"/><path d="M121 40h12l-3-8h-6z" fill="${n ? "#ffcf6e" : "#e8e0d0"}"/></g></svg>`;
// Size and right edge of the device in the 200 × 80 scene, by kind of picture: a robot with its dock or Clean Base
// (square drawing; every brand the same size), a robot on the floor, an upright wet-dry vacuum, any other picture.
export const VC_TARGETS = { base: [104, 70, 196], floor: [90, 42, 190], tall: [56, 76, 190], other: [90, 70, 196] };
export const VC_PICTURES = new Map();
export const vcPct = (v) => `${+(v * 100).toFixed(2)}%`;
// Position of a picture in the scene (percent of the scene), its drawing standing on the floor. `shift` moves it
// left (the mini card's detail button sits at the top right).
export const vcPlace = (pic, shift = 0) => {
  let p = VC_PICTURES.get(pic);
  if (!p) {
    p = {};
    const head = "data:image/svg+xml,";
    if (String(pic).startsWith(head)) {
      const svg = decodeURIComponent(pic.slice(head.length));
      const num4 = (re) => re.exec(svg)?.[1].trim().split(/\s+/).map(Number);
      p.vb = num4(/viewBox="([^"]+)"/);
      p.box = num4(/data-box="([^"]+)"/);
    }
    VC_PICTURES.set(pic, p);
  }
  let left, top, w, h;
  if (p.vb?.length === 4) {
    const [, , W, H] = p.vb;
    const [x0, y0, x1, y1] = p.box?.length === 4 ? p.box : [0, 0, W, H];
    const [bw, bh, right] = VC_TARGETS[W === H ? "base" : H > W * 1.5 ? "tall" : "floor"];
    const s = Math.min(bw / (x1 - x0), bh / (y1 - y0));
    left = right - shift - x1 * s;
    top = 80 - y1 * s;
    w = W * s;
    h = H * s;
  } else {
    const [bw, bh, right] = VC_TARGETS.other;
    [left, top, w, h] = [right - shift - bw, 80 - bh, bw, bh];
  }
  return `left:${vcPct(left / 200)};top:${vcPct(top / 80)};width:${vcPct(w / 200)};height:${vcPct(h / 80)}`;
};
export const BANNER_STYLE = `
  .banner { position: relative; overflow: hidden; height: 90px; background: #f4ede3; color: #0d2a45; --vc-scene-w: min(200px, 58%); }
  .banner.night { background: #2a2f3d; color: #fff; }
  .vc-scene { position: absolute; right: 0; bottom: 10px; width: var(--vc-scene-w); aspect-ratio: 5 / 2; }
  .vc-room { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .vc-dev { position: absolute; }
  .vc-dev .picture { width: 100%; height: 100%; }
  .vc-dev .picture img { width: 100%; height: 100%; max-width: none; max-height: none; object-fit: contain; object-position: 50% 100%;
                         filter: drop-shadow(0 2px 3px rgba(0,0,0,.16)); }
  /* Parquet strip under the whole banner, edge to edge. */
  .vc-ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
               background: repeating-linear-gradient(90deg, #c99a6b 0 38px, #b98a5c 38px 40px); box-shadow: inset 0 2px 0 #a97c50; }
  .night .vc-ground { background: repeating-linear-gradient(90deg, #4a3a2c 0 38px, #3e3024 38px 40px); box-shadow: inset 0 2px 0 #5c4836; }
  .htext { position: absolute; left: 12px; top: 0; bottom: 10px; right: calc(var(--vc-scene-w) + 4px); display: flex; align-items: center; gap: 10px; min-width: 0; }
  .htext .titles { flex: 1 1 0; min-width: 0; }
  .htext .name { font-size: 16px; }
  .line2 { font-size: 13px; line-height: 18px; color: #3b5b78; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .night .line2 { color: rgba(255,255,255,.78); }
  :host([hide-subtitle]) .line2 { display: none; }
  /* Status pill on a frosted tint of the state colour (placement: see _fitPill). */
  .banner .chip { flex: none; max-width: none; line-height: 16px; background: color-mix(in srgb, var(--c, var(--vc-ok)) 18%, rgba(255,255,255,.78));
                  color: color-mix(in srgb, var(--c, var(--vc-ok)) 45%, #0d2a45); }
  .banner.night .chip { background: color-mix(in srgb, var(--c, var(--vc-ok)) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c, var(--vc-ok)) 35%, #ffffff); }
  .banner .chip .dot { width: 7px; height: 7px; }
  /* Same colour as the header icon: at rest (docked, charging) neutral grey. */
  .banner .chip.ok { --c: var(--vc-idle); }
  .banner .chip.active { --c: var(--state-vacuum-active-color, var(--vc-active)); }
  /* The detail button (mini card) sits at the top right: the device steps aside. */
  .banner:has(> .zoom) .vc-dev { transform: translateX(calc(var(--vc-scene-w) * -.15)); }
  .line2 .sub { font-size: inherit; color: inherit; }
  /* The round icon on a light glass disc; its color is the device's state (see .type-icon). */
  .banner .type-icon { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(47,128,237,.18); }
  .banner.night .type-icon { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
  .banner .type-icon .icon.type, .banner .type-icon:is(.ok, .warn, .crit, .idle, .active) .icon.type { fill: var(--vc-tint); }
  .banner .type-icon .logo { background: #fff; box-shadow: 0 0 0 1px rgba(13,42,69,.16), 0 1px 3px rgba(13,42,69,.18); }
  .banner .zoom { position: absolute; top: 5px; right: 5px; margin: 0; z-index: 2; color: #33506b; background: rgba(255,255,255,.55);
                  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
  .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
  .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
  /* Too narrow for the scene beside the title: the wall and the parquet alone stay. */
  /* Narrow card (a mini card on 6 columns): the scene takes less room, the title keeps more. */
  @container (max-width: 300px) { .banner { --vc-scene-w: 44%; } }
  @container (max-width: 200px) { .vc-scene { display: none; } .htext { right: 36px; } }
`;
