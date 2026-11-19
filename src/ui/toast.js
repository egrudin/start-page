import { el } from "../lib/dom.js";

export function createToaster(root) {
  function show(message, { tone = "info" } = {}) {
    if (!message) return;
    const node = el(
      "div",
      { class: `toast${tone === "error" ? " is-error" : ""}` },
      el("span", { class: "toast__dot", "aria-hidden": "true" }),
      el("span", { text: message })
    );
    root.append(node);
    while (root.children.length > 3) root.firstElementChild?.remove();

    window.setTimeout(() => {
      node.classList.add("is-out");
      window.setTimeout(() => node.remove(), 220);
    }, 2800);
  }

  return {
    show,
    error: (message) => show(message, { tone: "error" }),
  };
}
