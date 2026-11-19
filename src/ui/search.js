/* Командная палитра одновременно служит полем поиска на стартовой странице.
   Она ищет по живой истории, закладкам и открытым вкладкам и показывает небольшой
   набор команд после ведущего ">". */

import { api, isNavigable, normalizeUrl, safe } from "../lib/api.js";
import { clear, el, highlight, isTextInput } from "../lib/dom.js";
import { dateShort, hostOf, letterOf, relative, timeHM } from "../lib/format.js";
import { score } from "../lib/fuzzy.js";
import { loadTabs } from "../lib/data.js";

export function initSearch(ctx) {
  const wrap = document.querySelector("#search-wrap");
  const input = document.querySelector("#search-input");
  const palette = document.querySelector("#palette");
  const list = document.querySelector("#palette-list");
  if (!wrap || !input || !palette || !list) return { focus() {} };

  let items = [];
  let active = -1;
  let open = false;
  let token = 0;
  let queryTimer = 0;
  let tabsCache = { at: 0, value: { all: [] } };
  const MAX_QUERY = 160;

  function isPaletteOpen() {
    return open;
  }

  function setOpen(next) {
    open = next;
    palette.hidden = !next;
    input.setAttribute("aria-expanded", String(next));
    wrap.classList.toggle("is-open", next);
  }

  function close({ blur = false } = {}) {
    if (!open) return;
    setOpen(false);
    active = -1;
    items = [];
    window.clearTimeout(queryTimer);
    token += 1;
    input.removeAttribute("aria-activedescendant");
    input.value = "";
    clear(list);
    if (blur) input.blur();
  }

  function focusInput() {
    input.focus();
    input.select();
    setOpen(true);
    if (input.value.trim()) {
      void submitQuery(input.value);
    } else {
      showDefault();
    }
  }

  function when(timestamp) {
    const now = Date.now();
    if (!timestamp) return "";
    if (now - timestamp < 6 * 3_600_000) return relative(timestamp, ctx.locale, now);
    return `${dateShort(timestamp, ctx.locale)}, ${timeHM(timestamp, ctx.locale, !ctx.settings.clock24)}`;
  }

  function render(groups) {
    items = [];
    const fragment = document.createDocumentFragment();

    for (const group of groups) {
      if (!group.items.length) continue;
      if (group.label) {
        fragment.append(
          el(
            "div",
            { class: "palette__group", role: "presentation" },
            el("span", { text: group.label }),
            el("span", { text: String(group.items.length) })
          )
        );
      }
      for (const item of group.items) {
        const index = items.length;
        items.push(item);
        fragment.append(renderItem(item, index));
      }
    }

    if (!items.length) {
      fragment.append(
        el("div", { class: "palette__empty", text: ctx.t("palette.empty") })
      );
    }

    list.replaceChildren(fragment);
    setActive(items.length ? 0 : -1);
    setOpen(true);
  }

  function renderItem(item, index) {
    const tile =
      item.type === "command"
        ? el("span", { class: "tile tile--num", text: "›" })
        : el("span", { class: "tile", text: letterOf(item.title, item.host) });

    const title = el("span", { class: "palette__title" });
    if (item.titleRanges?.length) title.append(highlight(item.title, item.titleRanges));
    else title.textContent = item.title;

    const text = el("span", { class: "palette__text" }, title);
    if (item.host) {
      const sub = el("span", { class: "palette__sub" });
      if (item.hostRanges?.length) {
        sub.append(highlight(item.host, item.hostRanges));
        if (item.subSuffix) sub.append(` · ${item.subSuffix}`);
      } else {
        sub.textContent = item.sub ?? "";
      }
      if (sub.textContent) text.append(sub);
    } else if (item.sub) {
      text.append(el("span", { class: "palette__sub", text: item.sub }));
    }

    const node = el(
      "button",
      {
        class: "palette__item",
        type: "button",
        role: "option",
        id: `pal-item-${index}`,
        "aria-selected": "false",
      },
      tile,
      text,
      item.hint ? el("span", { class: "palette__hint", text: item.hint }) : null
    );

    node.addEventListener("mousedown", (event) => event.preventDefault());
    node.addEventListener("mouseenter", () => setActive(index));
    node.addEventListener("click", () => activate(item));
    return node;
  }

  function setActive(index) {
    if (!items.length) {
      active = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    active = Math.max(0, Math.min(index, items.length - 1));
    const nodes = list.querySelectorAll(".palette__item");
    nodes.forEach((node, nodeIndex) => {
      node.setAttribute("aria-selected", String(nodeIndex === active));
    });
    input.setAttribute("aria-activedescendant", `pal-item-${active}`);
    nodes[active]?.scrollIntoView({ block: "nearest" });
  }

  function activate(item, { newTab = false } = {}) {
    if (!item) return;
    close();
    if (item.type === "command") {
      item.run?.();
      return;
    }
    if (item.type === "tab") {
      if (newTab) ctx.openUrl(item.url, true);
      else ctx.activateTab(item.tabId, item.windowId);
      return;
    }
    ctx.openUrl(item.url, newTab);
  }

  function showDefault() {
    const history = ctx.getSnapshot()?.history;
    const source = history?.today?.length ? history.today : history?.week ?? [];
    const recent = source.slice(0, 6);

    if (!recent.length) {
      items = [];
      active = -1;
      list.replaceChildren(
        el("div", { class: "palette__empty", text: ctx.t("palette.start") })
      );
      input.removeAttribute("aria-activedescendant");
      setOpen(true);
      return;
    }

    render([
      {
        label: ctx.t("palette.recent"),
        items: recent.map((item) => ({
          type: "history",
          url: item.url,
          title: item.title || item.host,
          host: item.host,
          sub: `${item.host} · ${when(item.lastVisitTime)}`,
          titleRanges: [],
        })),
      },
    ]);
  }

  function commandItems(query) {
    const themeKey = {
      system: "settings.themeSystem",
      light: "settings.themeLight",
      dark: "settings.themeDark",
    }[ctx.settings.theme];

    const commands = [
      {
        type: "command",
        title: ctx.t("cmd.theme"),
        sub: ctx.t(themeKey),
        hint: "›",
        run: () => ctx.cycleTheme(),
      },
      {
        type: "command",
        title: ctx.t("cmd.settings"),
        sub: "",
        hint: "›",
        run: () => ctx.openSettings(),
      },
      {
        type: "command",
        title: ctx.t("cmd.shortcuts"),
        sub: "",
        hint: "›",
        run: () => ctx.openShortcuts(),
      },
      {
        type: "command",
        title: ctx.t("cmd.refresh"),
        sub: "",
        hint: "›",
        run: () => ctx.refresh({ force: true, announce: true }),
      },
    ];

    const duplicates = ctx.getSnapshot()?.tabs?.duplicates?.length ?? 0;
    if (duplicates > 0) {
      commands.push({
        type: "command",
        title: ctx.t("cmd.dupes"),
        sub: `(${duplicates})`,
        hint: "›",
        run: () => ctx.requestCloseDuplicates(),
      });
    }

    const scored = commands
      .map((command) => {
        const match = query ? score(query, command.title) : { score: 0, ranges: [] };
        return match ? { ...command, titleRanges: match.ranges, rating: match.score } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating);

    if (!scored.length) {
      render([]);
      return;
    }
    render([{ label: ctx.t("palette.commands"), items: scored }]);
  }

  async function getTabs() {
    if (Date.now() - tabsCache.at < 4000) return tabsCache.value;
    const value = await loadTabs();
    tabsCache = { at: Date.now(), value };
    return value;
  }

  function rankTabs(tabs, query) {
    return tabs.all
      .map((tab) => {
        const title = tab.title || tab.host || tab.url;
        const titleMatch = score(query, title);
        const hostMatch = score(query, tab.host || "");
        const rating = Math.max(titleMatch?.score ?? -Infinity, (hostMatch?.score ?? -Infinity) - 6);
        if (!Number.isFinite(rating)) return null;
        return {
          type: "tab",
          tabId: tab.id,
          windowId: tab.windowId,
          url: tab.url,
          title,
          host: tab.host,
          sub: tab.host,
          titleRanges: titleMatch?.ranges ?? [],
          hostRanges: hostMatch?.ranges ?? [],
          rating,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }

  function rankHistory(entries, query) {
    return entries
      .map((entry) => {
        const title = (entry.title || "").trim() || hostOf(entry.url);
        const titleMatch = score(query, title);
        const hostMatch = score(query, hostOf(entry.url));
        let rating = Math.max(
          titleMatch?.score ?? -Infinity,
          (hostMatch?.score ?? -Infinity) - 6
        );
        if (!Number.isFinite(rating) && String(entry.url).toLowerCase().includes(query.toLowerCase())) {
          rating = 12;
        }
        if (!Number.isFinite(rating)) return null;
        return {
          type: "history",
          url: entry.url,
          title,
          host: hostOf(entry.url),
          sub: `${hostOf(entry.url)} · ${when(entry.lastVisitTime)}`,
          subSuffix: when(entry.lastVisitTime),
          titleRanges: titleMatch?.ranges ?? [],
          hostRanges: hostMatch?.ranges ?? [],
          rating,
          lastVisitTime: entry.lastVisitTime ?? 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating || b.lastVisitTime - a.lastVisitTime)
      .slice(0, 6);
  }

  function rankBookmarks(nodes, query) {
    return nodes
      .filter((node) => node && node.url && isNavigable(node.url))
      .map((node) => {
        const title = (node.title || "").trim() || hostOf(node.url);
        const titleMatch = score(query, title);
        const hostMatch = score(query, hostOf(node.url));
        const rating = Math.max(
          titleMatch?.score ?? -Infinity,
          (hostMatch?.score ?? -Infinity) - 6
        );
        if (!Number.isFinite(rating)) return null;
        return {
          type: "bookmark",
          url: node.url,
          title,
          host: hostOf(node.url),
          sub: hostOf(node.url),
          titleRanges: titleMatch?.ranges ?? [],
          hostRanges: hostMatch?.ranges ?? [],
          rating,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);
  }

  async function submitQuery(rawQuery) {
    const query = String(rawQuery).trim().slice(0, MAX_QUERY);
    if (!query) {
      showDefault();
      return;
    }
    if (query.startsWith(">")) {
      commandItems(query.slice(1).trim());
      return;
    }

    const myToken = ++token;
    const [historyEntries, bookmarkNodes] = await Promise.all([
      safe(
        () => api.history.search({ text: query, startTime: 0, maxResults: 25 }),
        [],
        "search.history"
      ),
      safe(() => api.bookmarks.search(query), [], "search.bookmarks"),
    ]);
    const tabs = await getTabs();
    if (myToken !== token || !open) return;

    const seen = new Set();
    const unique = (entries) =>
      entries.filter((entry) => {
        if (!entry.url) return false;
        const key = normalizeUrl(entry.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    // Сохранённые страницы важнее открытой или недавней: закладка —
    // более осознанный источник и должна быть выше.
    const bookmarkItems = unique(rankBookmarks(bookmarkNodes, query));
    const tabItems = unique(rankTabs(tabs, query));
    const historyItems = unique(rankHistory(historyEntries, query));

    const groups = [];
    if (bookmarkItems.length) {
      groups.push({ label: ctx.t("palette.bookmarks"), items: bookmarkItems });
    }
    if (tabItems.length) {
      groups.push({ label: ctx.t("palette.tabs"), items: tabItems });
    }
    if (historyItems.length) {
      groups.push({ label: ctx.t("palette.history"), items: historyItems });
    }

    render(groups);
  }

  input.addEventListener("input", () => {
    window.clearTimeout(queryTimer);
    token += 1;
    setOpen(true);
    const query = input.value;
    if (!query.trim()) {
      showDefault();
      return;
    }
    queryTimer = window.setTimeout(() => {
      void submitQuery(query);
    }, 130);
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      void submitQuery(input.value);
    } else {
      showDefault();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) focusInput();
      else setActive(active + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) focusInput();
      else setActive(active - 1);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(items.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (!open) return;
      activate(items[active] ?? items[0], {
        newTab: event.ctrlKey || event.metaKey,
      });
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        close({ blur: true });
      }
    } else if (event.key === "Tab") {
      close({ blur: true });
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!open) return;
    if (!wrap.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    const typing = isTextInput(event.target);
    const locked = document.body.classList.contains("is-locked");
    if (locked) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      focusInput();
      return;
    }
    if (!typing && !locked && (event.key === "/" || event.key === "?")) {
      event.preventDefault();
      if (event.key === "/") focusInput();
      else ctx.openShortcuts();
      return;
    }
    if (!typing && !locked && event.altKey && event.key === ",") {
      event.preventDefault();
      ctx.openSettings();
    }
  });

  return {
    focus: focusInput,
    close,
    isOpen: isPaletteOpen,
  };
}
