import { countTo } from "../lib/dom.js";
import { number } from "../lib/format.js";

export function renderStats(root, stats, { locale }) {
  if (!root) return;
  const values = {
    sites: stats?.sites,
    pages: stats?.pages,
    tabs: stats?.tabs,
  };

  for (const [key, value] of Object.entries(values)) {
    const node = root.querySelector(`[data-stat="${key}"]`);
    if (!node) continue;
    if (value == null) {
      node.textContent = "—";
      node.dataset.value = "0";
      continue;
    }
    const capped = stats?.capped && (key === "pages" || key === "sites");
    countTo(node, value, (current) => {
      const text = number(current, locale);
      return capped && current === value ? `${text}+` : text;
    });
  }
}
