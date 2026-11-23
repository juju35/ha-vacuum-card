import { IMAGES, colorOf } from "./illustrations.js";
import { MODEL_NAMES, activityOf, autoSvg, deviceTypeOf, presetDevice, svgUri } from "./models.js";
import { PENDING_MS, brandFor } from "./integrations.js";
import { ICONS } from "./icons.js";
import { STRINGS } from "./i18n/strings.js";
import { VECTOR_MAP, ago, esc, findDevice, hours, intlLocale, lang, num, pretty, statusClass, svgIcon, t, tankClass, valid } from "./helpers.js";
import { vcIsNight, vcPlace, vcSceneSvg } from "./banner.js";
import { BASE_STYLE, DIALOG_STYLE } from "./styles.js";
import { CONFIRM_GUARD_MS, DATA_IMGS, imgTag, isOutside, morph, watchOutside } from "./dom.js";
import { FOCUS_SELECTOR, ROOM_ADAPTERS, VACUUM_ACTIONS, VACUUM_FEATURES, ZOOM_KEY, focusKey, roomItems, sortRooms } from "./actions.js";

export class VacuumBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._html = "";
    this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
    // No rewrite of the card between the press and the release: Home Assistant updates the card several times a
    // second, and a rewrite under the pointer replaces the element pressed, so that the click lands on the card itself
    // and does nothing. The pending render is done once released (after the click). The focus is only kept across
    // rewrites for the keyboard: put back after a mouse click or a tap, it would draw the focus ring.
    this.shadowRoot.addEventListener("pointerdown", () => {
      this._byPointer = true;
      // No focus ring after a tap or a click: Home Assistant gives the focus back to the element that opened its
      // more-info dialog when it closes, and the browser would then draw the ring as for the keyboard.
      this.toggleAttribute?.("pointer", true);
      this._pressing = true;
      window.addEventListener("pointerup", this._onPressEnd, true);
      window.addEventListener("pointercancel", this._onPressEnd, true);
    });
    this._onPressEnd = () => {
      window.removeEventListener("pointerup", this._onPressEnd, true);
      window.removeEventListener("pointercancel", this._onPressEnd, true);
      setTimeout(() => {
        this._pressing = false;
        if (this._dirty) this._update();
      }, 0);
    };
    // Enter / Space on an element with the button role (tile, section title, chip…) acts as a click, as on a <button>
    // (which clicks on its own: left alone).
    this.shadowRoot.addEventListener("keydown", (ev) => {
      this._byPointer = false;
      this.toggleAttribute?.("pointer", false);
      if ((ev.key !== "Enter" && ev.key !== " ") || ev.target?.getAttribute?.("role") !== "button") return;
      ev.preventDefault();
      ev.target.click();
    });
    // Escape closes the confirmation popup (as Cancel). Listened on the window while the popup is open: a re-render
    // or a click on its text takes the focus out of the card.
    this._onKey = (ev) => {
      if (ev.key !== "Escape" || !this._confirm) return;
      ev.stopPropagation();
      this._closeConfirm();
    };
  }

  // Home Assistant pushes a new hass on every state change of the whole instance: the card is only
  // rebuilt when something it shows changed (see _deps).
  set hass(hass) {
    this._hass = hass;
    const deps = this._deps();
    const prev = this._lastDeps;
    if (deps && prev && deps.length === prev.length && deps.every((d, i) => d === prev[i])) return;
    this._lastDeps = deps;
    this._update();
  }

  // What a render reads from hass: the registries, the language, the unit system, the state objects of the device's
  // entities (HA replaces a state object whenever its state or attributes change) and the relative
  // "last clean" time, which moves on its own. null (no device found): always render.
  _deps() {
    const h = this._hass;
    if (!h || !this._config) return null;
    const { dev } = findDevice(h, this._config);
    if (!dev) return null;
    // map_entity (Xiaomi Cloud Map Extractor, Valetudo…) belongs to no device: its new map / rotated token re-renders too.
    const ids = [dev.vacuum, ...Object.values(dev.entities), ...Object.values(dev.dock), ...Object.values(dev.extra).flat(), this._config.map_entity];
    return [h.entities, h.devices, h.language, h.locale, h.localize, h.formatEntityState, h.themes?.darkMode, h.config?.unit_system?.length, this._lastClean(dev), ...ids.map((id) => h.states[id])];
  }

  get hass() {
    return this._hass;
  }

  // A click elsewhere on the page folds the sections back to their defaults (as in ha-carburants-france).
  // Folded on the release, not on the press: folding on press would shift the layout under the pointer before the click.
  connectedCallback() {
    Promise.resolve().then(() => this._fitAfterCard());
    // Clicks inside a dialog (the more-info opened from the card) leave the card as it is.
    this._onOutside ??= (ev) => {
      if ((!this._toggled?.size && !this._confirm) || !isOutside(this, ev)) return;
      this._toggled = new Map();
      if (this._confirm) this._closeConfirm();
      else this._update();
    };
    (this._outside ??= watchOutside(this, (ev) => this._onOutside(ev))).on();
    // Back on the page after leaving it: rendered again in its default state.
    if (this._hass && this._config) this._update();
    // No new map frame is loaded while the card is off-screen or the tab hidden (see _mapsPaused); the latest one
    // is loaded as soon as the card can be seen again.
    this._onVisibility ??= () => this._syncMaps();
    document.addEventListener("visibilitychange", this._onVisibility);
    // A new width: the status pill is fitted again (in the next frame, and only for a new width).
    if (typeof ResizeObserver === "function") {
      this._resize ??= new ResizeObserver((entries) => {
        const w = Math.round(entries.at(-1).contentRect.width);
        if (w === this._fitWidth) return;
        this._fitWidth = w;
        cancelAnimationFrame(this._fitFrame);
        this._fitFrame = requestAnimationFrame(() => this._fitPill());
      });
      this._resize.observe(this);
    }
    document.fonts?.ready?.then(() => this._fitPill());
    if (typeof IntersectionObserver === "function") {
      this._observer ??= new IntersectionObserver((entries) => {
        this._offscreen = !entries.at(-1).isIntersecting;
        this._syncMaps();
      });
      this._observer.observe(this);
    }
    // "Last clean 5 minutes ago" moves on its own: re-checked every minute while the card is on the page (set hass
    // only rebuilds the card when the text, part of _deps, changed).
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this._hass) this.hass = this._hass;
    }, 60000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._tick = null;
    this._outside?.off();
    this._pressing = false;
    window.removeEventListener("pointerup", this._onPressEnd, true);
    window.removeEventListener("pointercancel", this._onPressEnd, true);
    // Left (another dashboard view, a conditional card hidden): back to the defaults, so that the card does not come
    // back unfolded or with its popup open.
    this._toggled = new Map();
    this._confirm = null;
    window.removeEventListener("keydown", this._onKey);
    document.removeEventListener("visibilitychange", this._onVisibility);
    this._observer?.disconnect();
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
    clearTimeout(this._pendingTimer);
    this._closeZoom?.();
  }

  // Service call whose failure is already reported by Home Assistant (toast): the rejection is handled here so
  // that it does not end up as "Uncaught (in promise)". `onError` undoes what the card showed meanwhile.
  _call(domain, service, data, onError) {
    return Promise.resolve(this._hass.callService(domain, service, data)).catch(() => onError?.());
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = { ...config };
    // show_title / show_subtitle: the header's title / subtitle, hidden by the stylesheet
    this.toggleAttribute?.("hide-title", config.show_title === false);
    this.toggleAttribute?.("hide-subtitle", config.show_subtitle === false);
    this._html = "";
    this._lastDeps = null;
    // vacuum-map-card may be defined after this card's first render (resources load in any order)
    if (!this._vectorWait && config.vector_map !== false && !customElements.get?.(VECTOR_MAP) && customElements.whenDefined) {
      this._vectorWait = customElements.whenDefined(VECTOR_MAP).then(() => this._update());
    }
    this._update();
  }

  _t(key, vars) {
    return t(this._hass, this._config, key, vars);
  }

  _locale() {
    return intlLocale(this._hass, this._config);
  }

  _s(id) {
    return id ? this._hass.states[id] : undefined;
  }

  _update() {
    if (!this._hass || !this._config) return;
    if (this._pressing) {
      this._dirty = true;
      return;
    }
    this._dirty = false;
    let html = this._render();
    if (this._confirm) {
      html = html.replace(/<ha-card>([\s\S]*)<\/ha-card>\s*$/, (_, inner) => `<ha-card class="dialog-open">${inner}${this._confirmHtml()}</ha-card>`);
    }
    if (html !== this._html) {
      // The popup keeps its focus across the rewrite (OK, or Cancel when the user moved to it).
      const focused = this._confirm && this.shadowRoot.activeElement?.dataset?.action;
      // Otherwise, the element of the card that has the focus (keyboard user) gets it back once rewritten.
      const kept = this._confirm || this._byPointer ? null : this._focusedSpot();
      this._html = html;
      morph(this.shadowRoot, html);
      this._fitPill();
      this._fitAfterCard();
      this._placeImages();
      this._placeMaps();
      this._placeVectorMap();
      if (kept) this._restoreFocus(kept);
      if (this._confirm) {
        const sel = focused === "confirm_cancel" ? '[data-action="confirm_cancel"]' : ".modal .primary";
        // preventScroll: an update while the popup is open must not bring a scrolled page back to the card.
        this.shadowRoot.querySelector(sel)?.focus({ preventScroll: true });
      }
    }
    this._syncMaps();
    if (this._vectorMap) this._vectorMap.hass = this._hass;
  }

  // <ha-card> (Lit) draws its slot a microtask after it is created: until then the card's content has no size, and the
  // status pill measured then would take the wrong line (the card then changed height once measured again). A new
  // <ha-card> is measured once more as soon as it has rendered, before the frame is painted.
  // Rendered before the card is on the page, <ha-card> is only upgraded once connected: called again then (see
  // connectedCallback).
  _fitAfterCard() {
    const card = this.shadowRoot?.querySelector?.("ha-card");
    if (!card?.updateComplete || card === this._fitCard) return;
    this._fitCard = card;
    card.updateComplete?.then?.(() => this._fitPill());
  }

  // The status pill goes right after the title only when the whole title and the pill's whole label fit on that row;
  // otherwise it takes a line of its own under the subtitle (.titles.below, the subtitle cut to one line). In the
  // banner (where that line may run over the picture), when the titles still run below the top of the ground strip or
  // out of the banner, and in the classic header when the label does not fit even alone, the pill keeps its dot alone,
  // beside the title (.titles.dotonly). Measured in fractional pixels.
  _fitPill() {
    for (const t of this.shadowRoot?.querySelectorAll?.(".titles") || []) {
      const row = t.querySelector(".trow");
      const chips = row ? [...row.querySelectorAll(":scope > .chip")] : [];
      if (!chips.length || !row.getBoundingClientRect) continue;
      t.classList.remove("below", "dotonly");
      const name = row.querySelector(":scope > .name");
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widths = chips.map((c) => c.getBoundingClientRect().width);
      let need = -gap;
      if (name && getComputedStyle(name).display !== "none") {
        name.style.flex = "none";
        need = name.getBoundingClientRect().width;
        name.style.flex = "";
      }
      for (const w of widths) need += gap + w;
      const room = row.getBoundingClientRect().width + 0.01;
      if (need <= room) continue;
      t.classList.add("below");
      const banner = t.closest(".banner");
      const cut = !banner && widths.some((w) => w > room);
      let out = false;
      if (banner) {
        const b = banner.getBoundingClientRect();
        const floor = b.bottom - (banner.querySelector(".vc-ground")?.getBoundingClientRect().height ?? 10) + 0.5;
        out = [...t.querySelectorAll(".name, .line2, .titles > .sub, .chip")].some((e) => {
          const r = e.getBoundingClientRect();
          return r.height && (r.bottom > floor || r.top < b.top - 0.5 || r.right > b.right + 0.5);
        });
      }
      if (cut || out) t.classList.replace("below", "dotonly");
    }
  }

  // The vacuum-map-card element outlives the renders, as the map pictures do: moved back into each new render, it
  // keeps its subscription (it only ends a few seconds after leaving the page) and its drawing.
  _placeVectorMap() {
    // Kept in place by the patch (see isVectorSlot), or a new slot to put it in.
    const slot = this.shadowRoot.querySelector("[data-vector-map]");
    const kept = !slot && this._vectorMap && this.shadowRoot.contains(this._vectorMap);
    if (!slot && !kept) return;
    const config = this._vectorMapConfig(slot.dataset.vectorMap);
    this._vectorMap ??= document.createElement(VECTOR_MAP);
    const key = JSON.stringify(config);
    if (key !== this._vectorKey) {
      this._vectorKey = key;
      this._vectorMap.setConfig(config);
    }
    this._vectorMap.hass = this._hass;
    if (slot) slot.replaceWith(this._vectorMap);
  }

  _vectorMapConfig(entity) {
    return { ...(this._config.vector_map_options || {}), entity, embedded: true };
  }

  // The focused element of the card, as what identifies it in the next render: its tag and data attributes, and its
  // rank among the elements that share them (the label and the value of a consumable open the same entity). null: the
  // focus is elsewhere (more-info dialog, another card) or on an element that cannot be found again.
  _focusedSpot() {
    const el = this.shadowRoot.activeElement;
    if (!el?.dataset) return null;
    const key = focusKey(el);
    if (!key) return null;
    const index = this._focusables(key).indexOf(el);
    return index < 0 ? null : { key, index };
  }

  _focusables(key) {
    return [...this.shadowRoot.querySelectorAll(FOCUS_SELECTOR)].filter((n) => focusKey(n) === key);
  }

  // preventScroll: a state update must not bring a scrolled page back to the card.
  _restoreFocus({ key, index }) {
    this._focusables(key)[index]?.focus({ preventScroll: true });
  }

  // Moves the inlined pictures kept from the previous render into the new one, or gives them their src once.
  _placeImages() {
    const kept = this._imgNodes || new Map();
    this._imgNodes = new Map();
    for (const img of this.shadowRoot.querySelectorAll("img[data-img]")) {
      const key = `${img.dataset.img}|${img.className}`;
      // Kept in place by the patch: it already has its picture.
      if (img.hasAttribute("src")) {
        this._imgNodes.set(key, img);
        continue;
      }
      const old = kept.get(key);
      if (old && !old.isConnected) {
        kept.delete(key);
        img.replaceWith(old);
        this._imgNodes.set(key, old);
      } else {
        img.src = DATA_IMGS[img.dataset.img];
        this._imgNodes.set(key, img);
      }
    }
  }

  // The map <img> outlives the renders, like the inlined pictures: a new node has no height until its picture has
  // loaded, which would collapse the card.
  _placeMaps() {
    const kept = this._mapNodes || new Map();
    this._mapNodes = new Map();
    for (const img of this.shadowRoot.querySelectorAll("img[data-map]")) {
      const id = img.dataset.map;
      const old = kept.get(id);
      if (old && old !== img && !old.isConnected) {
        old.style.cssText = img.style.cssText;
        old.alt = img.alt;
        img.replaceWith(old);
        this._mapNodes.set(id, old);
      } else {
        // Map size for the crop: read it from the image itself, each time a picture has loaded.
        if (!img._vcLoad) {
          img._vcLoad = true;
          img.addEventListener("load", (ev) => this._onLoad(ev));
        }
        this._mapNodes.set(id, img);
      }
    }
  }

  // The map URL can change on every frame and is left out of the HTML: the next picture is loaded aside and only given
  // to the <img> once decoded, as an <img> still loading would show nothing if a render moved it (see _placeMaps).
  // The enlarged map (see _zoomMap) follows the frames the same way, under its own key.
  _syncMaps() {
    if (this._mapsPaused()) return;
    this._mapNext ??= new Map();
    const targets = [...(this._mapNodes || [])].map(([id]) => [id, id]);
    if (this._zoomImg) targets.push([ZOOM_KEY, this._zoomImg.dataset.map]);
    const nodeOf = (key, id) => (key === ZOOM_KEY ? this._zoomImg : this._mapNodes.get(id));
    for (const [key, id] of targets) {
      const img = nodeOf(key, id);
      const url = this._s(id)?.attributes?.entity_picture;
      if (!url || img.getAttribute("src") === url) continue;
      if (!img.hasAttribute("src")) {
        img.setAttribute("src", url);
        continue;
      }
      if (this._mapNext.get(key)?.getAttribute("src") === url) continue;
      const next = new Image();
      next.src = url;
      this._mapNext.set(key, next);
      next.decode().then(
        () => {
          if (this._mapNext.get(key) === next) nodeOf(key, id)?.setAttribute("src", url);
        },
        () => {},
      );
    }
  }

  _mapsPaused() {
    return !!(this._offscreen || document.hidden);
  }

  // Dock switches only change state on the next poll of the integration (up to ~30 s): the requested
  // state is shown meanwhile, until the entity reports it or the delay runs out.
  _setPending(id, state) {
    this._pending = { ...this._pending, [id]: { state, until: Date.now() + PENDING_MS } };
    clearTimeout(this._pendingTimer);
    this._pendingTimer = setTimeout(() => this._update(), PENDING_MS + 100);
    this._update();
  }

  _isOn(id) {
    const s = this._s(id);
    const p = this._pending?.[id];
    if (p && (Date.now() > p.until || s?.state === p.state)) delete this._pending[id];
    else if (p) return p.state === "on";
    return s?.state === "on";
  }

  // Remember the natural size of the map image, needed to crop it.
  _onLoad(ev) {
    const img = ev.target;
    const id = img?.dataset?.map;
    if (!id || !img.naturalWidth) return;
    const old = this._mapSizes?.[id];
    if (old && old.w === img.naturalWidth && old.h === img.naturalHeight) return;
    this._mapSizes = { ...this._mapSizes, [id]: { w: img.naturalWidth, h: img.naturalHeight } };
    if (this._config.crop)
      setTimeout(() => {
        if (this.isConnected) this._update();
      });
  }

  _onClick(ev) {
    this._pressing = false;
    if (ev.detail === 0) this._byPointer = false;
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset && (n.dataset.entity || n.dataset.action));
    // Just closed: the rest of a double click on OK does nothing.
    if (!this._confirm && Date.now() - (this._confirmClosedAt ?? 0) < CONFIRM_GUARD_MS) {
      ev.stopPropagation();
      return;
    }
    // Confirmation popup open: only its buttons and the backdrop itself (outside the dialog) act.
    if (this._confirm) {
      ev.stopPropagation();
      const action = el?.dataset.action;
      if (action === "confirm_ok") {
        const { entity } = this._confirm;
        this._closeConfirm();
        this._call("button", "press", { entity_id: entity });
      } else if (action === "confirm_cancel" || (action === "confirm_backdrop" && path[0] === el)) {
        this._closeConfirm();
      }
      return;
    }
    if (!el) return;
    ev.stopPropagation();
    const { action, entity, label } = el.dataset;
    // No command to a vacuum that cannot take it (its buttons are drawn disabled; this also covers a click that
    // reaches a button before the card re-renders).
    if ((VACUUM_ACTIONS.has(action) || (action === "routine" && this._dev?.vacuum)) && this._offline(this._dev)) return;
    if (this._roomAction(action, entity, el.dataset.room)) return;
    if (action === "zoom_map") return this._zoomMap(entity);
    if (action === "zoom_vector") return this._vectorMap?.openFullscreen?.();
    if (action === "zoom") return this._toggleZoom(ev);
    if (action === "toggle_section") {
      const key = el.dataset.section;
      // The folded state chosen by hand is stored as is, not as a flip of the default: the dock default
      // changes with _dockProblem, and a flip would then fold the section as an alert appears.
      this._toggled = new Map(this._toggled).set(key, !this._isCollapsed(key));
      return this._update();
    }
    if (action === "dock_toggle") {
      const on = this._isOn(entity);
      this._setPending(entity, on ? "off" : "on");
      return this._call("switch", on ? "turn_off" : "turn_on", { entity_id: entity }, () => {
        // The request failed: show the entity's real state again.
        if (this._pending) delete this._pending[entity];
        this._update();
      });
    }
    if (action === "reset") {
      this._openConfirm({ entity, text: this._t("confirm_reset", { name: label }), ok: this._t("reset") });
    } else if (action === "routine") {
      this._openConfirm({ entity, text: this._t("run_routine", { name: label }), ok: this._t("start") });
    } else if (action) {
      this._call("vacuum", action, { entity_id: entity });
    } else if (entity) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: entity }, bubbles: true, composed: true }));
    }
  }

  // Confirmation before pressing a button entity (routine, consumable reset): Cancel does nothing.
  _openConfirm(confirm) {
    this._confirm = confirm;
    window.addEventListener("keydown", this._onKey);
    this._update();
    // preventScroll: the popup is at the top of the card, the page must not jump to it.
    this.shadowRoot.querySelector(".modal .primary")?.focus({ preventScroll: true });
  }

  _closeConfirm() {
    this._confirm = null;
    this._confirmClosedAt = Date.now();
    window.removeEventListener("keydown", this._onKey);
    this._update();
  }

  _confirmHtml() {
    const c = this._confirm;
    return `<style>${DIALOG_STYLE}</style><div class="backdrop" data-action="confirm_backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="msg">${esc(c.text)}</div>
        <div class="modal-actions">
          <button class="btn" data-action="confirm_cancel"><span>${esc(this._t("cancel"))}</span></button>
          <button class="btn primary" data-action="confirm_ok"><span>${esc(c.ok)}</span></button>
        </div>
      </div>
    </div>`;
  }

  // Translated state: card strings first (they follow the language option), then Home Assistant's
  // own translation of the integration, then a readable version of the raw value.
  _fmt(stateObj, prefix = "v_", value) {
    if (!stateObj && value === undefined) return "—";
    const raw = value ?? stateObj.state;
    const k = `${prefix}${String(raw).toLowerCase()}`;
    const own = STRINGS[lang(this._hass, this._config)][k];
    if (own) return own;
    if (stateObj && value === undefined && this._hass.formatEntityState) {
      try {
        return this._hass.formatEntityState(stateObj);
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    return pretty(raw);
  }

  // Attribute value translated by its integration (formatEntityAttributeValue), else the raw value made readable.
  _attr(stateObj, name) {
    const raw = stateObj.attributes?.[name];
    if (this._hass.formatEntityAttributeValue) {
      try {
        const t = this._hass.formatEntityAttributeValue(stateObj, name);
        if (t && t !== String(raw)) return t;
      } catch (_e) {
        /* older Home Assistant */
      }
    }
    return pretty(raw);
  }

  // Status of the device: the detailed status sensor, else the vacuum entity.
  _status(dev) {
    const e = dev.entities;
    const s = this._s(e.status) || this._s(e.a01_status) || this._s(e.q7_status);
    const vac = this._s(dev.vacuum);
    // iRobot: the vacuum's status attribute tells the Clean Base emptying the bin (the vacuum is then "returning")
    // and the robot charging on its base. roombapy reports the evac phase as "Emptying Bin" ("Emptying" kept as well).
    const irobot =
      dev.platform === "roomba" && vac && { "Emptying Bin": "emptying_the_bin", Emptying: "emptying_the_bin", Charging: "charging", Recharging: "charging" }[vac.attributes?.status];
    if (irobot && vac.state !== "unavailable") return { state: irobot, text: this._fmt(null, "s_", irobot), entity: vac.entity_id };
    if (vac && (vac.state === "unavailable" || !valid(s))) return { state: vac.state, text: this._fmt(vac, "s_"), entity: vac.entity_id };
    if (s) return { state: s.state, text: this._fmt(s, "s_"), entity: s.entity_id };
    return null;
  }

  _battery(dev) {
    const ids = [dev.entities.battery, ...(dev.extra.sensor || [])];
    for (const id of ids) {
      const s = this._s(id);
      if (s && (id === dev.entities.battery || s.attributes?.device_class === "battery")) return s;
    }
    // No battery sensor (Dyson…): the battery_level attribute of the vacuum.
    const vac = this._s(dev.vacuum);
    const level = vac?.attributes?.battery_level;
    return level === undefined || level === null ? undefined : { entity_id: vac.entity_id, state: String(level), attributes: {} };
  }

  _error(dev) {
    for (const k of ["vacuum_error", "a01_error", "dreame_error", "ecovacs_error"]) {
      const s = this._s(dev.entities[k]);
      // Ecovacs: an error code ("0": none) with its description as attribute.
      if (valid(s) && !["none", "no_error", "0"].includes(s.state))
        return { entity: s.entity_id, text: s.attributes?.description || this._fmt(s, "e_") };
    }
    const dock = this._s(dev.dock.dock_error);
    if (valid(dock) && dock.state !== "ok") return { entity: dock.entity_id, text: `${this._t("dock_state")} · ${this._fmt(dock, "e_")}` };
    const water = this._s(dev.entities.water_shortage);
    if (water?.state === "on") return { entity: water.entity_id, text: this._t("water_shortage") };
    // Xiaomi Miio, iRobot: no error sensor, the vacuum carries it in its "error" attribute (iRobot: only while there
    // is one, whatever the state — a missing bin does not stop the robot).
    const vac = this._s(dev.vacuum);
    if (dev.platform !== "roborock" && vac?.attributes?.error && (vac.state === "error" || dev.platform === "roomba"))
      return { entity: vac.entity_id, text: String(vac.attributes.error) };
    // Braava 240: the vacuum is "error" when the job ended with an error, the reason in its mission_status attribute
    // ("stuck", "low_battery", "start_refused_invalid_pad"…), translated by the integration since its 0.4.0.
    if (dev.platform === "braava_240_ble" && vac?.state === "error")
      return { entity: vac.entity_id, text: vac.attributes?.mission_status ? this._attr(vac, "mission_status") : this._fmt(vac, "s_") };
    // Braava 240: no pad attached, it will not start.
    const pad = this._s(dev.entities.pad_type);
    if (dev.platform === "braava_240_ble" && pad?.state === "no_pad") return { entity: pad.entity_id, text: this._fmt(pad, "e_") };
    const bin = this._s(dev.entities.bin_full);
    if (bin?.state === "on") return { entity: bin.entity_id, text: this._t("bin_full") };
    return null;
  }

  // Current room (opens its entity), or "" when unknown.
  _roomLine(dev) {
    const room = this._s(dev.entities.current_room);
    return valid(room)
      ? `<div class="line clickable" role="button" tabindex="0" data-entity="${esc(room.entity_id)}">${svgIcon(ICONS.room)}<span>${esc(room.state)}</span></div>`
      : "";
  }

  // Robot or dock error (opens its entity), or "".
  _errorLine(dev) {
    const err = this._error(dev);
    return err
      ? `<div class="alert-line crit clickable" role="button" tabindex="0" data-entity="${esc(err.entity)}">${svgIcon(ICONS.alert)}<span>${esc(err.text)}</span></div>`
      : "";
  }

  // Picture of the robot (opens the vacuum), or "" when there is none.
  _pictureBlock(dev, status, pic = this._picture(dev, status)) {
    return pic
      ? `<div class="picture clickable" role="button" tabindex="0" aria-label="${esc(this._config.title || dev.name || "")}" data-entity="${esc(dev.vacuum || status?.entity || "")}">${imgTag(pic, 'alt=""')}</div>`
      : "";
  }

  _picture(dev, status) {
    const img = this._config.image;
    if (img === "none") return null;
    // Object.hasOwn, not IMAGES[img]: an inherited property name ("__proto__", "constructor"…) as the image
    // option would otherwise be a truthy non-function and crash the render.
    const preset = img && Object.hasOwn(IMAGES, img);
    const model = img && Object.hasOwn(MODEL_NAMES, img);
    if (img && !preset && !model && img !== "auto") return img;
    // Mops drying: the drying status of the dock, or its remaining time while the robot is not out cleaning.
    const d = dev.dock;
    const drying = [d.mop_drying_status].some((id) => this._isOn(id)) || hours(this._s(d.mop_drying_remaining_time)) > 0;
    let activity = activityOf(status?.state, this._s(dev.entities.cleaning_mode)?.state, drying);
    // Ecovacs: the station state tells when the mops are washed or dried (the robot is then docked).
    const station = { washing_mop: "washing", drying_mop: "drying" }[this._s(dev.entities.ecovacs_station)?.state];
    if (station && !activity) activity = station;
    // iRobot: the Clean Base emptying the bin (only drawn by the iRobot picture).
    if (status?.state === "emptying_the_bin" && dev.platform === "roomba") activity = "emptying";
    const white = colorOf(this._config.color);
    return svgUri(preset ? IMAGES[img](activity, white) : autoSvg(model ? presetDevice(img) : dev, activity, white));
  }

  // Icon of the kind of device, tinted with the brand color, with the logo of the brand of the model (else of the
  // integration the device comes from) as a badge, linking to its site.
  // State of the device for the header icon: the worst of the robot status (error, offline, paused), a robot or
  // dock error (water shortage, full bin…), the clean and dirty water tanks of the dock and the robot, and the
  // consumables (worn out: crit, nearly: warn); without any problem, the color of the status (cleaning, docked…).
  _iconState(dev, status) {
    const levels = [status ? statusClass(status.state) : ""];
    if (this._error(dev) || this._dockProblem(dev)) levels.push("crit");
    for (const id of [dev.entities.tank_level, dev.entities.dock_tank_level]) {
      const s = this._s(id);
      const pct = valid(s) ? num(s) : null;
      if (pct !== null) levels.push(tankClass(pct));
    }
    for (const { cls } of this._consumableLevels(dev)) levels.push(cls);
    return levels.includes("crit") ? "crit" : levels.includes("warn") ? "warn" : levels[0];
  }

  _logo(dev, state) {
    const b = brandFor(dev);
    return `<a class="logo-link type-icon${state ? ` ${state}` : ""}" href="${b.site}" target="_blank" rel="noopener noreferrer" title="${esc(b.name)}">${imgTag(b.logo, `class="logo" alt="${esc(b.name)}"`)}${svgIcon(ICONS[deviceTypeOf(dev)], "type")}</a>`;
  }

  // Illustrated header (the default; `illustration: false` keeps the classic one).
  _illustrated() {
    return this._config.illustration !== false;
  }

  // The banner: the icon, the title and the status (then `sub`) on the wall at the left, the device's picture (opens
  // the vacuum) standing on the parquet at the right.
  _banner(dev, status, sub) {
    const c = this._config;
    const night = vcIsNight(this._hass, c);
    const pic = this._picture(dev, status);
    const zoom = this._zoomButton();
    const art = pic ? `<div class="vc-dev" style="${vcPlace(pic)}">${this._pictureBlock(dev, status, pic)}</div>` : "";
    // The status pill right after the title (on its own line under the subtitle when it does not fit there), in
    // the colour of the header icon.
    const st = status
      ? `<span class="chip clickable ${this._iconState(dev, status) || statusClass(status.state)}" role="button" tabindex="0" data-entity="${esc(status.entity)}" title="${esc(status.text)}" aria-label="${esc(
          status.text,
        )}"><span class="dot"></span><span class="chip-text">${esc(status.text)}</span></span>`
      : "";
    return `
      <div class="banner${night ? " night" : ""}">
        <div class="vc-scene">${vcSceneSvg(night)}${art}</div>
        <div class="vc-ground" aria-hidden="true"></div>
        <div class="htext">
          ${c.show_logo !== false ? this._logo(dev, this._iconState(dev, status)) : ""}
          <div class="titles">
            <div class="trow"><div class="name">${esc(c.title || dev.name)}</div>${st}</div>
            ${sub ? `<div class="line2" title="${esc(sub)}"><span class="sub">${esc(sub)}</span></div>` : ""}
          </div>
        </div>
        ${zoom}
      </div>`;
  }

  _header(dev, status, sub) {
    const c = this._config;
    if (this._illustrated()) return this._banner(dev, status, sub);
    return `
      <div class="header">
        ${
          c.show_logo !== false ? this._logo(dev, this._iconState(dev, status)) : ""
        }
        <div class="titles">
          <div class="trow"><div class="name">${esc(c.title || dev.name)}</div>${
            status
              ? `<span class="chip clickable ${statusClass(status.state)}" role="button" tabindex="0" data-entity="${esc(status.entity)}" title="${esc(status.text)}" aria-label="${esc(
                  status.text,
                )}"><span class="dot"></span><span class="chip-text">${esc(status.text)}</span></span>`
              : ""
          }</div>
          ${sub ? `<div class="sub" title="${esc(sub)}">${esc(sub)}</div>` : ""}
        </div>
        ${this._zoomButton()}
      </div>`;
  }

  // Detail button at the far right of the header (mini card only).
  _zoomButton() {
    return "";
  }

  _errorCard(key) {
    return `<style>${BASE_STYLE}</style><ha-card><div class="warning">${esc(
      key === "unknown_device" ? `${this._t(key)}: ${this._config.device}` : this._t(key)
    )}</div></ha-card>`;
  }

  _lastClean(dev) {
    const s = this._s(dev.entities.last_clean_end) || this._s(dev.entities.last_clean_start);
    const when = valid(s) ? ago(this._hass, this._config, s.state) : null;
    return when ? this._t("last_clean_ago", { when }) : "";
  }

  _batteryLevel(batt) {
    const v = num(batt);
    return { v, cls: v === null ? "idle" : v <= 15 ? "crit" : v <= 30 ? "warn" : "ok" };
  }

  // True when the vacuum can take no command: unavailable, or its state unknown with no status sensor telling
  // otherwise (some integrations report an activity they do not know as "unknown" while the robot is online, and
  // Stop or Dock must then still work). iRobot has no status sensor: the vacuum's status attribute (the robot's
  // phase, which _status shows) tells it is there.
  _offline(dev) {
    const vac = this._s(dev?.vacuum);
    if (!vac || vac.state === "unavailable") return true;
    if (vac.state !== "unknown") return false;
    const e = dev.entities;
    if (dev.platform === "roomba" && typeof vac.attributes?.status === "string" && valid({ state: vac.attributes.status.trim() })) return false;
    return !valid(this._s(e.status) || this._s(e.a01_status) || this._s(e.q7_status));
  }

  _controls(dev, round = false) {
    const vac = this._s(dev.vacuum);
    if (!vac || this._config.show_controls === false) return "";
    const cleaning = vac.state === "cleaning";
    // Home Assistant drops a service call to an unavailable entity without a word: the buttons say it instead.
    const off = this._offline(dev);
    // Commands the vacuum does not support (supported_features, when reported) are left out: the Braava 240 has no
    // pause and no dock, Stop then ends the cleaning job.
    const can = (feature) => typeof vac.attributes?.supported_features !== "number" || (vac.attributes.supported_features & feature) !== 0;
    const pause = can(VACUUM_FEATURES.pause);
    const stop = can(VACUUM_FEATURES.stop);
    const btn = (action, icon, label, cls = "") =>
      `<button class="btn ${round ? "round" : ""} ${cls}${off ? " disabled" : ""}" title="${esc(label)}" data-action="${action}" data-entity="${esc(vac.entity_id)}"${
        off ? " disabled" : ""
      }>${svgIcon(icon)}${
        round ? "" : `<span>${esc(label)}</span>`
      }</button>`;
    const stopPrimary = cleaning && !pause && stop;
    const list = [
      cleaning && pause
        ? btn("pause", ICONS.pause, this._t("pause"), "primary")
        : stopPrimary
          ? btn("stop", ICONS.stop, this._t("stop"), "primary")
          : btn(vac.state !== "paused" && this._canSelectRooms(dev, vac) ? "open_rooms" : "start", ICONS.play, this._t("start"), "primary"),
      round || stopPrimary || !stop ? "" : btn("stop", ICONS.stop, this._t("stop")),
      can(VACUUM_FEATURES.return_home) ? btn("return_to_base", ICONS.home, this._t("dock")) : "",
      round || !can(VACUUM_FEATURES.locate) ? "" : btn("locate", ICONS.locate, this._t("locate")),
    ];
    return list.join("");
  }

  // ----- Room selector -----------------------------------------------------
  // Rooms come from the `rooms` option when set, otherwise from the integration (see ROOM_ADAPTERS): Roborock's
  // roborock.get_maps service (current map, as chosen in the "selected map" select), Dreame's `rooms` attribute of
  // the vacuum (current map). Xiaomi Miio cannot list them: the option is needed there.

  // Rooms of the `rooms` option, in its order.
  _configRooms() {
    return roomItems(this._config.rooms);
  }

  _canSelectRooms(dev, vac) {
    const adapter = ROOM_ADAPTERS[dev.platform];
    if (this._config.room_selection === false || !adapter) return false;
    return !!(this._configRooms().length || adapter.service || adapter.attribute?.(vac).length);
  }

  _roomAction(action, entity, room) {
    const r = this._rooms;
    switch (action) {
      case "open_rooms": {
        const vac = this._s(entity);
        const adapter = ROOM_ADAPTERS[this._dev?.platform];
        const list = this._configRooms();
        if (!list.length && adapter?.attribute) list.push(...sortRooms(adapter.attribute(vac)));
        if (list.length || !adapter?.service) {
          this._rooms = { entity, selected: [], loading: false, list, error: !list.length };
          this._update();
          return true;
        }
        this._rooms = { entity, selected: [], loading: true };
        this._update();
        this._loadRooms(entity);
        return true;
      }
      case "close_rooms":
        this._rooms = null;
        this._update();
        return true;
      case "toggle_room":
        if (!r) return true;
        r.selected = r.selected.includes(room) ? r.selected.filter((x) => x !== room) : [...r.selected, room];
        this._update();
        return true;
      case "all_rooms":
        if (!r?.list) return true;
        r.selected = r.selected.length === r.list.length ? [] : r.list.map((x) => x.id);
        this._update();
        return true;
      case "clean_rooms":
        if (!r?.selected.length || !ROOM_ADAPTERS[this._dev?.platform]) return true;
        this._call(...ROOM_ADAPTERS[this._dev.platform].clean(entity, r.selected.map(Number)));
        this._rooms = null;
        this._update();
        return true;
      case "clean_all":
        this._call("vacuum", "start", { entity_id: entity });
        this._rooms = null;
        this._update();
        return true;
      default:
        return false;
    }
  }

  async _loadRooms(entity) {
    try {
      const res = await this._hass.callWS({
        type: "call_service",
        domain: "roborock",
        service: "get_maps",
        target: { entity_id: entity },
        return_response: true,
      });
      const maps = res?.response?.[entity]?.maps || [];
      const selected = this._s(this._dev?.entities.selected_map)?.state;
      const map = maps.find((m) => m.name === selected) || maps[0];
      const list = sortRooms(Object.entries(map?.rooms || {}).map(([id, name]) => ({ id, name })));
      if (this._rooms?.entity !== entity) return;
      this._rooms = { ...this._rooms, loading: false, list, error: !list.length };
    } catch (_e) {
      if (this._rooms?.entity !== entity) return;
      this._rooms = { ...this._rooms, loading: false, list: [], error: true };
    }
    this._update();
  }

  _roomPanel(dev) {
    const r = this._rooms;
    if (!r || r.entity !== dev.vacuum) return "";
    let body;
    if (r.loading) body = `<div class="rooms-msg">${esc(this._t("rooms_loading"))}</div>`;
    else if (r.error) body = `<div class="rooms-msg">${esc(this._t("rooms_error"))}</div>`;
    else
      body = `<div class="room-list">
        <button class="room all ${r.selected.length === r.list.length ? "on" : ""}" data-action="all_rooms" data-entity="${esc(dev.vacuum)}">${esc(this._t("select_all"))}</button>
        ${r.list
          .map(
            (x) =>
              `<button class="room ${r.selected.includes(x.id) ? "on" : ""}" data-action="toggle_room" data-entity="${esc(dev.vacuum)}" data-room="${esc(x.id)}">${esc(x.name)}</button>`
          )
          .join("")}
      </div>`;
    return `<div class="rooms">
      <div class="rooms-title">${svgIcon(ICONS.room)}${esc(this._t("choose_rooms"))}</div>
      ${body}
      <div class="rooms-actions">
        <button class="btn" data-action="close_rooms" data-entity="${esc(dev.vacuum)}"><span>${esc(this._t("cancel"))}</span></button>
        <button class="btn" data-action="clean_all" data-entity="${esc(dev.vacuum)}">${svgIcon(ICONS.home)}<span>${esc(this._t("whole_home"))}</span></button>
        <button class="btn primary ${r.selected.length ? "" : "disabled"}" data-action="clean_rooms" data-entity="${esc(dev.vacuum)}" ${
          r.selected.length ? "" : "disabled"
        }>${svgIcon(ICONS.play)}<span>${esc(this._t("clean_rooms", { n: r.selected.length }))}</span></button>
      </div>
    </div>`;
  }
}
