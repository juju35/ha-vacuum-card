// Element names of Home Assistant dialogs (more-info opened from the card, among others).
import { VECTOR_MAP, esc } from "./helpers.js";

export const DIALOG_TAGS = new Set(["HA-MORE-INFO-DIALOG", "HA-DIALOG", "DIALOG"]);

// True for a click outside `card` that is not in a dialog opened from it (more-info, say) nor on its enlarged map
// (appended to the document body, see _zoomMap: the click that closes it is not a click elsewhere on the page).
export const isOutside = (card, ev) => {
  const path = ev.composedPath();
  return !path.includes(card) && !(card._zoomOverlay && path.includes(card._zoomOverlay)) && !path.some((n) => DIALOG_TAGS.has(n.tagName));
};

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. It counts when the press and the release are both outside the card (a slider dragged out of the card
// does not fold it), and a scroll does not count (the browser cancels the pointer). Keyboard clicks still go through
// the click event.
export const watchOutside = (card, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOutside(card, ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOutside(card, ev)) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOutside(card, ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
  };
};

// After the confirmation popup closes, clicks on the card are ignored for this long: the second click of a double
// click on OK would otherwise land on what lies under the button (the battery, an action button).
export const CONFIRM_GUARD_MS = 400;

// Inlined pictures (data: URIs of the logo and the robots, tens of KB) are written as <img data-img="id"> and get
// their src once, then the same node is moved into every later render: the HTML stays small and the picture is not
// decoded again on each update. The id of each distinct picture is kept in a Map (O(1) lookup instead of
// scanning the array on every render); the set is bounded by the variants actually shown (model × activity × color).
export const DATA_IMGS = [];
export const DATA_IMG_IDS = new Map();
export const imgTag = (src, attrs) => {
  if (!String(src).startsWith("data:")) return `<img src="${esc(src)}" ${attrs}>`;
  let id = DATA_IMG_IDS.get(src);
  if (id === undefined) {
    id = DATA_IMGS.push(src) - 1;
    DATA_IMG_IDS.set(src, id);
  }
  return `<img data-img="${id}" ${attrs}>`;
};

// ---------------------------------------------------------------------------
// Shadow DOM patching: a render is applied to the nodes already there (text, attributes and classes updated in
// place) instead of replacing the whole shadow root. Replaced nodes made the card change height for a frame or more
// on every state update (pictures without their size until decoded, icons empty until loaded, animations restarted),
// and the dashboard's scroll anchoring then moved the page.
// ---------------------------------------------------------------------------

// The attributes the card sets on its nodes after a render (src of the kept pictures): never removed by a patch.
export const keptAttr = (el, name) => name === "src" && (el.hasAttribute("data-img") || el.hasAttribute("data-map"));
// A custom element (ha-icon, ha-card…) may set attributes on itself (a style, a state): it only loses those the
// previous render gave it (tplAttrs) and are no longer in this one.
export const isCustom = (el) => el.localName.includes("-");
export const tplAttrs = new WeakMap();
export const markTemplate = (n) => {
  if (n.nodeType !== 1) return;
  for (const el of [n, ...n.querySelectorAll("*")]) if (isCustom(el)) tplAttrs.set(el, new Set(el.getAttributeNames()));
};
export const patchAttrs = (cur, next) => {
  const custom = isCustom(cur);
  const owned = custom ? tplAttrs.get(cur) || new Set() : null;
  for (const name of cur.getAttributeNames()) if (!next.hasAttribute(name) && !keptAttr(cur, name) && (!custom || owned.has(name))) cur.removeAttribute(name);
  for (const { name, value } of next.attributes) if (cur.getAttribute(name) !== value) cur.setAttribute(name, value);
  if (custom) tplAttrs.set(cur, new Set(next.getAttributeNames()));
};
export const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute("data-key") : null);
// A picture is only reused for the same picture (its src is not in the HTML).
export const sameNode = (a, b) =>
  !!a &&
  a.nodeType === b.nodeType &&
  a.nodeName === b.nodeName &&
  (a.nodeType !== 1 || (a.getAttribute("data-img") === b.getAttribute("data-img") && a.getAttribute("data-map") === b.getAttribute("data-map")));
// The vacuum-map-card element stands where the render writes its slot (see _placeVectorMap): left as it is.
export const isVectorSlot = (o, n) => n.nodeType === 1 && n.hasAttribute("data-vector-map") && o?.localName === VECTOR_MAP;
export const patchChildren = (cur, next) => {
  const old = [...cur.childNodes];
  const fresh = [...next.childNodes];
  const byKey = new Map();
  for (const o of old) {
    const k = keyOf(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  const used = new Set();
  fresh.forEach((n, i) => {
    const k = keyOf(n);
    let o = k !== null ? byKey.get(k) : old[i];
    const ref = cur.childNodes[i] ?? null;
    if (isVectorSlot(o, n) && !used.has(o)) {
      used.add(o);
      if (o !== ref) cur.insertBefore(o, ref);
      return;
    }
    if (!sameNode(o, n) || used.has(o) || (k === null && keyOf(o) !== null)) o = null;
    if (!o) {
      markTemplate(n);
      cur.insertBefore(n, ref);
      return;
    }
    used.add(o);
    if (o !== ref) cur.insertBefore(o, ref);
    if (n.nodeType === 1) {
      patchAttrs(o, n);
      // A custom element the template leaves empty (ha-icon) draws its own children: they are kept.
      if (n.childNodes.length || !isCustom(o)) patchChildren(o, n);
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
// Without a DOM (the unit tests' stand-in shadow root), the HTML is only written.
export const morph = (root, html) => {
  if (!root.childNodes) {
    root.innerHTML = html;
    return;
  }
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  patchChildren(root, tpl.content);
};
