/* Preview-only WebExtension mock. Not shipped in the extension build.
   Serves deterministic, realistic data so the real page can be exercised
   and screenshotted outside Firefox. */
(() => {
  "use strict";

  window.__monoErrors = [];
  window.__monoWarnings = [];
  window.addEventListener("error", (event) => {
    window.__monoErrors.push(String(event.message || event.error || "error"));
  });
  window.addEventListener("unhandledrejection", (event) => {
    window.__monoErrors.push(`rejection: ${String(event.reason)}`);
  });
  const originalWarn = console.warn.bind(console);
  console.warn = (...args) => {
    window.__monoWarnings.push(args.map((arg) => String(arg)).join(" "));
    originalWarn(...args);
  };
  const originalError = console.error.bind(console);
  console.error = (...args) => {
    window.__monoErrors.push(args.map((arg) => String(arg)).join(" "));
    originalError(...args);
  };

  const params = new URLSearchParams(location.search);
  const theme = params.get("theme") || "system";
  const locale = params.get("locale") === "en" ? "en" : "ru";
  const width = params.get("width") === "wide" ? "wide" : "comfort";

  try {
    localStorage.setItem(
      "mono.settings.mirror.v1",
      JSON.stringify({ theme, width, locale, clock24: true, seconds: false })
    );
  } catch {
    /* ignore */
  }

  const MINUTE = 60_000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const now = Date.now();
  const dayStart = (() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  })();
  const todaySpan = Math.max(now - dayStart - 8 * MINUTE, 45 * MINUTE);

  const wait = (ms = 18) => new Promise((resolve) => setTimeout(resolve, ms));
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function seeded(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  const random = seeded(4217);

  const TODAY = [
    ["https://github.com/nous-research/hermes", "nous-research/hermes: agent framework", "github.com"],
    [
      "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history",
      "history — WebExtensions API · MDN",
      "developer.mozilla.org",
    ],
    ["https://news.ycombinator.com/", "Hacker News", "news.ycombinator.com"],
    ["https://www.figma.com/file/mono-dashboard/Mono", "Start page — dashboard explorations", "figma.com"],
    ["https://habr.com/ru/articles/812345/", "Как устроен Places в Firefox", "habr.com"],
    ["https://linear.app/nous/issue/MON-42/start-page-polish", "MON-42 — Start page polish", "linear.app"],
    [
      "https://stackoverflow.com/questions/7891234/css-light-dark",
      "CSS light-dark() and color-scheme — Stack Overflow",
      "stackoverflow.com",
    ],
    ["https://www.youtube.com/watch?v=8QnHqL7cS0A", "Dieter Rams: Less but better", "youtube.com"],
    ["https://www.are.na/mono/channels/swiss-grid-systems", "Swiss grid systems — Are.na", "are.na"],
    ["https://read.cv/egor", "Egor Rudin — read.cv", "read.cv"],
    ["https://fontsinuse.com/", "Fonts In Use", "fontsinuse.com"],
    ["https://docs.python.org/3/library/zipfile.html", "zipfile — Python documentation", "docs.python.org"],
    ["https://addons.mozilla.org/en-US/firefox/", "Mozilla Add-ons", "addons.mozilla.org"],
    ["https://dribbble.com/shots/popular/web-design", "Web design shots — Dribbble", "dribbble.com"],
  ];

  const todayHistory = TODAY.map(([url, title, host], index) => {
    const fraction = TODAY.length > 1 ? index / (TODAY.length - 1) : 0;
    const lastVisitTime = Math.max(
      dayStart + 2 * MINUTE,
      Math.min(now - 2 * MINUTE, Math.round(now - 5 * MINUTE - fraction * (todaySpan - 12 * MINUTE)))
    );
    return {
      id: 1000 + index,
      url,
      title,
      lastVisitTime,
      visitCount: 4 + ((index * 3) % 17),
      host,
    };
  });

  const DOMAINS = [
    {
      origin: "https://github.com",
      paths: ["/mozilla/firefox", "/mozilla/gecko-dev", "/nous-research/hermes", "/egrudin/start-page", "/denoland/deno"],
      titles: ["mozilla/firefox", "mozilla/gecko-dev", "nous-research/hermes", "egrudin/start-page", "denoland/deno"],
      total: 22,
    },
    {
      origin: "https://developer.mozilla.org",
      paths: [
        "/en-US/docs/Web/CSS/color_value/light-dark",
        "/en-US/docs/Web/API/IndexedDB_API",
        "/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json",
        "/en-US/docs/Web/CSS/container_queries",
      ],
      titles: ["light-dark()", "IndexedDB API", "manifest.json", "Container queries"],
      total: 14,
    },
    {
      origin: "https://news.ycombinator.com",
      paths: ["/item?id=4210001", "/item?id=4210002", "/item?id=4210003", "/"],
      titles: ["Hacker News", "Hacker News — thread", "Show HN", "Hacker News"],
      total: 10,
    },
    {
      origin: "https://www.figma.com",
      paths: ["/file/mono-dashboard/Mono", "/file/swiss-grid/Swiss", "/file/type-scale/Scale"],
      titles: ["Start page — dashboard", "Swiss grid", "Type scale"],
      total: 8,
    },
    {
      origin: "https://www.youtube.com",
      paths: ["/watch?v=8QnHqL7cS0A", "/watch?v=7Entw2F8y1c", "/watch?v=0N7vS3k2"],
      titles: ["Dieter Rams: Less but better", "The grid system", "Typography for interfaces"],
      total: 7,
    },
    {
      origin: "https://habr.com",
      paths: ["/ru/articles/812345/", "/ru/articles/801122/", "/ru/articles/799001/"],
      titles: ["Как устроен Places в Firefox", "Дизайн-система на токенах", "Локальные расширения"],
      total: 6,
    },
    {
      origin: "https://linear.app",
      paths: ["/nous/issue/MON-42/start-page-polish", "/nous/issue/MON-38/palette"],
      titles: ["MON-42", "MON-38"],
      total: 5,
    },
    {
      origin: "https://stackoverflow.com",
      paths: ["/questions/7891234/css-light-dark", "/questions/7880001/web-ext-newtab"],
      titles: ["light-dark()", "Override the new tab page"],
      total: 5,
    },
    {
      origin: "https://www.are.na",
      paths: ["/mono/channels/swiss-grid-systems", "/mono/channels/mono-type"],
      titles: ["Swiss grid systems", "Type references"],
      total: 4,
    },
    {
      origin: "https://www.npmjs.com",
      paths: ["/package/web-ext", "/package/vite"],
      titles: ["web-ext", "vite"],
      total: 3,
    },
  ];

  const monthHistory = [];
  let historyId = 5000;
  for (const domain of DOMAINS) {
    for (let index = 0; index < domain.total; index += 1) {
      const path = domain.paths[index % domain.paths.length];
      const slug = path.split("/").filter(Boolean).pop()?.slice(0, 24) || "page";
      const suffix = index >= domain.paths.length ? `?ref=${index}` : "";
      const daysAgo = 1 + Math.floor(random() * 28);
      monthHistory.push({
        id: historyId++,
        url: `${domain.origin}${path}${suffix}`,
        title: `${domain.titles[index % domain.titles.length]}${index >= domain.titles.length ? ` · ${slug}` : ""}`,
        lastVisitTime:
          now - daysAgo * DAY - Math.floor(random() * 12) * HOUR - Math.floor(random() * 60) * MINUTE,
        visitCount: 2 + Math.floor(random() * 20),
      });
    }
  }

  todayHistory.push(
    {
      id: 1101,
      url: "https://github.com/nous-research/hermes/pulls",
      title: "Pull requests · nous-research/hermes",
      host: "github.com",
      lastVisitTime: now - 12 * MINUTE,
      visitCount: 8,
    },
    {
      id: 1102,
      url: "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark",
      title: "light-dark() — CSS · MDN",
      host: "developer.mozilla.org",
      lastVisitTime: now - 37 * MINUTE,
      visitCount: 6,
    },
    {
      id: 1103,
      url: "https://www.figma.com/file/mono-dashboard/Mono",
      title: "Start page — dashboard explorations",
      host: "figma.com",
      lastVisitTime: now - 68 * MINUTE,
      visitCount: 21,
    },
    {
      id: 1104,
      url: "https://news.ycombinator.com/item?id=4210001",
      title: "Hacker News — thread",
      host: "news.ycombinator.com",
      lastVisitTime: now - 104 * MINUTE,
      visitCount: 4,
    }
  );
  todayHistory.sort((a, b) => b.lastVisitTime - a.lastVisitTime);

  const historyEntries = [
    ...todayHistory,
    ...monthHistory.filter((entry) => entry.lastVisitTime < dayStart),
  ].sort((a, b) => b.lastVisitTime - a.lastVisitTime);

  const bookmark = (id, title, url, dateAdded, folderId) => ({
    id,
    title,
    url,
    dateAdded,
    type: "bookmark",
    parentId: folderId,
  });

  const bookmarkTree = {
    id: "root________",
    title: "",
    type: "folder",
    children: [
      {
        id: "toolbar_____",
        title: "Панель закладок",
        type: "folder",
        children: [
          {
            id: "f-design",
            title: "Дизайн",
            type: "folder",
            children: [
              bookmark("b1", "Start page — dashboard explorations", "https://www.figma.com/file/mono-dashboard/Mono", now - 2 * DAY, "f-design"),
              bookmark("b2", "Swiss grid systems", "https://www.are.na/mono/channels/swiss-grid-systems", now - 4 * DAY, "f-design"),
              bookmark("b3", "Fonts In Use", "https://fontsinuse.com/", now - 9 * DAY, "f-design"),
              bookmark("b4", "Type scale calculator", "https://typescale.com/", now - 16 * DAY, "f-design"),
            ],
          },
          {
            id: "f-dev",
            title: "Разработка",
            type: "folder",
            children: [
              bookmark("b5", "WebExtensions · history", "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history", now - 3 * DAY, "f-dev"),
              bookmark("b6", "mozilla-firefox/firefox", "https://github.com/mozilla/firefox", now - 5 * DAY, "f-dev"),
              bookmark("b7", "web-ext", "https://www.npmjs.com/package/web-ext", now - 12 * DAY, "f-dev"),
              bookmark("b8", "Places database schema", "https://firefox-source-docs.mozilla.org/toolkit/components/places/", now - 20 * DAY, "f-dev"),
              bookmark("b9", "CSS light-dark()", "https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark", now - 1 * DAY, "f-dev"),
            ],
          },
          {
            id: "f-read",
            title: "Чтение",
            type: "folder",
            children: [
              bookmark("b10", "The Anatomy of a New Tab", "https://www.nngroup.com/articles/new-tab-page/", now - 6 * DAY, "f-read"),
              bookmark("b11", "Local-first software", "https://www.inkandswitch.com/local-first/", now - 11 * DAY, "f-read"),
              bookmark("b12", "Dieter Rams: ten principles", "https://www.vitsoe.com/us/about/good-design", now - 18 * DAY, "f-read"),
            ],
          },
          bookmark("b13", "Mozilla Add-ons", "https://addons.mozilla.org/en-US/firefox/", now - 7 * DAY, "toolbar_____"),
        ],
      },
      {
        id: "menu________",
        title: "Закладки меню",
        type: "folder",
        children: [
          bookmark("b14", "Firefox Release Notes", "https://www.mozilla.org/en-US/firefox/releases/", now - 25 * DAY, "menu________"),
          bookmark("b15", "Are.na", "https://www.are.na/", now - 30 * DAY, "menu________"),
        ],
      },
      { id: "unfiled_____", title: "Другие закладки", type: "folder", children: [] },
      { id: "mobile______", title: "Закладки на мобильном", type: "folder", children: [] },
    ],
  };

  const allBookmarkNodes = [];
  (function walk(node) {
    if (node.url) allBookmarkNodes.push(node);
    for (const child of node.children ?? []) walk(child);
  })(bookmarkTree);

  const currentTab = {
    id: 1,
    title: "Start page",
    url: "moz-extension://mock/pages/newtab.html",
    windowId: 10,
    active: true,
    pinned: false,
  };

  const tabs = [
    currentTab,
    {
      id: 2,
      title: "MON-42 — Start page polish",
      url: "https://linear.app/nous/issue/MON-42/start-page-polish",
      windowId: 10,
      active: false,
      pinned: true,
    },
    {
      id: 3,
      title: "nous-research/hermes — Pull requests",
      url: "https://github.com/nous-research/hermes/pulls",
      windowId: 10,
      active: false,
    },
    {
      id: 4,
      title: "Start page — dashboard explorations",
      url: "https://www.figma.com/file/mono-dashboard/Mono",
      windowId: 10,
      active: false,
    },
    {
      id: 5,
      title: "history — WebExtensions API · MDN",
      url: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history",
      windowId: 10,
      active: false,
    },
    {
      id: 6,
      title: "Dieter Rams: Less but better",
      url: "https://www.youtube.com/watch?v=8QnHqL7cS0A",
      windowId: 10,
      active: false,
    },
    {
      id: 7,
      title: "Hacker News",
      url: "https://news.ycombinator.com/",
      windowId: 10,
      active: false,
    },
    {
      id: 8,
      title: "Start page — dashboard explorations",
      url: "https://www.figma.com/file/mono-dashboard/Mono",
      windowId: 20,
      active: false,
    },
    {
      id: 9,
      title: "Swiss grid systems — Are.na",
      url: "https://www.are.na/mono/channels/swiss-grid-systems",
      windowId: 20,
      active: false,
    },
    {
      id: 10,
      title: "history — WebExtensions API · MDN",
      url: "https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/history",
      windowId: 20,
      active: false,
    },
    {
      id: 11,
      title: "Как устроен Places в Firefox",
      url: "https://habr.com/ru/articles/812345/",
      windowId: 20,
      active: false,
    },
  ];

  const closedSessions = [
    {
      lastModified: now - 9 * MINUTE,
      tab: {
        sessionId: "sess-1",
        url: "https://fontsinuse.com/",
        title: "Fonts In Use",
      },
    },
    {
      lastModified: now - 46 * MINUTE,
      tab: {
        sessionId: "sess-2",
        url: "https://www.inkandswitch.com/local-first/",
        title: "Local-first software",
      },
    },
    {
      lastModified: now - 3 * HOUR,
      window: {
        sessionId: "sess-3",
        tabs: [
          { url: "https://typescale.com/", title: "Type scale" },
          { url: "https://www.are.na/", title: "Are.na" },
          { url: "https://dribbble.com/shots/popular/web-design", title: "Dribbble" },
          { url: "https://www.nngroup.com/articles/new-tab-page/", title: "The Anatomy of a New Tab" },
        ],
      },
    },
  ];

  const downloads = [
    {
      id: 1,
      filename: "C:\\Users\\egrudin\\Downloads\\start-page-1.0.0.zip",
      url: "https://addons.mozilla.org/firefox/downloads/start-page.zip",
      state: "complete",
      bytesReceived: 48_213,
      totalBytes: 48_213,
      exists: true,
      startTime: now - 14 * MINUTE,
    },
    {
      id: 2,
      filename: "C:\\Users\\egrudin\\Downloads\\swiss-grid-poster.pdf",
      url: "https://example.org/swiss-grid-poster.pdf",
      state: "in_progress",
      bytesReceived: 3_500_000,
      totalBytes: 5_600_000,
      exists: true,
      startTime: now - 3 * MINUTE,
    },
    {
      id: 3,
      filename: "C:\\Users\\egrudin\\Downloads\\InterVariable.woff2",
      url: "https://rsms.me/inter/font-files/InterVariable.woff2",
      state: "complete",
      bytesReceived: 342_012,
      totalBytes: 342_012,
      exists: true,
      startTime: now - 2 * HOUR,
    },
    {
      id: 4,
      filename: "C:\\Users\\egrudin\\Downloads\\firefox-nightly.zip",
      url: "https://archive.mozilla.org/firefox-nightly.zip",
      state: "interrupted",
      bytesReceived: 8_400_000,
      totalBytes: 64_000_000,
      exists: false,
      error: "NETWORK_FAILURE",
      startTime: now - 30 * HOUR,
    },
  ];


  const storage = {};
  const sessionStore = {
    "mono.session.startedAt": now - 20 * HOUR,
  };

  const listeners = [];

  const api = {
    runtime: {
      id: "mock-start-page",
      getURL: (path) => `moz-extension://mock/${path}`,
      getManifest: () => ({ version: "1.0.0" }),
      getBrowserInfo: async () => {
        await wait();
        return { name: "Firefox", version: "145.0.2", buildID: "20261117000000" };
      },
    },
    i18n: {
      getUILanguage: () => (locale === "ru" ? "ru-RU" : "en-US"),
    },
    storage: {
      local: {
        get: async (key) => {
          await wait(8);
          if (key == null) return clone(storage);
          if (typeof key === "string") {
            return Object.hasOwn(storage, key) ? { [key]: clone(storage[key]) } : {};
          }
          return {};
        },
        set: async (items) => {
          await wait(8);
          Object.assign(storage, clone(items));
          for (const listener of listeners) listener({}, "local");
        },
        remove: async (keys) => {
          await wait(8);
          for (const key of Array.isArray(keys) ? keys : [keys]) delete storage[key];
          for (const listener of listeners) listener({}, "local");
        },
      },
      session: {
        get: async (key) => {
          await wait(4);
          if (typeof key === "string") {
            return Object.hasOwn(sessionStore, key)
              ? { [key]: clone(sessionStore[key]) }
              : {};
          }
          return clone(sessionStore);
        },
        set: async (items) => {
          await wait(4);
          Object.assign(sessionStore, clone(items));
        },
        remove: async (keys) => {
          await wait(4);
          for (const key of Array.isArray(keys) ? keys : [keys]) delete sessionStore[key];
        },
      },
      onChanged: {
        addListener: (listener) => listeners.push(listener),
      },
    },
    history: {
      search: async ({ text = "", startTime = 0, maxResults = 100 } = {}) => {
        await wait();
        const needle = text.toLowerCase();
        const seen = new Set();
        return clone(
          historyEntries
            .filter((entry) => entry.lastVisitTime >= startTime)
            .filter(
              (entry) =>
                !needle ||
                entry.title.toLowerCase().includes(needle) ||
                entry.url.toLowerCase().includes(needle)
            )
            .sort((a, b) => b.lastVisitTime - a.lastVisitTime)
            .filter((entry) => {
              if (seen.has(entry.url)) return false;
              seen.add(entry.url);
              return true;
            })
            .slice(0, maxResults)
        );
      },
      deleteUrl: async ({ url }) => {
        await wait();
        for (let index = historyEntries.length - 1; index >= 0; index -= 1) {
          if (historyEntries[index].url === url) historyEntries.splice(index, 1);
        }
      },
    },
    bookmarks: {
      getTree: async () => {
        await wait();
        return [clone(bookmarkTree)];
      },
      search: async (query) => {
        await wait();
        if (query && typeof query === "object") {
          if (query.url) {
            return clone(allBookmarkNodes.filter((node) => node.url === query.url));
          }
          if (query.query) return clone(allBookmarkNodes.filter((node) => node.title.includes(query.query)));
          return [];
        }
        const needle = String(query ?? "").toLowerCase();
        return clone(
          allBookmarkNodes.filter(
            (node) =>
              !needle ||
              node.title.toLowerCase().includes(needle) ||
              node.url.toLowerCase().includes(needle)
          )
        );
      },
      create: async ({ title, url, parentId = "unfiled_____" }) => {
        await wait();
        const node = bookmark(`b-${Date.now()}`, title || url, url, Date.now(), parentId);
        const target = (function find(current) {
          if (current.id === parentId) return current;
          for (const child of current.children ?? []) {
            const hit = find(child);
            if (hit) return hit;
          }
          return null;
        })(bookmarkTree);
        (target ?? bookmarkTree).children.push(node);
        allBookmarkNodes.push(node);
        return clone(node);
      },
      remove: async (id) => {
        await wait();
        (function walk(current) {
          if (!current.children) return false;
          const index = current.children.findIndex((child) => child.id === id);
          if (index !== -1) {
            current.children.splice(index, 1);
            return true;
          }
          return current.children.some((child) => walk(child));
        })(bookmarkTree);
        const index = allBookmarkNodes.findIndex((node) => node.id === id);
        if (index !== -1) allBookmarkNodes.splice(index, 1);
      },
    },
    tabs: {
      query: async () => {
        await wait();
        return clone(tabs);
      },
      getCurrent: async () => {
        await wait(5);
        return clone(tabs[0]);
      },
      update: async (id, props) => {
        await wait();
        const tab = tabs.find((entry) => entry.id === id);
        if (tab && props.url) tab.url = props.url;
        if (tab && props.active) {
          for (const entry of tabs) if (entry.windowId === tab.windowId) entry.active = false;
          tab.active = true;
        }
        return clone(tab ?? null);
      },
      remove: async (ids) => {
        await wait();
        const set = new Set(Array.isArray(ids) ? ids : [ids]);
        for (let index = tabs.length - 1; index >= 0; index -= 1) {
          if (set.has(tabs[index].id)) tabs.splice(index, 1);
        }
      },
      create: async ({ url }) => {
        await wait();
        const tab = {
          id: Math.max(...tabs.map((entry) => entry.id)) + 1,
          title: url,
          url,
          windowId: 10,
          active: false,
        };
        tabs.push(tab);
        return clone(tab);
      },
    },
    windows: {
      getAll: async () => {
        await wait();
        return [{ id: 10 }, { id: 20 }];
      },
      update: async () => {
        await wait(4);
        return null;
      },
    },
    sessions: {
      getRecentlyClosed: async ({ maxResults = 10 } = {}) => {
        await wait();
        return clone(closedSessions.slice(0, maxResults));
      },
      restore: async (sessionId) => {
        await wait();
        const index = closedSessions.findIndex(
          (session) => session.tab?.sessionId === sessionId || session.window?.sessionId === sessionId
        );
        if (index !== -1) closedSessions.splice(index, 1);
        return null;
      },
    },
    downloads: {
      search: async ({ limit = 10, orderBy } = {}) => {
        await wait();
        const result = [...downloads].sort((a, b) => b.startTime - a.startTime);
        return clone(result.slice(0, limit));
      },
      open: async () => {
        await wait();
        return undefined;
      },
      show: async () => {
        await wait();
        return undefined;
      },
    },
  };

  globalThis.browser = api;
})();
