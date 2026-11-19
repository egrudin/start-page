/* StartPage — фоновая страница событий.
   Намеренно минималистична: дашборд сам собирает все свои данные.
   Здесь только кнопка на панели, клавиатурная команда и отметка времени
   сеанса браузера для статистики «текущего сеанса». */
"use strict";

const api = globalThis.browser ?? globalThis.chrome;
const START_PAGE = "pages/newtab.html";
const SESSION_KEY = "mono.session.startedAt";

async function openStartPage() {
  try {
    const url = api.runtime.getURL(START_PAGE);
    const tabs = await api.tabs.query({});
    const existing = tabs.find((tab) => tab.url === url);

    if (existing) {
      await api.tabs.update(existing.id, { active: true });
      await api.windows.update(existing.windowId, { focused: true });
      return;
    }
    await api.tabs.create({ url });
  } catch (error) {
    console.error("[start-page] could not open the start page", error);
  }
}

async function stampSessionStart() {
  try {
    await api.storage.session.set({ [SESSION_KEY]: Date.now() });
  } catch (error) {
    console.warn("[start-page] could not stamp the session start", error);
  }
}

if (api?.action?.onClicked) {
  api.action.onClicked.addListener(() => {
    void openStartPage();
  });
}

if (api?.commands?.onCommand) {
  api.commands.onCommand.addListener((command) => {
    if (command === "open-start") void openStartPage();
  });
}

/* storage.session существует ровно столько же, сколько сеанс браузера,
   — именно этот период описывают три верхние метрики. При чистой
   установке страница откатывается к началу сегодняшнего дня до следующего запуска. */
if (api?.runtime?.onStartup) {
  api.runtime.onStartup.addListener(() => {
    void stampSessionStart();
    // Даём восстановлению сеанса немного времени, затем используем уже
    // восстановленную вкладку, а не открываем вторую копию дашборда.
    setTimeout(() => {
      void openStartPage();
    }, 900);
  });
}
