import test from "node:test";
import assert from "node:assert/strict";
import {
  AdaptiveGainController,
  decibelsToGain,
  gainToDecibels
} from "../src/audio/adaptive-controller.js";

const config = {
  targetDb: -19,
  maxBoostDb: 12,
  maxCutDb: -12,
  gateDb: -56,
  meterAttackMs: 180,
  meterReleaseMs: 1400,
  gainUpMs: 850,
  gainDownMs: 85,
  limiterCeilingDb: -1,
  manualGainDb: 0
};

function run(controller, blocks, rms, peak = rms * 1.8) {
  let state;
  for (let index = 0; index < blocks; index += 1) {
    state = controller.update(rms, peak, 128);
  }
  return state;
}

test("decibel and linear conversions round-trip", () => {
  for (const db of [-30, -12, 0, 6]) {
    assert.ok(Math.abs(gainToDecibels(decibelsToGain(db)) - db) < 1e-8);
  }
});

test("quiet programme material is lifted gradually within the configured cap", () => {
  const controller = new AdaptiveGainController(48_000, config);
  const state = run(controller, 1_200, 0.01, 0.02);
  assert.ok(state.adaptiveGainDb > 8);
  assert.ok(state.adaptiveGainDb <= 12);
});

test("loud material is reduced substantially and faster than quiet material rises", () => {
  const controller = new AdaptiveGainController(48_000, config);
  run(controller, 600, 0.01, 0.02);
  const state = run(controller, 180, 0.5, 0.9);
  assert.ok(state.adaptiveGainDb < -7);
  assert.ok(state.adaptiveGainDb >= -12.1);
});

test("silence is gated and returns automatic lift towards unity", () => {
  const controller = new AdaptiveGainController(48_000, config);
  const raised = run(controller, 1_000, 0.012, 0.02);
  assert.ok(raised.adaptiveGainDb > 6);
  const silent = run(controller, 300, 0, 0);
  assert.ok(Math.abs(silent.adaptiveGainDb) < 0.2);
});

test("manual output gain is reported separately from adaptive gain", () => {
  const controller = new AdaptiveGainController(48_000, {
    ...config,
    manualGainDb: 3
  });
  const state = run(controller, 20, 0.1, 0.15);
  assert.ok(Math.abs(state.totalGainDb - state.adaptiveGainDb - 3) < 1e-9);
});
