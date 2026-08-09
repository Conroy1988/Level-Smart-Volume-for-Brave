export const Message = Object.freeze({
  GET_CONTEXT: "level:get-context",
  START: "level:start",
  STOP: "level:stop",
  SET_PRESET: "level:set-preset",
  SET_VOLUME: "level:set-volume",
  SET_SITE_MEMORY: "level:set-site-memory",
  SETTINGS_CHANGED: "level:settings-changed",
  FOCUS_TAB: "level:focus-tab",
  SESSION_STARTED: "level:session-started",
  SESSION_STOPPED: "level:session-stopped",
  SESSION_UPDATED: "level:session-updated",
  SESSION_ENDED: "level:session-ended",
  METER: "level:meter",
  OFFSCREEN_GET_SESSIONS: "level:offscreen-get-sessions"
});

export const Target = Object.freeze({
  BACKGROUND: "background",
  OFFSCREEN: "offscreen",
  POPUP: "popup",
  BROADCAST: "broadcast"
});

export function isMessage(message, type, target) {
  return Boolean(
    message &&
      message.type === type &&
      (target === undefined || message.target === target)
  );
}
