// Evaluates src/vacuum-card.js (a classic script, bundled as is by scripts/build.mjs) in a sandbox with
// minimal DOM stand-ins and returns the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../src/vacuum-card.js", import.meta.url), "utf8");

// Shadow root stand-in: keeps the HTML it is given and the listeners it gets.
const fakeRoot = () => ({
  innerHTML: "",
  listeners: {},
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
});

// Plain element stand-in (the enlarged map overlay): children, listeners and remove() from its parent.
const fakeNode = (tag) => ({
  tagName: String(tag).toUpperCase(),
  style: {},
  children: [],
  listeners: {},
  parentNode: null,
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  },
  addEventListener(type, fn) {
    this.listeners[type] = fn;
  },
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((c) => c !== this);
    this.parentNode = null;
  },
});

export const load = () => {
  const registry = new Map();
  class HTMLElement {
    attachShadow() {
      this.shadowRoot = fakeRoot();
      return this.shadowRoot;
    }
    dispatchEvent(ev) {
      (this.events ||= []).push(ev);
    }
    appendChild() {}
  }
  class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const sandbox = {
    HTMLElement,
    CustomEvent,
    Intl,
    console: { info() {}, warn() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: {
      createElement: (t) => (registry.has(t) ? new (registry.get(t))() : fakeNode(t)),
      addEventListener() {},
      removeEventListener() {},
      body: fakeNode("body"),
    },
    setTimeout,
    clearTimeout,
  };
  // window-level listeners, fired by hand with fire(type, ev).
  const winListeners = {};
  sandbox.addEventListener = (type, fn) => (winListeners[type] ||= new Set()).add(fn);
  sandbox.removeEventListener = (type, fn) => winListeners[type]?.delete(fn);
  sandbox.fire = (type, ev) => {
    for (const fn of [...(winListeners[type] || [])]) fn(ev);
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return vm.runInContext(
    `${source}
    ({ fmtHours, hours, statusClass, esc, resolve, ago, lang, RTF, autoSvg, robotSvg, wetdrySvg, dysonSvg, roombaSvg, irobotName, IMAGES, activityOf, brandOf, BRAND_LABELS, MODEL_NAMES, MODEL_PRESETS, STRINGS, VacuumCard: customElements.get("vacuum-card"),
       VacuumMiniCard: customElements.get("vacuum-mini-card"), window, document })`,
    sandbox,
  );
};
