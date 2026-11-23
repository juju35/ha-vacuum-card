// ---------------------------------------------------------------------------
// Mini card
// ---------------------------------------------------------------------------
import { accentStyle } from "./integrations.js";
import { ICONS } from "./icons.js";
import { esc, findDevice, svgIcon } from "./helpers.js";
import { BANNER_STYLE } from "./banner.js";
import { BASE_STYLE } from "./styles.js";
import { isOutside, watchOutside } from "./dom.js";
import { VacuumCard } from "./card.js";

export const MINI_STYLE = `
  /* Natural width in a parent that sizes to its content (see :host::before in BASE_STYLE). */
  :host { --vc-natural-width: 300px; }
  .name { font-size: 16px; }
  .content { padding: 8px 12px 12px; display: flex; align-items: center; gap: 12px; }
  .picture { width: 64px; height: 72px; }
  .picture img { filter: drop-shadow(0 2px 4px rgba(0,0,0,.18)); }
  .batt { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .batt .icon { color: var(--c); width: 16px; height: 16px; }
  .batt .bar { flex: 1; }
  .batt .v { font-weight: 500; min-width: 40px; text-align: right; }
  .line .icon { width: 14px; height: 14px; }
  .controls { display: flex; gap: 6px; flex: none; }
  .rooms-wrap { padding: 0 12px 12px; }
  /* The map, under the robot while it cleans (show_map, "cleaning" by default) */
  .map-wrap { padding: 0 12px 12px; }
  .map-wrap:empty { display: none; }
  /* The "always_folded" map header (section-title lives in FULL_STYLE; the mini card needs it too). */
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); margin-bottom: 6px; }
  .section-title .icon { width: 16px; height: 16px; }
  .section-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .section-title.toggle { cursor: pointer; user-select: none; }
  .section-title.toggle[aria-expanded="false"] { margin-bottom: 0; }
  .section-title .chevron { margin-left: auto; width: 16px; height: 16px; transition: transform .2s ease; }
  .section-title.toggle[aria-expanded="false"] .chevron { transform: rotate(-90deg); }
  /* Narrow mini card (6 of 12 columns, 156-250 px): the round buttons move under the robot, then the picture
     gives way to the battery and the info lines. */
  @container (max-width: 300px) {
    .content { flex-wrap: wrap; row-gap: 8px; }
    .controls { flex-basis: 100%; justify-content: flex-end; }
  }
  @container (max-width: 200px) {
    .picture { display: none; }
  }
`;

// The mini card is a full card drawn compact: its detail button (top right, `zoom: false` removes it) switches it
// to the full card's content and back, and a click anywhere else on the page brings the compact view back.
export class VacuumMiniCard extends VacuumCard {
  constructor() {
    super();
    // Clicks inside a dialog (the more-info opened from the card) leave it zoomed in.
    this._onUnzoom = (ev) => {
      if (this._zoomed && isOutside(this, ev)) this._setZoom(false);
    };
  }

  static getConfigElement() {
    return document.createElement("vacuum-mini-card-editor");
  }

  connectedCallback() {
    super.connectedCallback();
    (this._unzoom ??= watchOutside(this, (ev) => this._onUnzoom(ev))).on();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unzoom?.off();
    // Back to the compact view once off the screen (see the full card).
    this._zoomed = false;
  }

  getCardSize() {
    return this._zoomed ? super.getCardSize() : 3;
  }

  getGridOptions() {
    // rows: "auto": the compact and the full view each take the height they need in a Sections view.
    return { ...(this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 6 }), rows: "auto" };
  }

  _zoomButton() {
    if (this._config.zoom === false) return "";
    const z = this._zoomed;
    const label = esc(this._t(z ? "zoom_out" : "zoom_in"));
    return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}">${svgIcon(z ? ICONS.collapse : ICONS.expand)}</button>`;
  }

  _setZoom(on) {
    this._zoomed = on;
    this._update();
    // getCardSize()/getGridOptions() changed: tell the view to re-measure the card (masonry listens to
    // iron-resize; harmless elsewhere).
    this.dispatchEvent(new CustomEvent("iron-resize", { bubbles: true, composed: true }));
  }

  // The click never reaches the header or an action (stopped in _onClick). From the keyboard (Enter / Space: no
  // click count), the focus moves to the button that replaced this one, in the same place: preventScroll, the page
  // must not jump to it when the card grows or shrinks.
  _toggleZoom(ev) {
    this._setZoom(!this._zoomed);
    if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
  }

  _render() {
    if (this._zoomed) return super._render();
    const { dev, error } = findDevice(this._hass, this._config);
    if (error) return this._errorCard(error);
    this._dev = dev;
    const status = this._status(dev);
    const batt = this._battery(dev);
    const { v, cls } = this._batteryLevel(batt);
    const lines = [this._errorLine(dev), this._roomLine(dev)];
    const last = this._lastClean(dev);
    if (last) lines.push(`<div class="line">${svgIcon(ICONS.clock)}<span>${esc(last)}</span></div>`);
    // Empty when the room list belongs to another device: no padded empty band then.
    const rooms = this._roomPanel(dev);
    return `<style>${BASE_STYLE}${MINI_STYLE}${this._illustrated() ? BANNER_STYLE : ""}${accentStyle(dev, this._hass)}</style>
      <ha-card>
        ${this._header(dev, status, "")}
        <div class="content">
          ${this._illustrated() ? "" : this._pictureBlock(dev, status)}
          <div class="info">
            ${
              batt
                ? `<div class="batt clickable ${cls}" role="button" tabindex="0" data-entity="${esc(batt.entity_id)}">${svgIcon(ICONS.battery)}<div class="bar ${cls}"><div style="width:${Math.max(
                    0,
                    Math.min(100, v ?? 0),
                  )}%"></div></div><span class="v">${v === null ? "—" : `${Math.round(v)} %`}</span></div>`
                : ""
            }
            ${lines.join("")}
          </div>
          ${dev.vacuum && this._config.show_controls !== false ? `<div class="controls">${this._controls(dev, true)}</div>` : ""}
        </div>
        ${rooms ? `<div class="rooms-wrap">${rooms}</div>` : ""}
        ${this._showMap(dev) ? `<div class="map-wrap">${this._mapSection(dev)}</div>` : ""}
      </ha-card>`;
  }
}
