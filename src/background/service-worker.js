import {
  DEFAULT_SETTINGS,
  buildAudioConfig,
  isPreset,
  normaliseSettings,
  profileForHost,
  safeHostname
} from "../shared/config.js";
import { userFacingError } from "../shared/error-messages.js";
import { Message, Target } from "../shared/protocol.js";

const OFFSCREEN_URL = "src/offscreen/offscreen.html";
const SETTINGS_KEY = "settings";
const SESSIONS_KEY = "sessions";
let creatingOffscreen = null;

async function loadSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normaliseSettings(stored[SETTINGS_KEY] || DEFAULT_SETTINGS);
}

async function saveSettings(settings) {
  const normalised = normaliseSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: normalised });
  return normalised;
}

async function loadSessions() {
  const stored = await chrome.storage.session.get(SESSIONS_KEY);
  return stored[SESSIONS_KEY] || {};
}

async function saveSessions(sessions) {
  await chrome.storage.session.set({ [SESSIONS_KEY]: sessions });
}

async function getSession(tabId) {
  const sessions = await loadSessions();
  return sessions[String(tabId)] || null;
}

async function putSession(session) {
  const sessions = await loadSessions();
  sessions[String(session.tabId)] = session;
  await saveSessions(sessions);
  return session;
}

async function removeSession(tabId) {
  const sessions = await loadSessions();
  const previous = sessions[String(tabId)] || null;
  delete sessions[String(tabId)];
  await saveSessions(sessions);
  return previous;
}

async function ensureOffscreen() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_URL);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  if (contexts.length) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
        justification:
          "Process and play user-activated tab audio with local loudness levelling."
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }
  await creatingOffscreen;
}

async function sendOffscreen(message) {
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ ...message, target: Target.OFFSCREEN });
}

function canCaptureUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

async function updateBadge(tabId, active) {
  const settings = await loadSettings();
  if (!settings.showBadge) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: active ? "#7c5cff" : "#6b7280"
  });
  await chrome.action.setBadgeText({ tabId, text: active ? "ON" : "" });
  await chrome.action.setTitle({
    tabId,
    title: active ? "Level is active — click to adjust" : "Level this tab"
  });
}

async function broadcast(type, data = {}) {
  return chrome.runtime
    .sendMessage({ type, target: Target.POPUP, ...data })
    .catch(() => {});
}

async function currentTab(tabId) {
  if (Number.isInteger(tabId)) return chrome.tabs.get(tabId);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function listAudibleTabs(sessionMap) {
  const tabs = await chrome.tabs.query({ audible: true });
  return tabs
    .filter((tab) => Number.isInteger(tab.id) && canCaptureUrl(tab.url))
    .map((tab) => ({
      id: tab.id,
      title: tab.title || "Untitled tab",
      hostname: safeHostname(tab.url),
      active: Boolean(tab.active),
      levelActive: Boolean(sessionMap[String(tab.id)]),
      windowId: tab.windowId
    }))
    .slice(0, 12);
}

async function getContext(tabId) {
  const tab = await currentTab(tabId);
  if (!tab || !Number.isInteger(tab.id)) {
    throw new Error("No active tab was found.");
  }

  const [settings, sessions] = await Promise.all([
    loadSettings(),
    loadSessions()
  ]);
  const hostname = safeHostname(tab.url);
  const profile = profileForHost(settings, hostname);
  const siteEntry = settings.siteProfiles?.[hostname];

  return {
    ok: true,
    tab: {
      id: tab.id,
      title: tab.title || "Current tab",
      hostname,
      audible: Boolean(tab.audible),
      canCapture: canCaptureUrl(tab.url)
    },
    session: sessions[String(tab.id)] || null,
    profile,
    selection: profile || {
      preset: settings.defaultPreset,
      volume: settings.defaultVolume
    },
    rememberSite: Boolean(
      profile || (settings.rememberSites && !siteEntry?.disabled)
    ),
    audibleTabs: await listAudibleTabs(sessions)
  };
}

async function startLevel(message) {
  const tab = await currentTab(message.tabId);
  if (!tab || !Number.isInteger(tab.id) || !canCaptureUrl(tab.url)) {
    throw new Error("This protected page cannot be processed by Level.");
  }

  const existingSession = await getSession(tab.id);
  if (existingSession) {
    await updateBadge(tab.id, true).catch(() => {});
    return { ok: true, session: existingSession, alreadyActive: true };
  }

  const existingCapture = (await chrome.tabCapture.getCapturedTabs()).find(
    (capture) => capture.tabId === tab.id
  );
  if (existingCapture) {
    throw new Error("Level already has an active stream for this tab.");
  }

  const settings = await loadSettings();
  const preset = isPreset(message.preset)
    ? message.preset
    : settings.defaultPreset;
  const volume = Math.min(200, Math.max(50, Number(message.volume) || 100));
  const hostname = safeHostname(tab.url);
  const config = buildAudioConfig(preset, volume, settings);

  await ensureOffscreen();
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tab.id
  });
  const result = await chrome.runtime.sendMessage({
    type: Message.START,
    target: Target.OFFSCREEN,
    tabId: tab.id,
    streamId,
    config
  });
  if (!result?.ok) throw new Error(result?.error || "Audio engine did not start.");

  const session = await putSession({
    tabId: tab.id,
    title: tab.title || "Current tab",
    hostname,
    preset,
    volume,
    rememberSite: Boolean(message.rememberSite),
    startedAt: Date.now(),
    sampleRate: result.sampleRate
  });

  if (message.rememberSite && hostname) {
    settings.siteProfiles[hostname] = { preset, volume };
    await saveSettings(settings);
  }

  await updateBadge(tab.id, true);
  await broadcast(Message.SESSION_STARTED, { tabId: tab.id, session });
  return { ok: true, session };
}

async function stopLevel(tabId, reason = "user") {
  const session = await removeSession(tabId);
  if (session) {
    await sendOffscreen({ type: Message.STOP, tabId, reason }).catch(() => {});
  }
  await updateBadge(tabId, false).catch(() => {});
  await broadcast(Message.SESSION_STOPPED, { tabId, reason });
  return { ok: true, tabId };
}

async function updateSession(tabId, changes) {
  const session = await getSession(tabId);
  if (!session) throw new Error("Level is not active on this tab.");

  const settings = await loadSettings();
  const preset = isPreset(changes.preset) ? changes.preset : session.preset;
  const volume = Math.min(
    200,
    Math.max(50, Number(changes.volume) || session.volume)
  );
  const updated = { ...session, preset, volume };
  const config = buildAudioConfig(preset, volume, settings);

  const result = await sendOffscreen({
    type: changes.preset ? Message.SET_PRESET : Message.SET_VOLUME,
    tabId,
    config
  });
  if (!result?.ok) throw new Error(result?.error || "Audio engine did not update.");
  await putSession(updated);

  if (updated.rememberSite && updated.hostname) {
    settings.siteProfiles[updated.hostname] = { preset, volume };
    await saveSettings(settings);
  }

  await broadcast(Message.SESSION_UPDATED, { tabId, session: updated });
  return { ok: true, session: updated };
}

async function setSiteMemory(tabId, enabled, selection = {}) {
  const session = await getSession(tabId);
  const tab = await currentTab(tabId);
  const hostname = session?.hostname || safeHostname(tab?.url);
  const settings = await loadSettings();

  if (enabled && hostname) {
    const preset = isPreset(selection.preset)
      ? selection.preset
      : session?.preset || settings.defaultPreset;
    const volume = Math.min(
      200,
      Math.max(
        50,
        Number(selection.volume) || session?.volume || settings.defaultVolume
      )
    );
    settings.siteProfiles[hostname] = { preset, volume };
  } else if (hostname) {
    if (settings.rememberSites) {
      settings.siteProfiles[hostname] = { disabled: true };
    } else {
      delete settings.siteProfiles[hostname];
    }
  }
  await saveSettings(settings);

  if (session) await putSession({ ...session, rememberSite: Boolean(enabled) });
  return { ok: true, enabled: Boolean(enabled), hostname };
}

async function focusTab(tabId, windowId) {
  if (Number.isInteger(windowId)) {
    await chrome.windows.update(windowId, { focused: true });
  }
  await chrome.tabs.update(tabId, { active: true });
  return { ok: true };
}

async function refreshActiveSessions() {
  const [settings, sessions] = await Promise.all([
    loadSettings(),
    loadSessions()
  ]);
  for (const session of Object.values(sessions)) {
    const config = buildAudioConfig(session.preset, session.volume, settings);
    await sendOffscreen({
      type: Message.SET_PRESET,
      tabId: session.tabId,
      config
    }).catch(() => {});
    await updateBadge(session.tabId, true).catch(() => {});
  }
  return { ok: true, updated: Object.keys(sessions).length };
}

async function toggleCurrentTab(tab) {
  if (!tab?.id) return;
  const session = await getSession(tab.id);
  if (session) {
    await stopLevel(tab.id, "shortcut");
    return;
  }
  const settings = await loadSettings();
  const profile = profileForHost(settings, safeHostname(tab.url));
  await startLevel({
    tabId: tab.id,
    preset: profile?.preset || settings.defaultPreset,
    volume: profile?.volume || settings.defaultVolume,
    rememberSite: Boolean(profile)
  });
}

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  if (!stored[SETTINGS_KEY]) await saveSettings(DEFAULT_SETTINGS);
  if (reason === "install") await chrome.storage.session.remove(SESSIONS_KEY);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-level") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggleCurrentTab(tab).catch(async (error) => {
    await updateBadge(tab?.id, false).catch(() => {});
    await broadcast("level:error", { error: userFacingError(error) });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  stopLevel(tabId, "tab-closed").catch(() => {});
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && !changeInfo.title) return;
  const session = await getSession(tabId);
  if (!session) return;

  const hostname = safeHostname(changeInfo.url || tab.url);
  const settings = await loadSettings();
  const profile = profileForHost(settings, hostname);
  let updated = {
    ...session,
    title: tab.title || session.title,
    hostname: hostname || session.hostname
  };

  if (changeInfo.url && profile) {
    const config = buildAudioConfig(profile.preset, profile.volume, settings);
    const result = await sendOffscreen({
      type: Message.SET_PRESET,
      tabId,
      config
    }).catch(() => null);
    if (result?.ok) {
      updated = {
        ...updated,
        preset: profile.preset,
        volume: profile.volume,
        rememberSite: true
      };
    }
  }
  await putSession(updated);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== Target.BACKGROUND) return false;

  const handle = async () => {
    switch (message.type) {
      case Message.GET_CONTEXT:
        return getContext(message.tabId);
      case Message.START:
        return startLevel(message);
      case Message.STOP:
        return stopLevel(message.tabId);
      case Message.SET_PRESET:
        return updateSession(message.tabId, { preset: message.preset });
      case Message.SET_VOLUME:
        return updateSession(message.tabId, { volume: message.volume });
      case Message.SET_SITE_MEMORY:
        return setSiteMemory(message.tabId, message.enabled, {
          preset: message.preset,
          volume: message.volume
        });
      case Message.SETTINGS_CHANGED:
        return refreshActiveSessions();
      case Message.FOCUS_TAB:
        return focusTab(message.tabId, message.windowId);
      case Message.SESSION_ENDED:
        await removeSession(message.tabId);
        await updateBadge(message.tabId, false).catch(() => {});
        await broadcast(Message.SESSION_STOPPED, {
          tabId: message.tabId,
          reason: message.reason
        });
        return { ok: true };
      default:
        return { ok: false, error: "Unknown Level request." };
    }
  };

  handle()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: userFacingError(error) }));
  return true;
});
