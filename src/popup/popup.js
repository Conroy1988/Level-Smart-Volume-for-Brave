import { PRESETS } from "../shared/config.js";
import { Message, Target } from "../shared/protocol.js";
import {
  PowerAction,
  powerActionForSession,
  sessionAfterPowerResponse
} from "./power-state.js";

const manifest = chrome.runtime.getManifest();
const elements = {
  app: document.querySelector(".app"),
  tabTitle: document.querySelector("#tab-title"),
  tabHost: document.querySelector("#tab-host"),
  statusPill: document.querySelector("#status-pill"),
  levelOrb: document.querySelector("#level-orb"),
  levelState: document.querySelector("#level-state"),
  levelDescription: document.querySelector("#level-description"),
  powerButton: document.querySelector("#power-button"),
  meterTrack: document.querySelector("#meter-track"),
  meterFill: document.querySelector("#meter-fill"),
  gainReadout: document.querySelector("#gain-readout"),
  presetGrid: document.querySelector("#preset-grid"),
  volumeSlider: document.querySelector("#volume-slider"),
  volumeOutput: document.querySelector("#volume-output"),
  memoryToggle: document.querySelector("#memory-toggle"),
  audibleCount: document.querySelector("#audible-count"),
  audibleList: document.querySelector("#audible-list"),
  settingsButton: document.querySelector("#settings-button"),
  toast: document.querySelector("#toast"),
  version: document.querySelector("#version")
};

const state = {
  tab: null,
  session: null,
  preset: "balanced",
  volume: 100,
  rememberSite: false,
  audibleTabs: [],
  busy: false,
  volumeTimer: null,
  toastTimer: null
};

async function send(type, payload = {}) {
  return chrome.runtime.sendMessage({
    type,
    target: Target.BACKGROUND,
    ...payload
  });
}

function setBusy(busy) {
  state.busy = busy;
  elements.powerButton.disabled = busy || !state.tab?.canCapture;
  elements.app.setAttribute("aria-busy", String(busy));
}

function showError(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message || "Something stopped Level from working.";
  elements.toast.classList.add("show");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 5200);
}

function updateRange() {
  const value = Number(state.volume);
  elements.volumeSlider.value = String(value);
  elements.volumeOutput.textContent = `${value}%`;
  elements.volumeSlider.style.setProperty("--range", `${((value - 50) / 150) * 100}%`);
}

function renderAudibleTabs() {
  const tabs = state.audibleTabs.filter((tab) => tab.id !== state.tab?.id);
  elements.audibleCount.textContent = String(tabs.length);
  elements.audibleList.replaceChildren();

  if (!tabs.length) {
    const empty = document.createElement("div");
    empty.className = "audible-empty";
    empty.textContent = "No other tabs are making sound.";
    elements.audibleList.append(empty);
    return;
  }

  for (const tab of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "audible-tab";
    button.dataset.tabId = String(tab.id);
    button.dataset.windowId = String(tab.windowId);

    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const host = document.createElement("small");
    const status = document.createElement("span");
    title.textContent = tab.title;
    host.textContent = tab.hostname;
    status.textContent = tab.levelActive ? "LEVEL ON" : "OPEN →";
    copy.append(title, host);
    button.append(copy, status);
    elements.audibleList.append(button);
  }
}

function render() {
  if (!state.tab) return;
  const active = Boolean(state.session);
  elements.tabTitle.textContent = state.tab.title;
  elements.tabHost.textContent = state.tab.canCapture
    ? state.tab.hostname || "Web audio"
    : "Protected browser page";

  elements.statusPill.className = `status-pill ${
    !state.tab.canCapture ? "blocked" : active ? "active" : ""
  }`;
  elements.statusPill.querySelector("span").textContent = !state.tab.canCapture
    ? "BLOCKED"
    : active
      ? "ACTIVE"
      : "READY";
  elements.levelOrb.classList.toggle("active", active);
  elements.levelState.textContent = active
    ? `${PRESETS[state.preset].name} is active`
    : state.tab.canCapture
      ? "Ready to level"
      : "Brave protects this page";
  elements.levelDescription.textContent = active
    ? PRESETS[state.preset].description
    : state.tab.canCapture
      ? "Quiet dialogue rises. Sudden volume spikes stay contained."
      : "Extensions cannot capture audio from internal browser pages.";
  elements.powerButton.classList.toggle("stop", active);
  elements.powerButton.querySelector("span").textContent = active
    ? "STOP LEVELLING"
    : "LEVEL THIS TAB";
  elements.powerButton.disabled = state.busy || !state.tab.canCapture;

  for (const button of elements.presetGrid.querySelectorAll("[data-preset]")) {
    const selected = button.dataset.preset === state.preset;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
  elements.memoryToggle.checked = state.rememberSite;
  elements.memoryToggle.disabled = !state.tab.hostname;
  updateRange();
  renderAudibleTabs();
}

async function initialise() {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const context = await send(Message.GET_CONTEXT, { tabId: activeTab?.id });
    if (!context?.ok) throw new Error(context?.error || "Level could not inspect this tab.");

    state.tab = context.tab;
    state.session = context.session;
    state.preset = context.session?.preset || context.selection.preset;
    state.volume = context.session?.volume || context.selection.volume;
    state.rememberSite = context.session?.rememberSite || context.rememberSite;
    state.audibleTabs = context.audibleTabs;
    render();
  } catch (error) {
    showError(error.message);
  } finally {
    setBusy(false);
  }
}

elements.powerButton.addEventListener("click", async () => {
  const action = powerActionForSession(state.session);
  setBusy(true);
  try {
    const response =
      action === PowerAction.STOP
        ? await send(Message.STOP, { tabId: state.tab.id })
        : await send(Message.START, {
            tabId: state.tab.id,
            preset: state.preset,
            volume: state.volume,
            rememberSite: state.rememberSite
          });
    if (!response?.ok) throw new Error(response?.error);
    state.session = sessionAfterPowerResponse(action, response);
    render();
  } catch (error) {
    showError(error.message);
    await initialise();
  } finally {
    setBusy(false);
  }
});

elements.presetGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-preset]");
  if (!button || state.busy) return;
  state.preset = button.dataset.preset;
  render();
  if (!state.session) return;

  try {
    const response = await send(Message.SET_PRESET, {
      tabId: state.tab.id,
      preset: state.preset
    });
    if (!response?.ok) throw new Error(response?.error);
    state.session = response.session;
  } catch (error) {
    showError(error.message);
  }
});

elements.volumeSlider.addEventListener("input", () => {
  state.volume = Number(elements.volumeSlider.value);
  updateRange();
  if (!state.session) return;

  clearTimeout(state.volumeTimer);
  state.volumeTimer = setTimeout(async () => {
    try {
      const response = await send(Message.SET_VOLUME, {
        tabId: state.tab.id,
        volume: state.volume
      });
      if (!response?.ok) throw new Error(response?.error);
      state.session = response.session;
    } catch (error) {
      showError(error.message);
    }
  }, 90);
});

elements.memoryToggle.addEventListener("change", async () => {
  state.rememberSite = elements.memoryToggle.checked;
  try {
    const response = await send(Message.SET_SITE_MEMORY, {
      tabId: state.tab.id,
      enabled: state.rememberSite,
      preset: state.preset,
      volume: state.volume
    });
    if (!response?.ok) throw new Error(response?.error);
    if (state.session) state.session.rememberSite = state.rememberSite;
  } catch (error) {
    state.rememberSite = !state.rememberSite;
    render();
    showError(error.message);
  }
});

elements.audibleList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-tab-id]");
  if (!button) return;
  const response = await send(Message.FOCUS_TAB, {
    tabId: Number(button.dataset.tabId),
    windowId: Number(button.dataset.windowId)
  });
  if (!response?.ok) showError(response?.error);
  else window.close();
});

elements.settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.target !== Target.POPUP || message.tabId !== state.tab?.id) return;
  if (message.type === Message.SESSION_STARTED || message.type === Message.SESSION_UPDATED) {
    state.session = message.session;
    state.preset = message.session.preset;
    state.volume = message.session.volume;
    render();
  } else if (message.type === Message.SESSION_STOPPED) {
    state.session = null;
    elements.meterFill.style.width = "0%";
    elements.gainReadout.textContent = "Standing by";
    render();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== Message.METER || message.tabId !== state.tab?.id) return;
  const level = Math.max(-60, Math.min(0, Number(message.meter?.outputDb) || -60));
  const percentage = ((level + 60) / 60) * 100;
  const adaptive = Number(message.meter?.adaptiveGainDb) || 0;
  elements.meterFill.style.width = `${percentage}%`;
  elements.meterTrack.setAttribute("aria-valuenow", String(Math.round(level)));
  elements.gainReadout.textContent = `${adaptive >= 0 ? "+" : ""}${adaptive.toFixed(1)} dB adapting`;
});

elements.version.textContent = `v${manifest.version}`;
initialise();
