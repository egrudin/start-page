/* Двуязычный интерфейс. Строки манифеста лежат в _locales; всё, что рендерит
   страница, находится здесь, чтобы мгновенно применяться при смене настройки. */

export const STRINGS = {
  ru: {
    "a11y.skip": "К поиску",
    "brand.name": "Стартовая страница",
    "nav.shortcuts": "Горячие клавиши",
    "nav.settings": "Настройки",
    "nav.close": "Закрыть",
    "hero.label": "Сводка браузера",

    "stat.sites": "Сайтов",
    "stat.pages": "Страниц",
    "stat.tabs": "Вкладок",
    "stat.session": "за сеанс",
    "stat.tabsSub": "сейчас",

    "clock.week": "неделя",
    "clock.day": "день",

    "search.label": "Поиск по браузеру",
    "search.placeholder": "Поиск по истории, закладкам и вкладкам",
    "search.results": "Результаты поиска",
    "palette.empty": "Ничего не найдено",
    "palette.history": "История",
    "palette.bookmarks": "Закладки",
    "palette.tabs": "Вкладки",
    "palette.recent": "Недавние",
    "palette.commands": "Команды",
    "palette.start": "Начните вводить: история, закладки, вкладки",
    "palette.hintNav": "выбор",
    "palette.hintOpen": "открыть",
    "palette.hintClose": "закрыть",
    "palette.hintCommands": "команды",

    "history.title": "История",
    "history.today": "Сегодня",
    "history.week": "7 дней",
    "history.period": "Период",
    "history.empty": "Пока пусто. Посетите пару страниц — они появятся здесь.",
    "history.more": "Ещё {n}",
    "history.less": "Свернуть",
    "history.remove": "Удалить из истории",
    "history.removeConfirm": "Удалить запись?",
    "history.confirm": "Да",
    "history.cancel": "Нет",
    "history.addBookmark": "Добавить в закладки",
    "history.removeBookmark": "Убрать из закладок",
    "history.newTab": "Открыть в новой вкладке",

    "bm.title": "Закладки",
    "bm.folders": "Папки закладок",
    "bm.all": "Все",
    "bm.folder": "Закладка",
    "bm.copy": "Копировать ссылку",
    "bm.empty": "В этой папке пусто.",
    "bm.emptyAll": "В библиотеке пока пусто.",
    "bm.more": "Ещё {n}",

    "tabs.title": "Вкладки",
    "tabs.empty": "Кроме этой страницы открытых вкладок нет.",
    "tabs.close": "Закрыть вкладку",
    "tabs.duplicates": "Дубли: {n}",
    "tabs.dupesConfirm": "Закрыть дубликаты ({n})?",
    "tabs.window": "Окно {n}",
    "tabs.pinned": "закреплена",

    "dl.title": "Загрузки",
    "dl.empty": "Здесь появятся последние файлы.",
    "dl.open": "Открыть файл",
    "dl.show": "Показать в папке",
    "dl.failed": "Ошибка",
    "dl.interrupted": "Прервано",
    "dl.done": "Готово",
    "dl.progress": "{p}%",

    "settings.title": "Настройки",
    "settings.appearance": "Оформление",
    "settings.theme": "Тема",
    "settings.themeSystem": "Система",
    "settings.themeLight": "Светлая",
    "settings.themeDark": "Тёмная",
    "settings.width": "Ширина",
    "settings.widthComfort": "Комфорт",
    "settings.widthWide": "Широко",
    "settings.time": "Время",
    "settings.clock24": "24-часовой формат",
    "settings.seconds": "Показывать секунды",
    "settings.general": "Общее",
    "settings.language": "Язык",
    "settings.langAuto": "Авто",
    "settings.sections": "Разделы",
    "settings.data": "Данные",
    "settings.reset": "Сбросить настройки",
    "settings.resetConfirm": "Сбросить настройки?",
    "settings.clearCache": "Очистить кэш",
    "settings.resetDone": "Настройки сброшены",
    "settings.cacheCleared": "Кэш очищен",

    "keys.title": "Клавиши",
    "keys.search": "Поиск и палитра",
    "keys.navigate": "По результатам",
    "keys.open": "Открыть",
    "keys.newTab": "В новой вкладке",
    "keys.commands": "Команды в палитре",
    "keys.close": "Закрыть / сбросить",
    "keys.settings": "Настройки",
    "keys.help": "Эта подсказка",

    "cmd.theme": "Сменить тему",
    "cmd.settings": "Открыть настройки",
    "cmd.shortcuts": "Показать горячие клавиши",
    "cmd.dupes": "Закрыть дубликаты вкладок",
    "cmd.refresh": "Обновить сводку",

    "toast.historyRemoved": "Удалено из истории",
    "toast.bookmarkAdded": "Добавлено в закладки",
    "toast.bookmarkRemoved": "Убрано из закладок",
    "toast.tabClosed": "Вкладка закрыта",
    "toast.tabsClosed": "Закрыто вкладок: {n}",
    "toast.error": "Не получилось. Попробуйте ещё раз.",
    "toast.copied": "Ссылка скопирована",
    "toast.refreshed": "Сводка обновлена",

    "footer.hint": "поиск",
    "footer.updated": "обновлено",
    "footer.waiting": "ожидание данных",
    "footer.refresh": "Обновить сводку",
  },

  en: {
    "a11y.skip": "Skip to search",
    "brand.name": "Start page",
    "nav.shortcuts": "Keyboard shortcuts",
    "nav.settings": "Settings",
    "nav.close": "Close",
    "hero.label": "Browser overview",

    "stat.sites": "Sites",
    "stat.pages": "Pages",
    "stat.tabs": "Tabs",
    "stat.session": "this session",
    "stat.tabsSub": "open now",

    "clock.week": "week",
    "clock.day": "day",

    "search.label": "Search your browser",
    "search.placeholder": "Search history, bookmarks and tabs",
    "search.results": "Search results",
    "palette.empty": "Nothing found",
    "palette.history": "History",
    "palette.bookmarks": "Bookmarks",
    "palette.tabs": "Tabs",
    "palette.recent": "Recent",
    "palette.commands": "Commands",
    "palette.start": "Start typing: history, bookmarks, tabs",
    "palette.hintNav": "select",
    "palette.hintOpen": "open",
    "palette.hintClose": "close",
    "palette.hintCommands": "commands",

    "history.title": "History",
    "history.today": "Today",
    "history.week": "7 days",
    "history.period": "Period",
    "history.empty": "Nothing yet. Visit a couple of pages and they will show up here.",
    "history.more": "Show {n} more",
    "history.less": "Collapse",
    "history.remove": "Remove from history",
    "history.removeConfirm": "Delete this entry?",
    "history.confirm": "Yes",
    "history.cancel": "No",
    "history.addBookmark": "Add bookmark",
    "history.removeBookmark": "Remove bookmark",
    "history.newTab": "Open in a new tab",

    "bm.title": "Bookmarks",
    "bm.folders": "Bookmark folders",
    "bm.all": "All",
    "bm.folder": "Bookmark",
    "bm.copy": "Copy link",
    "bm.empty": "Nothing in this folder.",
    "bm.emptyAll": "Your library is empty.",
    "bm.more": "Show {n} more",

    "tabs.title": "Tabs",
    "tabs.empty": "No other tabs are open.",
    "tabs.close": "Close tab",
    "tabs.duplicates": "Duplicates: {n}",
    "tabs.dupesConfirm": "Close {n} duplicate tabs?",
    "tabs.window": "Window {n}",
    "tabs.pinned": "pinned",

    "dl.title": "Downloads",
    "dl.empty": "Your latest files will appear here.",
    "dl.open": "Open file",
    "dl.show": "Show in folder",
    "dl.failed": "Failed",
    "dl.interrupted": "Interrupted",
    "dl.done": "Done",
    "dl.progress": "{p}%",

    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.theme": "Theme",
    "settings.themeSystem": "System",
    "settings.themeLight": "Light",
    "settings.themeDark": "Dark",
    "settings.width": "Width",
    "settings.widthComfort": "Comfort",
    "settings.widthWide": "Wide",
    "settings.time": "Time",
    "settings.clock24": "24-hour clock",
    "settings.seconds": "Show seconds",
    "settings.general": "General",
    "settings.language": "Language",
    "settings.langAuto": "Auto",
    "settings.sections": "Sections",
    "settings.data": "Data",
    "settings.reset": "Reset settings",
    "settings.resetConfirm": "Reset settings?",
    "settings.clearCache": "Clear cache",
    "settings.resetDone": "Settings reset",
    "settings.cacheCleared": "Cache cleared",

    "keys.title": "Keys",
    "keys.search": "Search and palette",
    "keys.navigate": "Across results",
    "keys.open": "Open",
    "keys.newTab": "In a new tab",
    "keys.commands": "Commands in the palette",
    "keys.close": "Close / reset",
    "keys.settings": "Settings",
    "keys.help": "This sheet",

    "cmd.theme": "Switch theme",
    "cmd.settings": "Open settings",
    "cmd.shortcuts": "Show keyboard shortcuts",
    "cmd.dupes": "Close duplicate tabs",
    "cmd.refresh": "Refresh overview",

    "toast.historyRemoved": "Removed from history",
    "toast.bookmarkAdded": "Bookmark added",
    "toast.bookmarkRemoved": "Bookmark removed",
    "toast.tabClosed": "Tab closed",
    "toast.tabsClosed": "Tabs closed: {n}",
    "toast.error": "That did not work. Try again.",
    "toast.copied": "Link copied",
    "toast.refreshed": "Overview refreshed",

    "footer.hint": "search",
    "footer.updated": "updated",
    "footer.waiting": "waiting for data",
    "footer.refresh": "Refresh overview",
  },
};

export function resolveLocale(preference, browserLanguage = "en") {
  if (preference === "ru" || preference === "en") return preference;
  return String(browserLanguage).toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function createI18n(locale) {
  const dictionary = STRINGS[locale] ?? STRINGS.en;
  const t = (key, params) => {
    const template = dictionary[key] ?? STRINGS.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) =>
      Object.hasOwn(params, name) ? String(params[name]) : match
    );
  };
  t.locale = locale;
  return t;
}

export function applyTranslations(root, t) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  }
  for (const node of root.querySelectorAll("[data-i18n-aria]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  }
  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  }
  if (document.documentElement.lang !== t.locale) {
    document.documentElement.lang = t.locale;
  }
}
