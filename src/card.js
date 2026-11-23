// ---------------------------------------------------------------------------
// Full card
// ---------------------------------------------------------------------------
import { DEFAULT_COLLAPSED, accentStyle } from "./integrations.js";
import { ICONS } from "./icons.js";
import { CONSUMABLES, areaUnitOf, esc, findDevice, fmtHours, fmtNum, hours, mapIds, num, resolve, statusClass, svgIcon, tankClass, valid, vectorMapOn } from "./helpers.js";
import { BANNER_STYLE } from "./banner.js";
import { BASE_STYLE } from "./styles.js";
import { ZOOM_KEY } from "./actions.js";
import { VacuumBase } from "./base.js";

export const FULL_STYLE = `
  .content { padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 12px; }
  .hero { display: flex; gap: 12px; align-items: center; }
  .picture { width: 96px; height: 104px; }
  .picture img { filter: drop-shadow(0 4px 8px rgba(0,0,0,.18)); }
  .batt { display: flex; align-items: center; gap: 8px; }
  .batt .pct { font-size: 30px; font-weight: 400; line-height: 1; }
  .batt .pct small { font-size: 14px; margin-left: 2px; color: var(--secondary-text-color); }
  .batt .icon { color: var(--c); }
  .batt .bolt { color: var(--vc-ok); width: 20px; height: 20px; }
  .line .icon { width: 16px; height: 16px; }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 6px; border-radius: 8px;
         background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--primary-text-color); white-space: nowrap;
         max-width: 100%; min-width: 0; box-sizing: border-box; }
  .tag span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tag .icon { width: 14px; height: 14px; color: var(--secondary-text-color); }
  .controls { display: flex; flex-wrap: wrap; gap: 6px; }
  .controls .btn { flex: 1 1 auto; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); margin-bottom: 6px; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-title.toggle { cursor: pointer; user-select: none; }
  .section-title.toggle[aria-expanded="false"] { margin-bottom: 0; }
  .section-title .chevron { margin-left: auto; width: 16px; height: 16px; transition: transform .2s ease; }
  .section-title.toggle[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  .routines { display: flex; flex-wrap: wrap; gap: 6px; }
  .routines .btn { font-weight: 400; padding: 6px 12px 6px 8px; }
  .routines .btn .icon { color: var(--vc-accent); }
  .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 6px; }
  .tiles.two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 6px 10px; border-radius: 10px; min-width: 0;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .tile .k { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tile .k span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .tile .k .icon { width: 14px; height: 14px; color: var(--c, var(--secondary-text-color)); }
  .tile .v { font-size: 14px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
  .tile.warn .v, .tile.crit .v { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color)); }
  .cons { display: grid; grid-template-columns: 18px minmax(0, 1fr) 90px 56px; align-items: center; gap: 2px 8px; font-size: 12px; }
  .cons .icon { color: var(--secondary-text-color); }
  .cons .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cons .v { text-align: right; font-weight: 500; white-space: nowrap; }
  .cons .v.warn, .cons .v.crit { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color)); }
  .cons .nobar { height: 6px; }
  .cons.with-reset { grid-template-columns: 18px minmax(0, 1fr) 90px 56px 28px; }
  .reset { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: 50%;
           background: transparent; color: var(--secondary-text-color); cursor: pointer; padding: 0; }
  .reset:hover { background: var(--secondary-background-color, rgba(127,127,127,.12)); color: var(--vc-accent-text); }
  .reset .icon { width: 18px; height: 18px; }
  .map img { width: 100%; border-radius: 10px; display: block; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .map .crop { overflow: hidden; border-radius: 10px; }
  .map { cursor: zoom-in; }
  .map.vector { border-radius: 10px; padding: 6px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .dock-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .dock-actions .btn { flex: 1 1 auto; }
  .dock-actions .btn .icon { color: var(--vc-accent); }
  .dock-actions .btn.running { background: color-mix(in srgb, var(--vc-active) 16%, transparent); color: color-mix(in srgb, var(--vc-active) 50%, var(--primary-text-color)); }
  .dock-actions .btn.running .icon { color: var(--vc-active); }
  .map .crop img { max-width: none; border-radius: 0; background: none; }
  /* Narrow card (9 of 12 columns in a narrow Sections view, ~240 px): the consumable bars give way to the labels
     (the value keeps its state color), then the picture shrinks and the statistics take one column. */
  @container (max-width: 360px) {
    .cons { grid-template-columns: 18px minmax(0, 1fr) auto; }
    .cons.with-reset { grid-template-columns: 18px minmax(0, 1fr) auto 28px; }
    .cons .bar, .cons .nobar { display: none; }
  }
  @container (max-width: 300px) {
    .picture { width: 72px; height: 80px; }
    .hero { gap: 10px; }
    .tiles.two { grid-template-columns: minmax(0, 1fr); }
  }
  /* Below its 9 columns (a "1fr 1fr" layout-card or grid on a phone, ~156-200 px): the battery keeps its "100 %". */
  @container (max-width: 200px) {
    .picture { width: 48px; height: 56px; }
    .hero { gap: 8px; }
    .batt { gap: 4px; }
    .batt .pct { font-size: 24px; }
  }
`;

export class VacuumCard extends VacuumBase {
  static getConfigElement() {
    return document.createElement("vacuum-card-editor");
  }

  static getStubConfig(hass) {
    const m = hass && resolve(hass);
    const dev = m && (m.devices.find((d) => d.kind === "robot") || m.devices[0]);
    return dev ? { device: dev.id } : {};
  }

  getCardSize() {
    return 8;
  }

  // Below 9 of 12 columns (~240 px in the narrowest Sections view) the hero, the controls and the consumables no
  // longer fit: 9 is the narrowest width the layout holds at.
  getGridOptions() {
    return { columns: 12, min_columns: 9 };
  }

  _render() {
    const { dev, error } = findDevice(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._dev = dev;
    const c = this._config;
    const status = this._status(dev);
    const parts = [this._hero(dev)];
    if (dev.vacuum && c.show_controls !== false) parts.push(`<div class="controls">${this._controls(dev)}</div>`, this._roomPanel(dev));
    if (c.show_routines !== false) parts.push(this._routines(dev));
    if (c.show_dock !== false) parts.push(this._dock(dev));
    if (c.show_consumables !== false) parts.push(this._consumables(dev));
    if (c.show_stats !== false) parts.push(this._stats(dev));
    if (this._showMap(dev)) parts.push(this._mapSection(dev));
    return `<style>${BASE_STYLE}${FULL_STYLE}${this._illustrated() ? BANNER_STYLE : ""}${accentStyle(dev, this._hass)}</style>
      <ha-card>
        ${this._header(dev, status, this._lastClean(dev))}
        <div class="content">${parts.filter(Boolean).join("")}</div>
      </ha-card>`;
  }

  _hero(dev) {
    const e = dev.entities;
    const batt = this._battery(dev);
    const { v, cls } = this._batteryLevel(batt);
    const status = this._status(dev);
    const charging = /charg/.test(status?.state || "") && !/problem|complete/.test(status?.state || "");
    const lines = [this._roomLine(dev)];

    if (statusClass(status?.state) === "active") {
      const pct = num(this._s(e.clean_percent));
      // iRobot: the current clean is in the vacuum's attributes (minutes, and m² with the metric unit system, ft²
      // with the US customary one); the Braava 240 has runtime_minutes.
      const va = this._s(dev.vacuum)?.attributes || {};
      const areaSensor = this._s(e.cleaning_area);
      const sensorArea = num(areaSensor);
      const attrArea = sensorArea === null && Number.isFinite(va.cleaned_area) && va.cleaned_area > 0 ? va.cleaned_area : null;
      const area = sensorArea ?? attrArea;
      const areaUnit =
        sensorArea !== null ? areaUnitOf(areaSensor) : this._hass.config?.unit_system?.length === "mi" ? "ft²" : "m²";
      const attrMin = Number.isFinite(va.cleaning_time) && va.cleaning_time > 0 ? va.cleaning_time : Number.isFinite(va.runtime_minutes) && va.runtime_minutes > 0 ? va.runtime_minutes : null;
      const time = hours(this._s(e.cleaning_time)) ?? (attrMin !== null ? attrMin / 60 : null);
      const bits = [pct ? `${this._t("progress")} ${Math.round(pct)} %` : null, area !== null ? `${fmtNum(area, 1, this._locale())} ${areaUnit}` : null, time !== null ? fmtHours(time, this._locale()) : null];
      if (bits.some(Boolean))
        lines.push(`<div class="line clickable" role="button" tabindex="0" data-entity="${esc(e.clean_percent || e.cleaning_area || dev.vacuum || "")}">${svgIcon(ICONS.clock)}<span>${esc(bits.filter(Boolean).join(" · "))}</span></div>`);
    }

    lines.push(this._errorLine(dev));
    // iRobot Braava / Combo: water tank of the robot, in percent.
    const tank = this._s(e.tank_level);
    if (valid(tank) && num(tank) !== null)
      lines.push(`<div class="line clickable" role="button" tabindex="0" data-entity="${esc(tank.entity_id)}">${svgIcon(ICONS.water)}<span>${esc(`${this._t("robot_tank")} · ${Math.round(num(tank))} %`)}</span></div>`);

    if (this._config.show_modes !== false) {
      const tags = [];
      const tag = (id, icon, text) => (text ? `<span class="tag clickable" role="button" tabindex="0" data-entity="${esc(id)}">${svgIcon(icon)}<span>${esc(text)}</span></span>` : "");
      const mode = this._s(e.cleaning_mode);
      if (valid(mode)) tags.push(tag(mode.entity_id, ICONS.mode, this._fmt(mode)));
      const vac = this._s(dev.vacuum);
      const fan = vac?.attributes?.fan_speed;
      if (fan) tags.push(tag(vac.entity_id, ICONS.fan, this._fmt(vac, "v_", fan)));
      // Braava 240: the attached pad, and the wetness of that kind of pad (none for the dry pads); "no pad" is an alert.
      const pad = this._s(e.pad_type);
      if (valid(pad) && pad.state !== "no_pad") tags.push(tag(pad.entity_id, ICONS.pad, this._fmt(pad)));
      const wetness = valid(pad) ? this._s(e[`wetness_${pad.state}`]) : null;
      const mop = this._s(e.mop_intensity) || this._s(e.water_flow) || wetness;
      if (valid(mop)) tags.push(tag(mop.entity_id, ICONS.water, this._fmt(mop)));
      const route = this._s(e.cleaning_route) || this._s(e.mop_mode);
      if (valid(route)) tags.push(tag(route.entity_id, ICONS.route, this._fmt(route)));
      if (tags.length) lines.push(`<div class="tags">${tags.join("")}</div>`);
    }

    return `<div class="hero">
      ${this._illustrated() ? "" : this._pictureBlock(dev, status)}
      <div class="info">
        ${
          batt
            ? `<div class="batt clickable ${cls}" role="button" tabindex="0" data-entity="${esc(batt.entity_id)}">
                 ${svgIcon(ICONS.battery)}<span class="pct">${v === null ? "—" : Math.round(v)}<small>%</small></span>
                 ${charging ? svgIcon(ICONS.bolt, "bolt") : ""}
               </div>
               <div class="bar ${cls}"><div style="width:${Math.max(0, Math.min(100, v ?? 0))}%"></div></div>`
            : ""
        }
        ${lines.join("")}
      </div>
    </div>`;
  }

  _routines(dev) {
    const prefix = dev.rawName || dev.name;
    const buttons = (dev.extra.button || []).map((id) => this._s(id)).filter((s) => s && s.state !== "unavailable");
    if (!buttons.length) return "";
    const items = buttons.map((s) => {
      let name = s.attributes?.friendly_name || s.entity_id;
      for (const p of [prefix, dev.name]) if (p && name.startsWith(`${p} `)) name = name.slice(p.length + 1);
      return { id: s.entity_id, name };
    });
    items.sort((a, b) => a.name.localeCompare(b.name));
    // A routine runs on the robot: none while it is unavailable.
    const off = dev.vacuum && this._offline(dev);
    return `<div>
      ${this._sectionTitle("routines", ICONS.routine, this._t("routines"))}
      ${
        this._isCollapsed("routines")
          ? ""
          : `<div class="routines">${items
              .map(
                (r) =>
                  `<button class="btn${off ? " disabled" : ""}" data-action="routine" data-entity="${esc(r.id)}" data-label="${esc(r.name)}"${off ? " disabled" : ""}>${svgIcon(
                    ICONS.routine,
                  )}<span>${esc(r.name)}</span></button>`,
              )
              .join("")}</div>`
      }
    </div>`;
  }

  // Collapsible sections: `collapsed` lists the sections folded by default (stats and dock unless
  // set); a click on a section title folds or unfolds it, and a click elsewhere on the page folds it back.
  _isCollapsed(key) {
    if (this._toggled?.has(key)) return this._toggled.get(key);
    return this._defaultCollapsed(key);
  }

  _defaultCollapsed(key) {
    // A dock reporting a problem is always shown unfolded (it can still be folded by hand).
    if (key === "dock" && this._dev && this._dockProblem(this._dev)) return false;
    // The always_folded map follows the job: unfolded while cleaning, folded otherwise (either still foldable by hand).
    if (key === "map") return this._dev ? !this._isCleaning(this._dev) : true;
    const c = this._config.collapsed ?? DEFAULT_COLLAPSED;
    return (Array.isArray(c) ? c : [c]).includes(key);
  }

  _sectionTitle(key, icon, label) {
    const closed = this._isCollapsed(key);
    return `<div class="section-title toggle" role="button" tabindex="0" data-action="toggle_section" data-section="${key}" aria-expanded="${!closed}">${svgIcon(icon)}<span>${esc(
      label
    )}</span>${svgIcon(ICONS.chevron_down, "chevron")}</div>`;
  }

  _tile(id, icon, label, value, cls = "") {
    return `<div class="tile clickable ${cls}" role="button" tabindex="0" data-entity="${esc(id || "")}"><div class="k">${svgIcon(icon)}<span>${esc(label)}</span></div><div class="v">${esc(value)}</div></div>`;
  }

  _dock(dev) {
    const d = dev.dock;
    const tiles = [];
    const dockErr = this._s(d.dock_error);
    if (valid(dockErr)) {
      const ok = dockErr.state === "ok";
      tiles.push(this._tile(dockErr.entity_id, ICONS.dock, this._t("dock_state"), ok ? this._t("ok") : this._fmt(dockErr, "e_"), ok ? "ok" : "crit"));
    }
    const flag = (key, icon, label, problemText) => {
      const s = this._s(d[key]);
      if (!s) return;
      const on = s.state === "on";
      tiles.push(this._tile(s.entity_id, icon, this._t(label), on ? this._t(problemText) : this._t("ok"), on ? "crit" : "ok"));
    };
    flag("clean_box_empty", ICONS.water, "clean_water", "empty");
    flag("dirty_box_full", ICONS.water_off, "dirty_water", "full");
    flag("clean_fluid_empty", ICONS.fluid, "cleaning_fluid", "empty");
    // iRobot Combo j9+: water tank of the Clean Base, in percent.
    const dockTank = this._s(dev.entities.dock_tank_level);
    const tankPct = valid(dockTank) ? num(dockTank) : null;
    if (tankPct !== null)
      tiles.push(this._tile(dockTank.entity_id, ICONS.water, this._t("clean_water"), `${Math.round(tankPct)} %`, tankClass(tankPct)));
    const dust = this._s(d.dust_collection_mode);
    if (valid(dust)) tiles.push(this._tile(dust.entity_id, ICONS.bin, this._t("dust_mode"), this._fmt(dust)));
    // Drying: the remaining time only refreshes on the next poll of the integration (about 30 s after
    // the dryer starts), so the tile also shows while the drying switch or status is on.
    const dry = this._s(d.mop_drying_remaining_time);
    const dryH = hours(dry);
    const drying = [d.mop_drying, d.mop_drying_status].some((id) => this._isOn(id));
    if (dryH > 0 || drying)
      tiles.push(this._tile(dry?.entity_id || d.mop_drying, ICONS.fan, this._t("drying"), dryH > 0 ? fmtHours(dryH, this._locale()) : this._t("running"), "active"));
    const actions = this._dockActions(dev);
    if (!tiles.length && !actions) return "";
    return `<div>
      ${this._sectionTitle("dock", ICONS.dock, this._t("station"))}
      ${this._isCollapsed("dock") ? "" : `${tiles.length ? `<div class="tiles">${tiles.join("")}</div>` : ""}${actions}`}
    </div>`;
  }

  _dockProblem(dev) {
    const d = dev.dock;
    const err = this._s(d.dock_error);
    if (valid(err) && err.state !== "ok") return true;
    return ["clean_box_empty", "dirty_box_full", "clean_fluid_empty"].some((k) => this._s(d[k])?.state === "on");
  }

  // Dock action switches of the integration: on while the action runs, the dock stops it on its own.
  _dockActions(dev) {
    if (this._config.show_controls === false) return "";
    const btns = [
      ["dust_emptying", ICONS.bin, "empty_bin"],
      ["mop_washing", ICONS.water, "wash_mop"],
      ["mop_drying", ICONS.fan, "dry_mop"],
    ]
      .map(([key, icon, label]) => {
        const s = this._s(dev.dock[key]);
        if (!s || s.state === "unavailable") return "";
        const on = this._isOn(s.entity_id);
        return `<button class="btn ${on ? "running" : ""}" title="${esc(this._t(on ? "stop_action" : "start_action", { name: this._t(label) }))}"
          data-action="dock_toggle" data-entity="${esc(s.entity_id)}">${svgIcon(on ? ICONS.stop : icon)}<span>${esc(this._t(label))}</span></button>`;
      })
      .filter(Boolean);
    return btns.length ? `<div class="dock-actions">${btns.join("")}</div>` : "";
  }

  // Consumables the device exposes, each with its remaining life: { s, label, icon, resetKey, pct, text, cls }
  // (cls: "crit" worn out, "warn" under 10 %, or 10 h without a known lifetime, "ok", "" unknown).
  _consumableLevels(dev) {
    const out = [];
    for (const [key, label, icon, life, resetKey] of CONSUMABLES) {
      const s = this._s(dev.entities[key]) || this._s(dev.dock[key]);
      if (!s) continue;
      let pct = null;
      let text;
      let cls;
      if (life === "pct") {
        pct = num(s);
        text = pct === null ? "—" : `${Math.round(pct)} %`;
        cls = pct === null ? "" : pct <= 0 ? "crit" : pct < 10 ? "warn" : "ok";
      } else {
        const h = hours(s);
        const lifetime = dev.kind === "robot" ? life : null;
        if (lifetime && h !== null) pct = (100 * h) / lifetime;
        text = fmtHours(h, this._locale());
        cls = h === null ? "" : h <= 0 ? "crit" : (pct !== null ? pct < 10 : h < 10) ? "warn" : "ok";
      }
      out.push({ s, label, icon, resetKey, pct, text, cls });
    }
    return out;
  }

  _consumables(dev) {
    const rows = [];
    const resets = this._config.show_controls !== false && CONSUMABLES.some(([key, , , , r]) => (dev.entities[key] || dev.dock[key]) && this._resetId(dev, r));
    for (const { s, label, icon, resetKey, pct, text, cls } of this._consumableLevels(dev)) {
      rows.push(`
        ${svgIcon(icon)}<span class="lbl clickable" role="button" tabindex="0" data-entity="${esc(s.entity_id)}">${esc(this._t(label))}</span>
        ${pct !== null ? `<div class="bar ${cls}"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>` : `<div class="nobar"></div>`}
        <span class="v clickable ${cls}" role="button" tabindex="0" data-entity="${esc(s.entity_id)}">${esc(text)}</span>
        ${resets ? this._resetButton(dev, resetKey, label) : ""}`);
    }
    if (!rows.length) return "";
    return `<div>
      ${this._sectionTitle("consumables", ICONS.brush, this._t("consumables"))}
      ${this._isCollapsed("consumables") ? "" : `<div class="cons ${resets ? "with-reset" : ""}">${rows.join("")}</div>`}
    </div>`;
  }

  _resetId(dev, key) {
    const id = key && (dev.entities[key] || dev.dock[key]);
    const s = this._s(id);
    return s && s.state !== "unavailable" ? id : null;
  }

  // Reset button of a consumable, when the integration exposes one; an empty cell keeps the grid aligned.
  _resetButton(dev, key, label) {
    const id = this._resetId(dev, key);
    if (!id) return `<span></span>`;
    return `<button class="reset" title="${esc(this._t("reset"))}" data-action="reset" data-entity="${esc(id)}" data-label="${esc(this._t(label))}">${svgIcon(ICONS.reset)}</button>`;
  }

  _stats(dev) {
    const e = dev.entities;
    const tiles = [];
    // Counters still at 0 (device never used, or not reporting them) are left out, and the whole
    // section when nothing is left.
    const area = this._s(e.cleaning_area);
    const time = this._s(e.cleaning_time);
    if ((valid(area) && num(area)) || (valid(time) && num(time))) {
      const bits = [valid(area) ? `${fmtNum(num(area), 1, this._locale())} ${areaUnitOf(area)}` : null, valid(time) ? fmtHours(hours(time), this._locale()) : null].filter(Boolean);
      tiles.push(this._tile((area || time).entity_id, ICONS.clock, this._t("last_clean"), bits.join(" · ")));
    }
    const count = this._s(e.total_cleaning_count);
    if (valid(count) && num(count)) tiles.push(this._tile(count.entity_id, ICONS.count, this._t("total_count"), fmtNum(num(count), 0, this._locale())));
    // Braava 240: successful / failed missions and the average mission time.
    const ok = this._s(e.successful_missions);
    if (valid(ok) && num(ok)) tiles.push(this._tile(ok.entity_id, ICONS.count, this._t("successful_count"), fmtNum(num(ok), 0, this._locale())));
    const ko = this._s(e.failed_missions);
    if (valid(ko) && num(ko)) tiles.push(this._tile(ko.entity_id, ICONS.alert, this._t("failed_count"), fmtNum(num(ko), 0, this._locale())));
    const avg = this._s(e.average_mission_time);
    if (valid(avg) && num(avg)) tiles.push(this._tile(avg.entity_id, ICONS.clock, this._t("average_clean"), fmtHours(hours(avg), this._locale())));
    const tArea = this._s(e.total_cleaning_area);
    if (valid(tArea) && num(tArea)) tiles.push(this._tile(tArea.entity_id, ICONS.area, this._t("total_area"), `${fmtNum(num(tArea), 0, this._locale())} ${areaUnitOf(tArea)}`));
    const tTime = this._s(e.total_cleaning_time);
    if (valid(tTime) && num(tTime)) tiles.push(this._tile(tTime.entity_id, ICONS.clock, this._t("total_time"), fmtHours(hours(tTime), this._locale())));
    if (!tiles.length) return "";
    return `<div>
      ${this._sectionTitle("stats", ICONS.stats, this._t("statistics"))}
      ${this._isCollapsed("stats") ? "" : `<div class="tiles two">${tiles.join("")}</div>`}
    </div>`;
  }

  // The robot is out on a cleaning job (used for the map and its folded state).
  _isCleaning(dev) {
    return this._s(dev.vacuum)?.state === "cleaning" || this._s(dev.entities.in_cleaning)?.state === "on";
  }

  // show_map: true / "always", false / "never", "always_folded" (shown as a collapsible section, folded while
  // the robot is not cleaning), or "cleaning" (default) to show it only during a cleaning job.
  _showMap(dev) {
    const m = this._config.show_map ?? "cleaning";
    if (m === true || m === "always" || m === "always_folded") return true;
    if (m !== "cleaning") return false;
    return this._isCleaning(dev);
  }

  // "always_folded": the map is wrapped in a collapsible "Map" section (default folded when idle, unfolded while
  // cleaning); the other modes draw it plain, with no header.
  _mapFoldable() {
    return this._config.show_map === "always_folded";
  }

  // A map is available to draw (vector map, or at least one camera/image with a picture).
  _hasMap(dev) {
    if (vectorMapOn(dev, this._config)) return true;
    return mapIds(dev, this._config).some((id) => this._s(id)?.attributes?.entity_picture);
  }

  _mapSection(dev) {
    if (!this._mapFoldable()) return this._map(dev);
    // No dangling header when there is no map, and no vector map mounted while the section is folded.
    if (!this._hasMap(dev)) return "";
    return `<div>
      ${this._sectionTitle("map", ICONS.map, this._t("map"))}
      ${this._isCollapsed("map") ? "" : this._map(dev)}
    </div>`;
  }

  _map(dev) {
    if (vectorMapOn(dev, this._config)) {
      const attrs = `class="map vector clickable" role="button" tabindex="0" data-action="zoom_vector" data-entity="${esc(dev.vacuum)}" title="${esc(this._t("map"))}"`;
      return `<div ${attrs}><div data-vector-map="${esc(dev.vacuum)}"></div></div>`;
    }
    const maps = mapIds(dev, this._config).map((id) => this._s(id)).filter((s) => s?.attributes?.entity_picture);
    if (!maps.length) return "";
    const selected = this._s(dev.entities.selected_map)?.state;
    const map = (selected && maps.find((s) => (s.attributes.friendly_name || "").endsWith(selected))) || maps[0];
    const img = `<img alt="${esc(this._t("map"))}" data-map="${esc(map.entity_id)}"`;
    const crop = this._mapCrop(map.entity_id);
    const attrs = `class="map clickable" role="button" tabindex="0" data-action="zoom_map" data-entity="${esc(map.entity_id)}" title="${esc(this._t("map"))}"`;
    if (!crop) return `<div ${attrs}>${img}></div>`;
    return `<div ${attrs}><div class="crop" style="aspect-ratio:${crop.ratio}">${img} style="${crop.img}"></div></div>`;
  }

  // crop: { top, bottom, left, right } in pixels of the map image. The image size is only known once
  // it has loaded (see _onLoad), so until then the map is shown uncropped.
  _mapCrop(id) {
    const crop = this._config.crop || {};
    const [t, b, l, r] = ["top", "bottom", "left", "right"].map((k) => Math.max(0, Number(crop[k]) || 0));
    const size = this._mapSizes?.[id];
    if (!size || !(t || b || l || r)) return null;
    if (size.w - l - r <= 0 || size.h - t - b <= 0) {
      if (!this._cropWarned) console.warn(`vacuum-card: crop is larger than the map image (${size.w} × ${size.h} px)`);
      this._cropWarned = true;
      return null;
    }
    const w = size.w - l - r;
    const h = size.h - t - b;
    const pct = (v) => `${((100 * v) / w).toFixed(4)}%`;
    return { ratio: `${w} / ${h}`, w, h, img: `width:${pct(size.w)};max-width:none;margin-left:-${pct(l)};margin-top:-${pct(t)};display:block` };
  }

  // Enlarged map, appended to the document body so that it is not clipped or offset by the card
  // (themes with blur or transforms). Closes on click or Escape. A modal dialog for screen readers: it takes the
  // focus and gives it back on close. Its picture gets the new map frames like the card's (see _syncMaps).
  _zoomMap(id) {
    const s = this._s(id);
    const url = s?.attributes?.entity_picture;
    if (!url) return;
    const size = this._mapSizes?.[id];
    const crop = this._mapCrop(id);
    const ratio = crop ? crop.w / crop.h : size ? size.w / size.h : 16 / 9;
    const overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", this._t("map"));
    overlay.tabIndex = -1;
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82);cursor:zoom-out;padding:16px;box-sizing:border-box";
    const box = document.createElement("div");
    box.style.cssText = `width:min(96vw, calc(92vh * ${ratio}));aspect-ratio:${ratio};overflow:hidden;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.5)`;
    const img = document.createElement("img");
    img.setAttribute("src", url);
    img.dataset.map = id;
    img.alt = this._t("map");
    img.style.cssText = crop ? crop.img : "width:100%;height:100%;object-fit:contain;display:block";
    box.appendChild(img);
    overlay.appendChild(box);
    // The element that had the focus (the map button, in the card's shadow root), focused again on close.
    const opener = this._closeZoom ? this._zoomOpener : this.shadowRoot.activeElement || document.activeElement;
    this._closeZoom?.();
    const close = () => {
      overlay.remove();
      window.removeEventListener("keydown", onKey);
      if (this._closeZoom === close) {
        this._closeZoom = null;
        this._zoomOverlay = null;
        this._zoomImg = null;
        this._mapNext?.delete(ZOOM_KEY);
        if (this.isConnected) opener?.focus?.({ preventScroll: true });
      }
    };
    this._closeZoom = close;
    this._zoomOverlay = overlay;
    this._zoomImg = img;
    this._zoomOpener = opener;
    // Tab stays on the dialog (nothing in it to move to); Escape closes it.
    const onKey = (ev) => {
      if (ev.key === "Escape") close();
      else if (ev.key === "Tab") ev.preventDefault?.();
    };
    overlay.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    overlay.focus?.({ preventScroll: true });
  }
}
