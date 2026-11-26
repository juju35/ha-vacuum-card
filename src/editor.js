// ---------------------------------------------------------------------------
// Visual editors (ha-form)
// ---------------------------------------------------------------------------
import { MODEL_PRESETS } from "./models.js";
import { DEFAULT_COLLAPSED } from "./integrations.js";
import { findDevice, lang, listDevices, mapIds, sameDeps, t } from "./helpers.js";
import { VacuumCard } from "./card.js";

export class VacuumEditorBase extends HTMLElement {
  // [name, default]
  static get toggles() {
    return [];
  }

  static get selects() {
    return {};
  }

  static extraFields() {
    return [];
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _schema() {
    const tr = (k) => t(this._hass, this._config, k);
    return [
      { name: "device", selector: { select: { mode: "dropdown", options: listDevices(this._hass) } } },
      { name: "title", selector: { text: {} } },
      {
        name: "image",
        selector: {
          select: {
            mode: "dropdown",
            custom_value: true,
            options: [
              { value: "auto", label: tr("image_auto") },
              ...MODEL_PRESETS,
              { value: "none", label: tr("image_none") },
            ],
          },
        },
      },
      {
        name: "color",
        selector: {
          select: { mode: "dropdown", options: ["auto", "white", "dark"].map((v) => ({ value: v, label: tr(`color_${v}`) })) },
        },
      },
      {
        name: "illustration_theme",
        selector: {
          select: { mode: "dropdown", options: ["auto", "day", "night"].map((v) => ({ value: v, label: tr(`theme_${v}`) })) },
        },
      },
      ...this.constructor.extraFields(tr),
      {
        type: "grid",
        name: "",
        schema: [["show_logo", true], ["illustration", true], ...this.constructor.toggles].map(([name]) => ({ name, selector: { boolean: {} } })),
      },
      {
        name: "language",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "", label: tr("lang_auto") },
              { value: "en", label: "English" },
              { value: "fr", label: "Français" },
              { value: "de", label: "Deutsch" },
              { value: "es", label: "Español" },
              { value: "sr", label: "Српски" },
              { value: "sr-Latn", label: "Srpski (latinica)" },
              { value: "it", label: "Italiano" },
              { value: "nl", label: "Nederlands" },
              { value: "pt", label: "Português (Portugal)" },
              { value: "pl", label: "Polski" },
              { value: "ro", label: "Română" },
              { value: "da", label: "Dansk" },
              { value: "sv", label: "Svenska" },
              { value: "bg", label: "Български" },
              { value: "ru", label: "Русский" },
              { value: "uk", label: "Українська" },
              { value: "hu", label: "Magyar" },
              { value: "sk", label: "Slovenčina" },
              { value: "cs", label: "Čeština" },
              { value: "sl", label: "Slovenščina" },
              { value: "lv", label: "Latviešu" },
              { value: "el", label: "Ελληνικά" },
            ],
          },
        },
      },
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    const toggles = [["show_logo", true], ["illustration", true], ...this.constructor.toggles];
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => t(this._hass, this._config, s.name);
      this._form.computeHelper = (s) => {
        if (s.name === "zoom") return t(this._hass, this._config, "zoom_helper");
        return s.name === "crop" && this._mapSize ? t(this._hass, this._config, "map_size", { w: this._mapSize.w, h: this._mapSize.h }) : undefined;
      };
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const config = { ...ev.detail.value };
        const defaults = { ...Object.fromEntries(toggles), image: "auto", color: "auto", illustration_theme: "auto", ...this.constructor.selects };
        for (let [k, v] of Object.entries(config)) {
          // Keep the YAML minimal: drop empty values and options left at their default.
          if (v && typeof v === "object" && !Array.isArray(v)) {
            v = config[k] = { ...v };
            for (const [sk, sv] of Object.entries(v)) if (sv === "" || sv === undefined || sv === null || sv === 0) delete v[sk];
            if (!Object.keys(v).length) delete config[k];
          } else if (v === "" || v === undefined || v === null || (k in defaults && JSON.stringify(v) === JSON.stringify(defaults[k]))) delete config[k];
        }
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const data = { image: "auto", color: "auto", illustration_theme: "auto", ...this.constructor.selects, ...this._config };
    if (data.show_map === true) data.show_map = "always";
    if (data.show_map === false) data.show_map = "never";
    // The nested form of an expandable section needs an object, even when the option is not set.
    for (const f of this.constructor.extraFields(() => "")) if (f.type === "expandable") data[f.name] = { ...data[f.name] };
    for (const [name, def] of toggles) if (data[name] === undefined) data[name] = def;
    if (!data.device) data.device = VacuumCard.getStubConfig(this._hass).device;
    this._form.hass = this._hass;
    // A new data or schema object re-renders the whole form: only hand over new ones when the config,
    // the language, the registries or the map size changed, not on every state change.
    const h = this._hass;
    const dataDeps = [this._config, h.entities, h.devices];
    if (!sameDeps(this._dataDeps, dataDeps)) {
      this._dataDeps = dataDeps;
      this._form.data = data;
    }
    this._syncSchema();
    this._loadMapSize(data.device);
  }

  // The schema is only rebuilt when what it is made of changed: the language, the registries (device list) and the
  // map size (crop help).
  _syncSchema() {
    if (!this._form) return;
    const h = this._hass;
    const deps = [lang(h, this._config), h.entities, h.devices, this._mapSize];
    if (sameDeps(this._schemaDeps, deps)) return;
    this._schemaDeps = deps;
    this._form.schema = this._schema();
  }

  // Size of the map image of the selected device, shown in the crop section to help pick the values.
  _loadMapSize(device) {
    if (!this.constructor.extraFields(() => "").some((f) => f.name === "crop")) return;
    const { dev } = findDevice(this._hass, { device });
    const id = dev && mapIds(dev, this._config).find((i) => this._hass.states[i]?.attributes?.entity_picture);
    if (!id) {
      // A device without a map: drop the previous device's size from the crop help.
      if (this._mapSizeImg) this._mapSizeImg.onload = null;
      if (this._mapSizeFor == null && this._mapSize == null) return;
      this._mapSizeFor = this._mapSize = null;
      this._syncSchema();
      return;
    }
    if (this._mapSizeFor === id) return;
    this._mapSizeFor = id;
    // Drop the previous probe: its late onload would overwrite the size of the newly selected device.
    if (this._mapSizeImg) this._mapSizeImg.onload = null;
    const img = new Image();
    this._mapSizeImg = img;
    img.onload = () => {
      this._mapSize = { w: img.naturalWidth, h: img.naturalHeight };
      this._syncSchema();
    };
    img.src = this._hass.states[id].attributes.entity_picture;
  }
}

// show_map in the editors: never, while cleaning, always, always folded
export const showMapField = (tr) => ({
  name: "show_map",
  selector: { select: { mode: "dropdown", options: ["never", "cleaning", "always", "always_folded"].map((v) => ({ value: v, label: tr(`map_${v}`) })) } },
});

export class VacuumCardEditor extends VacuumEditorBase {
  static get toggles() {
    return [
      ["show_title", true],
      ["show_subtitle", true],
      ["show_controls", true],
      ["room_selection", true],
      ["show_modes", true],
      ["show_routines", true],
      ["show_dock", true],
      ["show_consumables", true],
      ["show_stats", true],
      ["keep_last_map", false],
      ["vector_map", true],
    ];
  }

  static get selects() {
    return { show_map: "cleaning", collapsed: DEFAULT_COLLAPSED };
  }

  static extraFields(tr) {
    return [
      showMapField(tr),
      {
        name: "collapsed",
        selector: {
          select: {
            multiple: true,
            mode: "list",
            options: [
              ["routines", "routines"],
              ["dock", "station"],
              ["consumables", "consumables"],
              ["stats", "statistics"],
            ].map(([value, label]) => ({ value, label: tr(label) })),
          },
        },
      },
      { name: "map_entity", selector: { entity: { domain: ["camera", "image"] } } },
      {
        type: "expandable",
        name: "crop",
        title: tr("crop"),
        icon: "mdi:crop",
        schema: ["top", "bottom", "left", "right"].map((name) => ({ name, selector: { number: { min: 0, mode: "box", unit_of_measurement: "px" } } })),
      },
    ];
  }
}

// The full card's options too: the detail button shows the full card's content with this same configuration.
export class VacuumMiniCardEditor extends VacuumEditorBase {
  static get toggles() {
    const own = [
      ["show_title", true],
      ["show_subtitle", true],
      ["show_controls", true],
      ["room_selection", true],
      ["zoom", true],
    ];
    return [...own, ...VacuumCardEditor.toggles.filter(([name]) => !own.some(([n]) => n === name))];
  }

  static get selects() {
    return VacuumCardEditor.selects;
  }

  static extraFields(tr) {
    return VacuumCardEditor.extraFields(tr);
  }
}
