/* Start page — background event page.
   Deliberately tiny: the dashboard does all of its own data work.
   This provides the toolbar button, the keyboard command and the browser
   session timestamp used by the "current session" statistics. */
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

/* storage.session lives exactly as long as the browser session, which is
   precisely the period the three top-line metrics describe. On a fresh
   install the page falls back to the start of today until the next startup. */
if (api?.runtime?.onStartup) {
  api.runtime.onStartup.addListener(() => {
    void stampSessionStart();
    // Give session restore a moment, then reuse an already restored tab
    // instead of opening a second copy of the dashboard.
    setTimeout(() => {
      void openStartPage();
    }, 900);
  });
}
