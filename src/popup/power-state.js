export const PowerAction = Object.freeze({
  START: "start",
  STOP: "stop"
});

export function powerActionForSession(session) {
  return session ? PowerAction.STOP : PowerAction.START;
}

export function sessionAfterPowerResponse(action, response) {
  if (action === PowerAction.STOP) return null;
  return response?.session || null;
}
