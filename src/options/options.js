import {
  DEFAULT_SETTINGS,
  PRESETS,
  normaliseSettings
} from "../shared/config.js";
import { Message, Target } from "../shared/protocol.js";

const SETTINGS_KEY = "settings";
const form = document.querySelector("#settings-form");
const fields = {
  defaultPreset: document.querySelector("#default-preset"),
  defaultVolume: document.querySelector("#default-volume"),
  rememberSites: document.querySelector("#remember-sites"),
  showBadge: document.querySelector("#show-badge"),
  maxBoostDb: document.querySelector("#max-boost"),
  targetOffsetDb: document.querySelector("#target-offset"),
  limiterCeilingDb: document.querySelector("#limiter-ceiling")
};
const outputs = {
  defaultVolume: document.querySelector("#default-volume-output"),
  maxBoostDb: document.querySelector("#max-boost-output"),
  targetOffsetDb: document.querySelector("#target-offset-output"),
  limiterCeilingDb: document.querySelector("#limiter-output")
};
const siteList = document.querySelector("#site-list");
const saveStatus = document.querySelector("#save-status");
let settings = normaliseSettings(DEFAULT_SETTINGS);
let statusTimer;

function signed(value, suffix = " dB") {
  const number = Number(value);
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${Math.abs(number)}${suffix}`;
}

function updateOutputs() {
  outputs.defaultVolume.textContent = `${fields.defaultVolume.value}%`;
  outputs.maxBoostDb.textContent = signed(fields.maxBoostDb.value);
  outputs.targetOffsetDb.textContent = signed(fields.targetOffsetDb.value);
  outputs.limiterCeilingDb.textContent = signed(fields.limiterCeilingDb.value);
}

function readForm() {
  return normaliseSettings({
    ...settings,
    defaultPreset: fields.defaultPreset.value,
    defaultVolume: Number(fields.defaultVolume.value),
    rememberSites: fields.rememberSites.checked,
    showBadge: fields.showBadge.checked,
    maxBoostDb: Number(fields.maxBoostDb.value),
    targetOffsetDb: Number(fields.targetOffsetDb.value),
    limiterCeilingDb: Number(fields.limiterCeilingDb.value)
  });
}

function fillForm() {
  fields.defaultPreset.value = settings.defaultPreset;
  fields.defaultVolume.value = String(settings.defaultVolume);
  fields.rememberSites.checked = settings.rememberSites;
  fields.showBadge.checked = settings.showBadge;
  fields.maxBoostDb.value = String(settings.maxBoostDb);
  fields.targetOffsetDb.value = String(settings.targetOffsetDb);
  fields.limiterCeilingDb.value = String(settings.limiterCeilingDb);
  updateOutputs();
  renderSites();
}

function renderSites() {
  siteList.replaceChildren();
  const profiles = Object.entries(settings.siteProfiles).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  if (!profiles.length) {
    const empty = document.createElement("div");
    empty.className = "site-empty";
    empty.textContent = "No website preferences have been saved yet.";
    siteList.append(empty);
    return;
  }

  for (const [hostname, profile] of profiles) {
    const row = document.createElement("div");
    row.className = "site-row";
    const name = document.createElement("strong");
    const mode = document.createElement("span");
    const volume = document.createElement("span");
    const remove = document.createElement("button");
    name.textContent = hostname;
    mode.textContent = profile.disabled
      ? "Memory off"
      : PRESETS[profile.preset]?.name || "Balanced";
    mode.className = profile.disabled ? "disabled" : "";
    volume.textContent = profile.disabled ? "—" : `${profile.volume || 100}%`;
    volume.className = "site-volume";
    remove.type = "button";
    remove.className = "remove-site";
    remove.dataset.hostname = hostname;
    remove.setAttribute("aria-label", `Remove settings for ${hostname}`);
    remove.textContent = "×";
    row.append(name, mode, volume, remove);
    siteList.append(row);
  }
}

function showSaved(message = "Settings saved") {
  clearTimeout(statusTimer);
  saveStatus.textContent = message;
  saveStatus.classList.add("show");
  statusTimer = setTimeout(() => saveStatus.classList.remove("show"), 2400);
}

async function persist(message) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  await chrome.runtime.sendMessage({
    type: Message.SETTINGS_CHANGED,
    target: Target.BACKGROUND
  });
  showSaved(message);
}

async function initialise() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  settings = normaliseSettings(stored[SETTINGS_KEY] || DEFAULT_SETTINGS);
  fillForm();
}

form.addEventListener("input", updateOutputs);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  settings = readForm();
  await persist();
});

document.querySelector("#reset-defaults").addEventListener("click", async () => {
  settings = normaliseSettings({
    ...DEFAULT_SETTINGS,
    siteProfiles: settings.siteProfiles
  });
  fillForm();
  await persist("Safe defaults restored");
});

document.querySelector("#clear-sites").addEventListener("click", async () => {
  settings = { ...readForm(), siteProfiles: {} };
  renderSites();
  await persist("Website memory cleared");
});

siteList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-hostname]");
  if (!button) return;
  settings = readForm();
  delete settings.siteProfiles[button.dataset.hostname];
  renderSites();
  await persist("Website preference removed");
});

initialise();
