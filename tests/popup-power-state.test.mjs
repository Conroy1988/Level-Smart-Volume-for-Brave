import test from "node:test";
import assert from "node:assert/strict";
import {
  PowerAction,
  powerActionForSession,
  sessionAfterPowerResponse
} from "../src/popup/power-state.js";

test("start completion stays active when a session-started broadcast wins the race", () => {
  const action = powerActionForSession(null);
  const session = { tabId: 42, preset: "night" };

  // The broadcast may update popup state before the original request resolves.
  let popupSession = session;
  popupSession = sessionAfterPowerResponse(action, { ok: true, session });

  assert.equal(action, PowerAction.START);
  assert.equal(popupSession, session);
});

test("stop completion stays stopped even when the request began from an active session", () => {
  const action = powerActionForSession({ tabId: 42 });
  const popupSession = sessionAfterPowerResponse(action, { ok: true, tabId: 42 });

  assert.equal(action, PowerAction.STOP);
  assert.equal(popupSession, null);
});
