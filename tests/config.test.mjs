import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SETTINGS,
  buildAudioConfig,
  normaliseSettings,
  profileForHost,
  safeHostname,
  volumeToDecibels
} from "../src/shared/config.js";

test("settings are clamped to safe supported values", () => {
  const settings = normaliseSettings({
    defaultPreset: "unknown",
    defaultVolume: 900,
    maxBoostDb: 99,
    targetOffsetDb: -20,
    limiterCeilingDb: 0
  });
  assert.equal(settings.defaultPreset, "balanced");
  assert.equal(settings.defaultVolume, 200);
  assert.equal(settings.maxBoostDb, 24);
  assert.equal(settings.targetOffsetDb, -6);
  assert.equal(settings.limiterCeilingDb, -0.5);
});

test("volume percentages convert to symmetric decibel gain", () => {
  assert.equal(volumeToDecibels(100), 0);
  assert.ok(Math.abs(volumeToDecibels(200) - 6.0206) < 0.001);
  assert.ok(Math.abs(volumeToDecibels(50) + 6.0206) < 0.001);
});

test("advanced limits constrain preset processing", () => {
  const config = buildAudioConfig("dialogue", 125, {
    ...DEFAULT_SETTINGS,
    maxBoostDb: 8,
    limiterCeilingDb: -5,
    targetOffsetDb: -2
  });
  assert.equal(config.id, "dialogue");
  assert.equal(config.targetDb, -20);
  assert.equal(config.maxBoostDb, 8);
  assert.equal(config.limiterCeilingDb, -5);
  assert.ok(config.manualGainDb > 1.9 && config.manualGainDb < 2);
});

test("disabled site entries suppress the default memory offer", () => {
  const settings = normaliseSettings({
    ...DEFAULT_SETTINGS,
    siteProfiles: {
      "quiet.example": { preset: "night", volume: 90 },
      "private.example": { disabled: true }
    }
  });
  assert.deepEqual(profileForHost(settings, "quiet.example"), {
    preset: "night",
    volume: 90
  });
  assert.equal(profileForHost(settings, "private.example"), null);
});

test("hostnames are accepted only from normal web pages", () => {
  assert.equal(safeHostname("https://Example.COM/watch?v=1"), "example.com");
  assert.equal(safeHostname("brave://settings"), "");
  assert.equal(safeHostname("not a url"), "");
});
