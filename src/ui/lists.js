/* Чистый рендеринг разделов дашборда. Все пользовательские строки проходят
   через textContent; ничего не интерполируется как HTML. */

import { bytes, dateShort, letterOf, number, percent, timeHM } from "../lib/format.js";
import { icon, el, confirmInline } from "../lib/dom.js";

function fillEmpty(node, message) {
  node.replaceChildren(
    el("span", { class: "empty__glyph", "aria-hidden": "true", text: "∅" }),
    el("p", { class: "empty__text", text: message })
  );
}

function meta(parts) {
  const node = el("span", { class: "item__meta" });
  const clean = parts.filter((part) => part != null && part !== "");
  clean.forEach((part, index) => {
    if (index) node.append(el("span", { class: "sep", "aria-hidden": "true", text: "·" }));
    if (part instanceof Node) node.append(part);
    else node.append(el("span", { text: String(part) }));
  });
  return node;
}

function actionButton(name, label, onClick, action = "") {
  const button = el(
    "button",
    { class: "icon-btn", type: "button", title: label, "aria-label": label },
    icon(name)
  );
  if (action) button.dataset.action = action;
  button.addEventListener("click", onClick);
  return button;
}

function timeLabel(timestamp, ctx) {
  if (!timestamp) return "";
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const withTime = timeHM(timestamp, ctx.locale, !ctx.settings.clock24);
  if (timestamp >= start.getTime()) return withTime;
  return `${dateShort(timestamp, ctx.locale)}, ${withTime}`;
}

export function renderSkeleton(list, rows = 5) {
  if (!list) return;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < rows; index += 1) {
    fragment.append(
      el(
        "li",
        { class: "skel-row", "aria-hidden": "true" },
        el("span", { class: "skel skel--tile" }),
        el(
          "span",
          {},
          el("span", {
            class: "skel",
            style: { width: `${62 - ((index * 13) % 24)}%` },
          }),
          el("span", {
            class: "skel skel--short",
            style: { width: `${34 - ((index * 7) % 14)}%` },
          })
        )
      )
    );
  }
  list.replaceChildren(fragment);
}

export function renderBookmarkSkeleton(list, rows = 6) {
  if (!list) return;
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < rows; index += 1) {
    fragment.append(
      el(
        "li",
        { class: "skel-tile", "aria-hidden": "true" },
        el("span", { class: "skel skel--tile" }),
        el(
          "span",
          {},
          el("span", {
            class: "skel",
            style: { width: `${58 - ((index * 9) % 20)}%` },
          }),
          el("span", {
            class: "skel skel--short",
            style: { width: `${30 - ((index * 4) % 12)}%` },
          })
        )
      )
    );
  }
  list.replaceChildren(fragment);
}

export function renderHistory(els, items, ctx, ui) {
  const { list, empty, foot, more } = els;
  const LIMIT = 10;
  const expanded = Boolean(ui.expanded);
  const visible = expanded ? items : items.slice(0, LIMIT);
  const fragment = document.createDocumentFragment();

  for (const item of visible) {
    const saved = ctx.bookmarked.has(item.url);
    const actions = el("div", { class: "item__actions" });

    const star = actionButton(
      saved ? "star-filled" : "star",
      ctx.t(saved ? "history.removeBookmark" : "history.addBookmark"),
      async () => {
        star.disabled = true;
        await ctx.actions.toggleBookmark(item);
        star.disabled = false;
      },
      "bookmark"
    );
    star.dataset.bookmarkUrl = item.url;
    star.setAttribute("aria-pressed", String(saved));

    star.title = ctx.t(saved ? "history.removeBookmark" : "history.addBookmark");
    star.setAttribute("aria-label", star.title);

    actions.append(
      star,
      actionButton(
        "arrow-up-right",
        ctx.t("history.newTab"),
        () => {
          ctx.actions.openNewTab(item.url);
        },
        "newtab"
      ),
      actionButton(
        "trash",
        ctx.t("history.remove"),
        () => {
          confirmInline(actions, ctx.t("history.removeConfirm"), {
            yesLabel: ctx.t("history.confirm"),
            noLabel: ctx.t("history.cancel"),
            onYes: () => {
              void ctx.actions.deleteHistory(item);
            },
          });
        },
        "delete"
      )
    );

    const link = el(
      "a",
      { class: "item__link", href: item.url },
      el("span", { class: "tile", text: letterOf(item.host, item.title) }),
      el(
        "span",
        { class: "item__text" },
        el("span", { class: "item__title", text: item.title || item.host }),
        meta([el("span", { class: "item__host", text: item.host }), timeLabel(item.lastVisitTime, ctx)])
      )
    );
    link.title = item.title || item.url;

    fragment.append(el("li", { class: "item" }, link, actions));
  }

  list.replaceChildren(fragment);
  empty.hidden = items.length > 0;
  if (!items.length) fillEmpty(empty, ctx.t("history.empty"));
  foot.hidden = items.length <= LIMIT;
  more.textContent = expanded
    ? ctx.t("history.less")
    : ctx.t("history.more", { n: items.length - LIMIT });
}

export function renderBookmarks(els, bookmarks, ctx, ui) {
  const { chips, list, empty, foot, more, count } = els;
  const folder = ui.folder ?? "all";
  const expanded = Boolean(ui.expanded);

  count.textContent = number(bookmarks.visible.length, ctx.locale);

  chips.hidden = bookmarks.folders.length === 0;
  chips.replaceChildren();
  if (bookmarks.folders.length) {
    const options = [
      { id: "all", title: ctx.t("bm.all"), count: bookmarks.visible.length },
      ...bookmarks.folders,
    ];
    for (const option of options) {
      const chip = el(
        "button",
        {
          class: `chip${option.id === folder ? " is-active" : ""}`,
          type: "button",
          "aria-pressed": String(option.id === folder),
        },
        el("span", { class: "chip__label", text: option.title }),
        el("span", { class: "chip__count", text: String(option.count) })
      );
      chip.addEventListener("click", () => ctx.actions.setBookmarkFolder(option.id));
      chips.append(chip);
    }
  }

  let items = folder === "all" ? bookmarks.visible : bookmarks.visible.filter(
    (bookmark) => bookmark.folderIds.includes(folder)
  );
  items = [...items].sort((a, b) => {
    if (folder === "all") return b.dateAdded - a.dateAdded;
    return a.title.localeCompare(b.title, ctx.locale);
  });

  const LIMIT = 9;
  const visible = expanded ? items : items.slice(0, LIMIT);
  const fragment = document.createDocumentFragment();

  for (const bookmark of visible) {
    const actions = el(
      "div",
      { class: "bookmark-tile__actions" },
      actionButton("copy", ctx.t("bm.copy"), () => ctx.actions.copyUrl(bookmark.url), "copy"),
      actionButton(
        "arrow-up-right",
        ctx.t("history.newTab"),
        () => {
          ctx.actions.openNewTab(bookmark.url);
        },
        "newtab"
      )
    );

    const metaNode = el("span", { class: "bookmark-tile__meta" });
    if (bookmark.folderTitle) {
      metaNode.append(
        el("span", { class: "bookmark-tile__folder", text: bookmark.folderTitle }),
        document.createTextNode(" · ")
      );
    }
    metaNode.append(el("span", { text: bookmark.host || ctx.t("bm.folder") }));

    const link = el(
      "a",
      { class: "bookmark-tile__link", href: bookmark.url, title: bookmark.title },
      el("span", { class: "tile", text: letterOf(bookmark.host, bookmark.title) }),
      el(
        "span",
        { class: "bookmark-tile__body" },
        el("span", { class: "bookmark-tile__title", text: bookmark.title }),
        metaNode
      )
    );

    fragment.append(el("li", { class: "bookmark-tile" }, link, actions));
  }

  list.replaceChildren(fragment);
  list.hidden = items.length === 0;
  empty.hidden = items.length > 0;
  if (!items.length) {
    fillEmpty(empty, folder === "all" ? ctx.t("bm.emptyAll") : ctx.t("bm.empty"));
  }
  foot.hidden = items.length <= LIMIT;
  more.textContent = expanded
    ? ctx.t("history.less")
    : ctx.t("bm.more", { n: items.length - LIMIT });
}

export function renderTabs(els, tabs, ctx) {
  const { list, empty, count, dupes } = els;
  const fragment = document.createDocumentFragment();
  const groups = tabs.groups.filter((group) => group.tabs.length);
  const multiple = groups.length > 1;

  count.textContent = number(tabs.all.length, ctx.locale);
  dupes.hidden = tabs.duplicates.length === 0;
  dupes.textContent = ctx.t("tabs.duplicates", { n: tabs.duplicates.length });

  groups.forEach((group, groupIndex) => {
    if (multiple) {
      fragment.append(
        el(
          "li",
          { class: "group-label", "aria-hidden": "true" },
          el("span", { text: ctx.t("tabs.window", { n: groupIndex + 1 }) }),
          el("span", { text: String(group.tabs.length) })
        )
      );
    }

    for (const tab of group.tabs) {
      const close = actionButton(
        "close",
        ctx.t("tabs.close"),
        async () => {
          close.disabled = true;
          await ctx.actions.closeTab(tab);
        },
        "close"
      );

      const link = el(
        "button",
        { class: "item__link", type: "button" },
        el("span", { class: "tile", text: letterOf(tab.host, tab.title) }),
        el(
          "span",
          { class: "item__text" },
          el("span", { class: "item__title", text: tab.title || tab.host }),
          meta([
            el("span", { class: "item__host", text: tab.host }),
            tab.pinned ? ctx.t("tabs.pinned") : null,
          ])
        )
      );
      link.title = tab.title || tab.url;
      link.addEventListener("click", () => ctx.actions.activateTab(tab));

      fragment.append(
        el(
          "li",
          { class: "item" },
          link,
          el("div", { class: "item__actions" }, close)
        )
      );
    }
  });

  list.replaceChildren(fragment);
  empty.hidden = tabs.all.length > 0;
  if (!tabs.all.length) fillEmpty(empty, ctx.t("tabs.empty"));
}

export function renderDownloads(els, downloads, ctx) {
  const { list, empty } = els;
  const fragment = document.createDocumentFragment();

  for (const item of downloads) {
    const inProgress = item.state === "in_progress";
    const interrupted = item.state === "interrupted";
    const done = item.state === "complete";

    let stateText = "";
    if (inProgress) {
      stateText = ctx.t("dl.progress", { p: percent(item.received, item.total) });
    } else if (interrupted) {
      stateText = ctx.t("dl.interrupted");
    } else if (done) {
      stateText = ctx.t("dl.done");
    } else {
      stateText = ctx.t("dl.failed");
    }

    const metaNode = meta([
      el("span", { class: "item__host", text: item.host }),
      stateText,
      done ? bytes(item.total || item.received, ctx.locale) : null,
    ]);
    if (inProgress) {
      metaNode.append(
        el(
          "span",
          { class: "mini-bar" },
          el("i", { style: { width: `${percent(item.received, item.total)}%` } })
        )
      );
    }

    const actions = el("div", { class: "item__actions" });
    if (done && item.exists) {
      actions.append(
        actionButton(
          "arrow-up-right",
          ctx.t("dl.open"),
          async () => {
            await ctx.actions.openDownload(item);
          },
          "download-open"
        )
      );
    }
    if (item.exists) {
      actions.append(
        actionButton(
          "folder",
          ctx.t("dl.show"),
          async () => {
            await ctx.actions.showDownload(item);
          },
          "download-show"
        )
      );
    }

    const body = el(
      "div",
      { class: "item__link item__link--static" },
      el("span", { class: "tile tile--ext", text: item.ext }),
      el(
        "span",
        { class: "item__text" },
        el("span", { class: "item__title", text: item.name || item.filename }),
        metaNode
      )
    );
    body.title = item.filename;

    fragment.append(el("li", { class: "item" }, body, actions));
  }

  list.replaceChildren(fragment);
  empty.hidden = downloads.length > 0;
  if (!downloads.length) fillEmpty(empty, ctx.t("dl.empty"));
}
