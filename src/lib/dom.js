/* Tiny DOM toolkit. Text is always assigned through textContent, never innerHTML. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const SVG_NS = "http://www.w3.org/2000/svg";

function append(parent, child) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) {
    for (const item of child) append(parent, item);
    return;
  }
  parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
}

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key === "style") {
      for (const [prop, propValue] of Object.entries(value)) {
        node.style.setProperty(prop, propValue);
      }
    } else if (key === "on" && typeof value === "object") {
      for (const [event, handler] of Object.entries(value)) {
        node.addEventListener(event, handler);
      }
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  }
  append(node, children);
  return node;
}

export function icon(name, className = "icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

export function clear(node) {
  if (node) node.replaceChildren();
}

export function debounce(fn, wait = 180) {
  let timer = 0;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

export function prefersReducedMotion() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function isTextInput(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']")
  );
}

/** A small number ticker used for the hero stats. */
export function countTo(node, target, formatter, duration = 420) {
  const from = Number(node.dataset.value ?? 0);
  node.dataset.value = String(target);
  if (prefersReducedMotion() || from === target || !Number.isFinite(from)) {
    node.textContent = formatter(target);
    return;
  }

  const started = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (target - from) * eased);
    node.textContent = formatter(value);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Split a string into text and <mark> nodes using [start, end] ranges. */
export function highlight(text, ranges = []) {
  if (!ranges.length) return document.createTextNode(text);
  const fragment = document.createDocumentFragment();
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  for (const [start, end] of sorted) {
    const from = Math.max(cursor, Math.min(start, text.length));
    const to = Math.max(from, Math.min(end, text.length));
    if (from > cursor) fragment.append(text.slice(cursor, from));
    if (to > from) fragment.append(el("mark", { text: text.slice(from, to) }));
    cursor = to;
  }
  if (cursor < text.length) fragment.append(text.slice(cursor));
  return fragment;
}

/** Reveal row actions as two-step, inline confirmation. */
export function confirmInline(container, message, { yesLabel, noLabel, onYes, onCancel } = {}) {
  const previous = [...container.childNodes];
  const previousFocus = document.activeElement;
  const yes = el(
    "button",
    { class: "icon-btn icon-btn--sm", type: "button", title: yesLabel, "aria-label": yesLabel },
    icon("check")
  );
  const no = el(
    "button",
    { class: "icon-btn icon-btn--sm", type: "button", title: noLabel, "aria-label": noLabel },
    icon("close")
  );

  const cleanup = () => {
    document.removeEventListener("keydown", onKey, true);
  };
  const restore = () => {
    cleanup();
    container.replaceChildren(...previous);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    onCancel?.();
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    restore();
  };

  yes.addEventListener("click", () => {
    cleanup();
    container.replaceChildren(...previous);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    onYes?.();
  });
  no.addEventListener("click", restore);

  container.replaceChildren(el("span", { class: "micro", text: message }), yes, no);
  document.addEventListener("keydown", onKey, true);
  no.focus({ preventScroll: true });
}
