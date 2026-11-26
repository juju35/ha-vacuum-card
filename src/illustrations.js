// Roborock pictures: drawn illustrations, picked from the device name (robot with or without LiDAR turret,
// with or without its dock, dark or white) or the wet-dry vacuum kind, and animated by what the device is doing
// (`activity`): vacuum, mop, vacmop (vacuum and mop), returning, washing (the mops), drying (the mops).
export const ROBOT_COLORS = {
  dark: { top: "#3a3d42", side: "#1f2124", rim: "#55595f", lens: "#0e0f11" },
  white: { top: "#f4f4f2", side: "#cfd0cd", rim: "#e2e2df", lens: "#2a2c30" },
};
// Animations, shared by every picture. Pictures are <img>, so CSS animations run but no script does.
export const ANIM_CSS = `
  .spin { transform-box: fill-box; transform-origin: center; animation: spin .5s linear infinite; }
  .sway { animation: sway 2.4s ease-in-out infinite alternate; }
  .home { animation: home 2.6s cubic-bezier(.3,.7,.4,1) infinite; }
  .tilt { transform-box: fill-box; transform-origin: 50% 100%; animation: tilt 1.6s ease-in-out infinite alternate; }
  .dust { animation: dust 1.2s ease-in infinite; } .drop { animation: drop 1.1s ease-in infinite; }
  .wet { animation: wet 1.6s ease-in-out infinite alternate; }
  .bub { transform-box: fill-box; transform-origin: center; animation: bub 1.8s ease-out infinite; }
  .heat { animation: heat 2.2s ease-out infinite; }
  .roll { animation: roll .4s linear infinite; }
  .evac { animation: evac 1.5s ease-in infinite; }
  .d1 { animation-delay: -.3s; } .d2 { animation-delay: -.6s; } .d3 { animation-delay: -.9s; } .d4 { animation-delay: -1.2s; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes sway { from { transform: translateX(-6px); } to { transform: translateX(6px); } }
  @keyframes home { 0% { transform: translateX(-70px); opacity: 0; } 15% { opacity: 1; } 60%, 100% { transform: none; opacity: 1; } }
  @keyframes tilt { from { transform: rotate(-4deg); } to { transform: rotate(4deg); } }
  @keyframes dust { from { transform: translateY(14px); opacity: 0; } 30% { opacity: .9; } to { transform: translateY(-4px); opacity: 0; } }
  @keyframes drop { from { transform: translateY(-6px); opacity: 0; } 30% { opacity: 1; } to { transform: translateY(10px); opacity: 0; } }
  @keyframes wet { from { opacity: .25; } to { opacity: .6; } }
  @keyframes bub { from { transform: translateY(0) scale(.4); opacity: 0; } 25% { opacity: .9; } to { transform: translateY(-34px) scale(1.1); opacity: 0; } }
  @keyframes heat { from { transform: translateY(6px); opacity: 0; } 35% { opacity: .9; } to { transform: translateY(-30px); opacity: 0; } }
  @keyframes roll { to { stroke-dashoffset: -12; } }
  @keyframes evac { from { transform: translateY(0); opacity: 0; } 20% { opacity: .95; } 85% { opacity: .8; } to { transform: translateY(-78px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;
// Robot seen from the front, slightly from above: disc of radius r centred on (cx, cy).
// Its disc: shadow, skirt, lid and the lid's rim.
export const discShape = (cx, cy, r, col) => {
  const ry = r * 0.3, h = r * 0.2;
  let s = `<ellipse cx="${cx}" cy="${cy + h + ry * 0.35}" rx="${r * 0.98}" ry="${ry * 0.7}" opacity=".22"/>`;
  s += `<path d="M${cx - r} ${cy} v${h} a${r} ${ry} 0 0 0 ${2 * r} 0 v${-h} z" fill="${col.side}"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" fill="${col.top}"/>`;
  return `${s}<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.97}" ry="${ry * 0.93}" fill="none" stroke="${col.rim}" stroke-width="${r * 0.02}"/>`;
};
// LiDAR turret of radius tr and height th, its base at (cx, ty).
export const turretShape = (cx, ty, tr, th, col) =>
  `<path d="M${cx - tr} ${ty} v${-th} a${tr} ${tr * 0.3} 0 0 1 ${2 * tr} 0 v${th} a${tr} ${tr * 0.3} 0 0 1 ${-2 * tr} 0 z" fill="${col.side}"/>` +
  `<ellipse cx="${cx}" cy="${ty - th}" rx="${tr}" ry="${tr * 0.3}" fill="${col.top}"/>` +
  `<rect x="${cx - tr * 0.55}" y="${ty - th * 0.75}" width="${tr * 1.1}" height="${th * 0.4}" rx="${th * 0.2}" fill="${col.lens}"/>`;
export const robotShape = (cx, cy, r, turret, col) => {
  const ry = r * 0.3, h = r * 0.2;
  let s = discShape(cx, cy, r, col);
  s += `<rect x="${cx - r * 0.3}" y="${cy + h * 0.35}" width="${r * 0.6}" height="${h * 0.35}" rx="${h * 0.17}" fill="${col.lens}"/>`;
  if (turret) {
    s += turretShape(cx, cy - ry * 0.25, r * 0.24, r * 0.17, col);
  } else {
    s += `<circle cx="${cx + r * 0.55}" cy="${cy - ry * 0.25}" r="${r * 0.04}" fill="#e3212d"/>`;
  }
  return s;
};
// `box`: the bounding box of what is drawn (x0 y0 x1 y1), so that the illustrated header sizes the device by its
// drawing rather than by its viewBox margins, and sets it on the floor.
export const svgDoc = (w, h, body, defs = "", anim = false, box = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"${box ? ` data-box="${box.join(" ")}"` : ""}>${anim ? `<style>${ANIM_CSS}</style>` : ""}${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
// Side brush: three spokes turning, at (x, y).
export const brush = (x, y, r) =>
  `<g class="spin"><circle cx="${x}" cy="${y}" r="${r}" fill="none"/>${[0, 120, 240]
    .map((a) => {
      const rad = (a * Math.PI) / 180;
      return `<line x1="${x}" y1="${y}" x2="${(x + r * Math.cos(rad)).toFixed(1)}" y2="${(y + r * 0.45 * Math.sin(rad)).toFixed(1)}" stroke="#8a8f96" stroke-width="1.6" stroke-linecap="round"/>`;
    })
    .join("")}</g>`;
// Rising bubbles (washing) or heat waves (drying) around (cx, y), spread over w.
export const bubbles = (cx, y, w) =>
  [-0.4, -0.15, 0.1, 0.35, 0.45]
    .map((f, i) => `<circle class="bub d${i % 5}" cx="${cx + f * w}" cy="${y - (i % 2) * 6}" r="${3.5 + (i % 3) * 1.5}" fill="#9fd3ff" stroke="#3f8fd4" stroke-width=".8"/>`)
    .join("");
export const heat = (cx, y, w) =>
  [-0.3, 0, 0.3]
    .map(
      (f, i) =>
        `<path class="heat d${i + 1}" d="M${cx + f * w} ${y} q-4 -6 0 -12 q4 -6 0 -12" fill="none" stroke="#ff9f43" stroke-width="2.2" stroke-linecap="round"/>`
    )
    .join("");
// A robot drawn on the floor (160 × 104): swaying while it cleans, dust trailing behind when it vacuums, a wet trail
// and drops when it mops (activity vacuum / mop / vacmop; null: at rest, no animation).
export const onFloor = (robot, activity, box = [8, 27, 152, 88]) => {
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  const vac = activity === "vacuum" || activity === "vacmop";
  const mop = activity === "mop" || activity === "vacmop";
  let s = "";
  if (mop) s += `<ellipse class="wet" cx="80" cy="84" rx="78" ry="13" fill="#3f8fd4"/>`;
  s += `<g class="${cleaning ? "sway" : ""}">${robot}</g>`;
  if (vac) s += [56, 72, 88, 104].map((x, i) => `<circle class="dust d${i + 1}" cx="${x}" cy="94" r="2.6" fill="#c9ccd0"/>`).join("");
  if (mop) s += [40, 66, 94, 120].map((x, i) => `<path class="drop d${i + 1}" d="M${x} 88 q-3 4 0 6 q3 -2 0 -6z" fill="#3f8fd4"/>`).join("");
  return svgDoc(160, 104, s, "", cleaning, box);
};
// Drawing of a dock / Clean Base with its robot: the same box for every brand, so that all the models with a base are
// drawn at the same size in the illustrated header.
export const BASE_BOX = [14, 8, 146, 158];
// Robot alone or in front of its dock, animated by `activity`.
export const robotSvg = ({ turret = true, white = false, dock = true, activity = null } = {}) => {
  const col = ROBOT_COLORS[white ? "white" : "dark"];
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  // Cleaning: the robot is out on the floor, drawn alone whatever its dock.
  if (!dock || cleaning) {
    const vac = activity === "vacuum" || activity === "vacmop";
    let robot = robotShape(80, 50, 72, turret, col);
    if (vac) robot += brush(26, 75, 10) + brush(134, 75, 10);
    return onFloor(robot, activity);
  }
  const [dTop, dBot, panel, seam] = white
    ? ["#fafaf8", "#d7d8d5", "#ecece9", "#c4c5c2"]
    : ["#b9bcc0", "#62666c", "#2b2e33", "#4a4e54"];
  const defs = `<linearGradient id="d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${dTop}"/><stop offset="1" stop-color="${dBot}"/></linearGradient>`;
  let s = `<ellipse cx="80" cy="152" rx="66" ry="6" opacity=".22"/>`;
  s += `<path d="M18 140 L30 126 H130 L142 140 Q142 146 136 146 H24 Q18 146 18 140 Z" fill="${white ? "#e6e6e3" : "#2b2e33"}"/>`;
  s += `<rect x="34" y="8" width="92" height="124" rx="10" fill="url(#d)"/>`;
  s += `<rect x="40" y="16" width="80" height="54" rx="6" fill="${panel}"/>`;
  s += `<line x1="80" y1="18" x2="80" y2="68" stroke="${seam}" stroke-width="1.5"/>`;
  s += `<rect x="40" y="76" width="80" height="4" rx="2" fill="${seam}"/>`;
  s += `<circle cx="112" cy="90" r="2" fill="${activity === "washing" ? "#2fa3ff" : activity === "drying" ? "#ff9f43" : "#43c463"}"/>`;
  s += `<g class="${activity === "returning" ? "home" : ""}">${robotShape(80, 122, 52, turret, col)}</g>`;
  if (activity === "washing") s += bubbles(80, 112, 100);
  if (activity === "drying") s += heat(80, 108, 100);
  return svgDoc(160, 160, s, defs, !!activity, BASE_BOX);
};
// Upright wet-dry vacuum: floor head, body with the two water tanks, handle. Cleaning: it rocks back and forth
// and its roller turns; washing / drying (self-cleaning on its base): bubbles / heat waves at the floor head.
// Dyson 360 robot (Eye, Heurist, Vis Nav): a tall, narrow drum on two tank tracks with the 360° camera on top
// (Vis Nav: wider and lower, purple band). Vacuuming: the robot sways, its tracks roll and dust is sucked in;
// returning: it slides in from the side (it has no dock station to draw).
export const dysonSvg = ({ visnav = false, white = false, activity = null } = {}) => {
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  const [top, side, rim] = white ? ["#ececea", "#c4c5c2", "#d8d9d6"] : ["#55585e", "#33363b", "#6a6e75"];
  const band = visnav ? "#8a63c4" : "#4f7fd8";
  const w = visnav ? 44 : 34, cy = visnav ? 44 : 34, h = visnav ? 30 : 40, ry = w * 0.26;
  let r = `<ellipse cx="80" cy="${cy + h + ry + 4}" rx="${w + 22}" ry="7" opacity=".22"/>`;
  // Tracks, on both sides of the drum.
  for (const x of [80 - w - 14, 80 + w - 2]) {
    r += `<rect x="${x}" y="${cy + h - 18}" width="16" height="${ry * 2 + 20}" rx="7" fill="#1d1f22"/>`;
    r += `<line class="${cleaning ? "roll" : ""}" x1="${x + 8}" y1="${cy + h - 14}" x2="${x + 8}" y2="${cy + h + ry * 2 - 2}" stroke="#4a4e54" stroke-width="3" stroke-dasharray="3 3"/>`;
  }
  r += `<path d="M${80 - w} ${cy} v${h} a${w} ${ry} 0 0 0 ${2 * w} 0 v${-h} z" fill="${side}"/>`;
  r += `<path d="M${80 - w} ${cy + h * 0.55} v${h * 0.16} a${w} ${ry} 0 0 0 ${2 * w} 0 v${-h * 0.16} a${w} ${ry} 0 0 1 ${-2 * w} 0 z" fill="${band}"/>`;
  r += `<ellipse cx="80" cy="${cy}" rx="${w}" ry="${ry}" fill="${top}"/>`;
  r += `<ellipse cx="80" cy="${cy}" rx="${w * 0.96}" ry="${ry * 0.92}" fill="none" stroke="${rim}" stroke-width="1"/>`;
  // 360° camera: a short glass cylinder with its dark lens ring.
  const cw = w * 0.36, ch = 9, ct = cy - ry * 0.15;
  r += `<path d="M${80 - cw} ${ct} v${-ch} a${cw} ${cw * 0.3} 0 0 1 ${2 * cw} 0 v${ch} a${cw} ${cw * 0.3} 0 0 1 ${-2 * cw} 0 z" fill="#0e0f11"/>`;
  r += `<ellipse cx="80" cy="${ct - ch}" rx="${cw}" ry="${cw * 0.3}" fill="${side}"/>`;
  r += `<path d="M${80 - cw * 0.7} ${ct - ch * 0.45} h${cw * 1.4}" stroke="#6fa8ff" stroke-width="1.6" opacity=".8"/>`;
  let s = `<g class="${cleaning ? "sway" : activity === "returning" ? "home" : ""}">${r}</g>`;
  if (cleaning) s += [62, 74, 86, 98].map((x, i) => `<circle class="dust d${i + 1}" cx="${x}" cy="98" r="2.6" fill="#c9ccd0"/>`).join("");
  return svgDoc(160, 104, s, "", cleaning || activity === "returning", visnav ? [14, 28, 146, 99] : [24, 20, 136, 94]);
};
// iRobot: Roomba (round, no LiDAR turret, its CLEAN button with a light ring on top and a single side brush; the
// s series D-shaped, the j series with a front camera, the 974 / 976 with a silver faceplate) or Braava jet (a rounded square mopping robot with its water
// tank), alone or in front of a slim Clean Base (the "+" models). Vacuuming: the robot sways, its side brush spins and
// dust trails behind; mopping (Braava, Combo): wet trail and spray; returning: it slides in front of its base;
// emptying (Clean Base): dust rises up the base's duct.
export const roombaShape = (cx, cy, r, col, { shape = "round", camera = false, silver = false, ring = "#bfe9ff" } = {}) => {
  const ry = r * 0.3, h = r * 0.2;
  // 974 / 976: the dark body of the 900 series under a silver faceplate.
  if (silver) col = { ...col, top: "#a8adb3", rim: "#6f757c" };
  let s = `<ellipse cx="${cx}" cy="${cy + h + ry * 0.35}" rx="${r * 0.98}" ry="${ry * 0.7}" opacity=".22"/>`;
  if (shape === "square") {
    // Braava jet: a rounded square seen from above (deeper than a disc), its CLEAN button in the middle of the
    // lid, the spray nozzle on the front and the cleaning pad under it.
    const w = r * 0.86, d = r * 0.46;
    s = `<ellipse cx="${cx}" cy="${cy + d + h * 0.9}" rx="${w * 1.05}" ry="${ry * 0.6}" opacity=".22"/>`;
    s += `<rect x="${cx - w * 1.02}" y="${cy + d - h * 0.2}" width="${w * 2.04}" height="${h * 1.35}" rx="${h * 0.5}" fill="#9fd3ff" opacity=".85"/>`;
    s += `<rect x="${cx - w}" y="${cy - d}" width="${2 * w}" height="${2 * d + h}" rx="${d * 0.45}" fill="${col.side}"/>`;
    s += `<rect x="${cx - w}" y="${cy - d}" width="${2 * w}" height="${2 * d}" rx="${d * 0.45}" fill="${col.top}"/>`;
    s += `<rect x="${cx - w * 0.92}" y="${cy - d * 0.92}" width="${w * 1.84}" height="${d * 1.84}" rx="${d * 0.4}" fill="none" stroke="${col.rim}" stroke-width="${r * 0.02}"/>`;
    s += `<rect x="${cx - w * 0.35}" y="${cy - d * 0.72}" width="${w * 0.7}" height="${d * 0.16}" rx="${d * 0.08}" fill="${col.side}"/>`;
    s += `<ellipse cx="${cx}" cy="${cy + d * 0.1}" rx="${r * 0.15}" ry="${r * 0.11}" fill="none" stroke="${ring}" stroke-width="${r * 0.03}" opacity=".9"/>`;
    s += `<ellipse cx="${cx}" cy="${cy + d * 0.1}" rx="${r * 0.09}" ry="${r * 0.065}" fill="#8a8f96"/>`;
    s += `<rect x="${cx - r * 0.09}" y="${cy + d + h * 0.32}" width="${r * 0.18}" height="${h * 0.38}" rx="${h * 0.19}" fill="${col.lens}"/>`;
    return s;
  }
  if (shape === "d") {
    // s series: round back, flat front.
    const fy = cy + ry * 0.62;
    s += `<path d="M${cx - r} ${fy - ry * 0.25} v${h} q0 ${ry * 0.25} ${ry * 0.4} ${ry * 0.25} h${2 * r - ry * 0.8} q${ry * 0.4} 0 ${ry * 0.4} ${-ry * 0.25} v${-h} z" fill="${col.side}"/>`;
    s += `<path d="M${cx - r} ${fy - ry * 0.25} V${cy} A${r} ${ry} 0 0 1 ${cx + r} ${cy} V${fy - ry * 0.25} q0 ${ry * 0.25} ${-ry * 0.4} ${ry * 0.25} H${cx - r + ry * 0.4} q${-ry * 0.4} 0 ${-ry * 0.4} ${-ry * 0.25} z" fill="${col.top}"/>`;
    s += `<rect x="${cx - r * 0.5}" y="${fy + h * 0.3}" width="${r}" height="${h * 0.3}" rx="${h * 0.15}" fill="#b07a4e" opacity=".85"/>`;
  } else {
    s += `<path d="M${cx - r} ${cy} v${h} a${r} ${ry} 0 0 0 ${2 * r} 0 v${-h} z" fill="${col.side}"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${ry}" fill="${col.top}"/>`;
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${r * 0.66}" ry="${ry * 0.66}" fill="none" stroke="${col.rim}" stroke-width="${r * 0.025}"/>`;
  }
  // CLEAN button and its light ring.
  s += `<ellipse cx="${cx}" cy="${cy - ry * 0.05}" rx="${r * 0.22}" ry="${ry * 0.22}" fill="none" stroke="${ring}" stroke-width="${r * 0.03}" opacity=".9"/>`;
  s += `<ellipse cx="${cx}" cy="${cy - ry * 0.05}" rx="${r * 0.15}" ry="${ry * 0.15}" fill="${col.lens}"/>`;
  // j series: the front camera, on the bumper.
  if (camera) s += `<circle cx="${cx}" cy="${cy + ry + h * 0.5}" r="${h * 0.26}" fill="${col.lens}" stroke="#6fa8ff" stroke-width="${h * 0.07}"/>`;
  return s;
};
// Braava jet sizes (radius of roombaShape), smaller than a Roomba (r 72, ≈ 34 cm): the m6 is ≈ 27 cm, the 240 ≈ 18 cm.
export const BRAAVA_R = { m6: 46, small: 38 };
export const roombaSvg = ({ shape = "round", camera = false, silver = false, white = false, base = false, combo = false, small = false, activity = null } = {}) => {
  const col = ROBOT_COLORS[white ? "white" : "dark"];
  const braava = shape === "square";
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  if (!base || cleaning) {
    // What it cleans comes from the robot: a Braava mops, a Combo vacuums and mops, a Roomba vacuums.
    const act = cleaning ? (braava ? "mop" : combo ? "vacmop" : "vacuum") : null;
    if (braava) {
      // Drawn in the Roomba's floor box (same scale in the illustrated header), smaller, at its right end, its
      // shadow on the floor line.
      const r = BRAAVA_R[small ? "small" : "m6"];
      return onFloor(roombaShape(150 - r * 0.88, 88 - r * 0.82, r, col, { shape }), act);
    }
    let robot = roombaShape(80, 50, 72, col, { shape, camera, silver });
    if (act === "vacuum" || act === "vacmop") robot += brush(128, 76, 11);
    return onFloor(robot, act);
  }
  // Clean Base: a slim tower (wider for the Combo, its water tank on the side), the robot docked in front.
  const w = combo ? 64 : 50, x = 80 - w / 2;
  const [body, edge, lid, duct] = white ? ["#f2f2f0", "#cfd0cd", "#e3e3e0", "#c4c5c2"] : ["#363a40", "#4a4e54", "#464a51", "#1d1f22"];
  let s = `<ellipse cx="80" cy="152" rx="66" ry="6" opacity=".22"/>`;
  s += `<path d="M18 140 L30 128 H130 L142 140 Q142 146 136 146 H24 Q18 146 18 140 Z" fill="${white ? "#e6e6e3" : "#2b2e33"}"/>`;
  s += `<rect x="${x}" y="10" width="${w}" height="122" rx="9" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
  s += `<rect x="${x + 4}" y="14" width="${w - 8}" height="20" rx="6" fill="${lid}"/>`;
  // Evacuation duct up the front of the base.
  s += `<rect x="74" y="40" width="12" height="80" rx="6" fill="${duct}" opacity=".9"/>`;
  if (combo) s += `<rect x="${x + w - 15}" y="48" width="8" height="46" rx="4" fill="#7cc4f2" opacity=".7"/>`;
  s += `<circle cx="80" cy="26" r="2.2" fill="${activity === "emptying" ? "#2fa3ff" : "#64a70b"}"/>`;
  if (activity === "emptying") s += [0, 1, 2, 3, 4].map((i) => `<circle class="evac d${i}" cx="${78 + (i % 3) * 2}" cy="116" r="${2 + (i % 2) * 0.8}" fill="#c9ccd0"/>`).join("");
  s += `<g class="${activity === "returning" ? "home" : ""}">${roombaShape(80, 122, 52, col, { shape, camera, silver })}</g>`;
  return svgDoc(160, 160, s, "", activity === "returning" || activity === "emptying", BASE_BOX);
};
export const wetdrySvg = ({ white = true, activity = null } = {}) => {
  const [body, edge, accent] = white ? ["#f2f2f0", "#c9cac7", "#3a3d42"] : ["#4a4e54", "#26282c", "#9aa0a6"];
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  let s = `<ellipse cx="50" cy="194" rx="40" ry="4" opacity=".22"/>`;
  let v = `<path d="M12 178 Q12 168 22 168 H78 Q88 168 88 178 V186 Q88 192 82 192 H18 Q12 192 12 186 Z" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
  v += `<rect x="16" y="182" width="68" height="6" rx="3" fill="#3f8fd4" opacity=".7"/>`;
  if (cleaning) v += `<line class="roll" x1="18" y1="185" x2="82" y2="185" stroke="#d6ecff" stroke-width="2" stroke-dasharray="4 8"/>`;
  v += `<rect x="30" y="70" width="40" height="104" rx="14" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
  v += `<rect x="35" y="80" width="30" height="34" rx="6" fill="#9fc6e6" opacity=".75"/>`;
  v += `<rect x="35" y="120" width="30" height="40" rx="6" fill="#8a8f96" opacity=".55"/>`;
  v += `<rect x="47" y="14" width="6" height="58" rx="3" fill="${accent}"/>`;
  v += `<path d="M38 6 Q50 -2 62 6 L60 22 Q50 18 40 22 Z" fill="${accent}"/>`;
  v += `<rect x="45" y="26" width="10" height="12" rx="2" fill="#2fa3ff" opacity=".85"/>`;
  s += cleaning ? `<g class="tilt">${v}</g>` : v;
  if (activity === "washing") s += bubbles(50, 176, 70);
  if (activity === "drying") s += heat(50, 168, 60);
  return svgDoc(100, 200, s, "", !!activity, [10, 2, 90, 198]);
};
// Presets offered in the editor (`image` option); the keys of the former photos still work.
// `white`: color forced by the `color` option (true / false), undefined to keep the model's.
export const IMAGES = {
  saros_20: (activity, white = false) => robotSvg({ turret: false, white, activity }),
  s8_maxv_ultra: (activity, white = false) => robotSvg({ white, activity }),
  qrevo: (activity, white = true) => robotSvg({ white, activity }),
  q7: (activity, white = true) => robotSvg({ white, dock: false, activity }),
  f25_ultra: (activity, white = true) => wetdrySvg({ white, activity }),
  dyad_pro: (activity, white = false) => wetdrySvg({ white, activity }),
};
// `color` option → forced color of the picture: true (white), false (dark), undefined (per model).
export const colorOf = (color) => (color === "white" ? true : color === "dark" ? false : undefined);
// iRobot (roomba integration): the model is the robot's SKU — series letter, three digits, three digits of region
// (020 Europe, 840 / 820 America…): R980020 → Roomba 980, i755020 → Roomba i7+ (5 or 7 as second digit: with its
// Clean Base), c975020 → Roomba Combo j9+, m611020 → Braava jet m6. null when the model is not an iRobot SKU.
export const irobotName = (model) => {
  const m = /^([reijscm])(\d)(\d)(\d)\d{3}$/.exec(String(model || "").toLowerCase());
  if (!m) return null;
  const [, l, d1, d2, d3] = m;
  const plus = d2 === "5" || d2 === "7" ? "+" : "";
  if (l === "r") return `Roomba ${d1}${d2}${d3}`;
  if (l === "e") return `Roomba e${d1}`;
  if (l === "m") return `Braava jet m${d1}`;
  return l === "c" ? `Roomba Combo j${d1}${plus}` : `Roomba ${l}${d1}${plus}`;
};
// The iRobot models offered in the editor and recognized out of the box (European SKUs; the others are named by
// irobotName all the same).
export const IROBOT_SKUS = [
  "r675020", "r694020", "r696020", "r960020", "r974020", "r976020", "r980020", "e515020", "i315020", "i355020", "i515020", "i555020",
  "i715020", "i755020", "s915020", "s955020", "j715020", "j755020", "j955020", "c755020", "c975020", "m611020",
];
// SwitchBot: white robots — the K series is a mini robot (≈ 25 cm, against ≈ 35 cm for the others) with a small LiDAR
// turret, the S1 a full-size one, the S10 / S20 full-size with a roller mop across the back (a light-blue drum, turning
// while it mops). Docked: the K10+ / K11+ / K20+ in front of their slim auto-empty tower (the K10+ Pro Combo with its
// handheld vacuum clipped on the side), the S1 Plus / S10 in front of a squat auto-empty base, the S20 in its
// OmniStation (dust bin up top, the clean and dirty water tanks below). Vacuuming: the robot sways, its single side
// brush spins and dust trails behind; mopping (only when the robot says so — SwitchBot Cloud starts a vacuum-only
// clean): the roller turns over a wet trail; returning: it slides in front of its base (the integrations report no bin
// emptying nor mop washing / drying).
export const SWITCHBOT_COLORS = { top: "#f6f6f4", side: "#d3d4d1", rim: "#e4e4e1", lens: "#2a2c30" };
export const switchbotShape = (cx, cy, r, { turret = true, roller = false, mopping = false } = {}) => {
  const col = SWITCHBOT_COLORS;
  const ry = r * 0.3, h = r * 0.2;
  // The disc, with a matte disc in the middle of the lid, the SwitchBot look.
  let s = discShape(cx, cy, r, col);
  s += `<ellipse cx="${cx}" cy="${cy + ry * 0.12}" rx="${r * 0.62}" ry="${ry * 0.55}" fill="#ececea"/>`;
  // Bumper sensor window, and the red status light of the brand.
  s += `<rect x="${cx - r * 0.34}" y="${cy + h * 0.35}" width="${r * 0.68}" height="${h * 0.32}" rx="${h * 0.16}" fill="${col.lens}"/>`;
  s += `<circle cx="${cx - r * 0.42}" cy="${cy + ry * 0.38}" r="${r * 0.035}" fill="#d13939"/>`;
  // Roller mop: the light-blue drum showing under the skirt, its stripes rolling while it mops.
  if (roller) {
    const y = cy + h + ry * 0.72;
    s += `<rect x="${cx - r * 0.62}" y="${y}" width="${r * 1.24}" height="${h * 0.55}" rx="${h * 0.27}" fill="#8fc9ee"/>`;
    s += `<line class="${mopping ? "roll" : ""}" x1="${cx - r * 0.56}" y1="${y + h * 0.27}" x2="${cx + r * 0.56}" y2="${y + h * 0.27}" stroke="#e3f2ff" stroke-width="${h * 0.18}" stroke-dasharray="4 8"/>`;
  }
  if (turret) s += turretShape(cx, cy - ry * 0.32, r * 0.2, r * 0.13, col);
  return s;
};
// Mini robot of the K series, against the full-size S series (radius on the floor: 72).
export const SWITCHBOT_MINI_R = 52;
export const switchbotSvg = ({ mini = false, roller = false, base = null, combo = false, activity = null } = {}) => {
  const cleaning = ["vacuum", "mop", "vacmop"].includes(activity);
  // The roller turns only while the robot mops; a model without one only vacuums.
  const act = cleaning ? (roller ? activity : "vacuum") : null;
  const shape = (cx, cy, r) => switchbotShape(cx, cy, r, { roller, mopping: act === "mop" || act === "vacmop" });
  if (!base || cleaning) {
    const r = mini ? SWITCHBOT_MINI_R : 72;
    const cy = 88 - r * 0.53;
    let robot = shape(80, cy, r);
    if (act && act !== "mop") robot += brush(80 + r * 0.72, cy + r * 0.36, r * 0.15);
    return onFloor(robot, act);
  }
  const [body, edge, lid, seam] = ["#f4f4f2", "#d6d7d4", "#e6e6e3", "#c4c5c2"];
  let s = `<ellipse cx="80" cy="152" rx="66" ry="6" opacity=".22"/>`;
  s += `<path d="M18 140 L30 128 H130 L142 140 Q142 146 136 146 H24 Q18 146 18 140 Z" fill="#e6e6e3"/>`;
  // SwitchBot reports neither the bin emptying nor mop washing / drying: the base only shows its status light.
  const light = "#43c463";
  if (base === "station") {
    // S20 OmniStation: a wide box, the dust bin behind the top lid, two water tanks side by side below.
    s += `<rect x="28" y="8" width="104" height="124" rx="10" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
    s += `<rect x="34" y="14" width="92" height="22" rx="6" fill="${lid}"/>`;
    s += `<rect x="34" y="42" width="44" height="40" rx="6" fill="#bfe1f7" stroke="${seam}"/>`;
    s += `<rect x="82" y="42" width="44" height="40" rx="6" fill="#c9c4b8" stroke="${seam}"/>`;
    s += `<rect x="38" y="52" width="36" height="26" rx="4" fill="#6fb6e8" opacity=".75"/>`;
    s += `<rect x="86" y="68" width="36" height="10" rx="4" fill="#8a8273" opacity=".6"/>`;
    s += `<circle cx="80" cy="25" r="2.4" fill="${light}"/>`;
  } else if (base === "squat") {
    // S1 Plus / S10: a low auto-empty base, its bag behind a front window.
    s += `<rect x="38" y="30" width="84" height="102" rx="12" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
    s += `<rect x="44" y="36" width="72" height="16" rx="6" fill="${lid}"/>`;
    s += `<rect x="58" y="58" width="44" height="40" rx="8" fill="${seam}" opacity=".55"/>`;
    s += `<circle cx="80" cy="44" r="2.2" fill="${light}"/>`;
  } else {
    // K10+ / K11+ / K20+: a slim auto-empty tower, its dust bag behind the top lid (with the handheld vacuum of the
    // K10+ Pro Combo clipped on its right side).
    s += `<rect x="58" y="10" width="44" height="122" rx="9" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
    s += `<rect x="62" y="14" width="36" height="26" rx="6" fill="${lid}"/>`;
    s += `<rect x="74" y="46" width="12" height="74" rx="6" fill="${seam}" opacity=".9"/>`;
    s += `<circle cx="80" cy="27" r="2.2" fill="${light}"/>`;
    if (combo) {
      s += `<rect x="106" y="22" width="14" height="70" rx="6" fill="${body}" stroke="${edge}" stroke-width="1.5"/>`;
      s += `<rect x="109" y="30" width="8" height="22" rx="3" fill="#9aa0a6" opacity=".6"/>`;
      s += `<path d="M106 92 h14 l4 12 h-22 z" fill="${lid}" stroke="${edge}" stroke-width="1.2"/>`;
    }
  }
  const r = mini ? 44 : 52;
  s += `<g class="${activity === "returning" ? "home" : ""}">${shape(80, 148 - r * 0.5, r)}</g>`;
  return svgDoc(160, 160, s, "", activity === "returning", BASE_BOX);
};
// SwitchBot model ids: the Bluetooth integration (switchbot) reports pySwitchbot's model name, the Cloud one
// (switchbot_cloud) the device type of the SwitchBot API. Lower case → commercial name. The short Cloud types (« K10+ »,
// « S20 »…) are too generic to name the brand on their own: they count only on a SwitchBot platform (see brandOf).
export const SWITCHBOT_MODELS = {
  "k10+ vacuum": "K10+",
  "k10+": "K10+",
  "k10+ pro vacuum": "K10+ Pro",
  "k10+ pro": "K10+ Pro",
  "k10+ pro combo vacuum": "K10+ Pro Combo",
  "robot vacuum cleaner k10+ pro combo": "K10+ Pro Combo",
  "k11+ vacuum": "K11+",
  "robot vacuum cleaner k11 plus": "K11+",
  "k20 vacuum": "K20+ Pro",
  "k20+ pro": "K20+ Pro",
  "robot vacuum cleaner s1": "S1",
  "robot vacuum cleaner s1 plus": "S1 Plus",
  "s10 vacuum": "S10",
  "robot vacuum cleaner s10": "S10",
  "s20 vacuum": "S20",
  "robot vacuum cleaner s20": "S20",
  s20: "S20",
};
// Picture of a SwitchBot model, from its commercial name (the device name only when the model is not one of the table,
// so that a renamed robot keeps its own picture).
export const switchbotPicture = (name, activity = null) => {
  const n = String(name || "");
  const mini = /\bk\d\d/i.test(n);
  const roller = /\bs[12]0\b/i.test(n);
  const base = /\bs20\b/i.test(n) ? "station" : /\bs10\b|s1 plus/i.test(n) ? "squat" : /\bk\d\d\+|\bk11 plus/i.test(n) ? "tower" : null;
  return switchbotSvg({ mini, roller, base, combo: /combo/i.test(n), activity });
};
// A SwitchBot model id that names the brand by itself (« … Vacuum », « Robot Vacuum Cleaner … »).
export const isSwitchbotModel = (m) => Object.hasOwn(SWITCHBOT_MODELS, m) && /vacuum/.test(m);
