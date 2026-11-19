import { $ } from "../lib/dom.js";
import { createLayer } from "./panel.js";

export function initShortcuts() {
  const layer = $("#shortcuts-layer");
  if (!layer) return { open() {}, close() {} };
  const panel = createLayer(layer);
  layer.querySelectorAll("[data-close-shortcuts]").forEach((node) => {
    node.addEventListener("click", () => panel.close());
  });
  return {
    open: panel.open,
    close: panel.close,
  };
}
