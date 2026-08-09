export const PRESETS = Object.freeze({
  balanced: Object.freeze({
    id: "balanced",
    name: "Balanced",
    description: "Smooth, natural levelling for everyday listening.",
    targetDb: -19,
    maxBoostDb: 12,
    maxCutDb: -12,
    gateDb: -56,
    meterAttackMs: 180,
    meterReleaseMs: 1400,
    gainUpMs: 850,
    gainDownMs: 85,
    highpassHz: 35,
    presenceDb: 0.8,
    warmthDb: 0.5,
    compressorThresholdDb: -4,
    compressorRatio: 16,
    compressorReleaseSeconds: 0.2,
    limiterCeilingDb: -1
  }),
  dialogue: Object.freeze({
    id: "dialogue",
    name: "Dialogue",
    description: "Lifts voices and clears away low-frequency muddiness.",
    targetDb: -18,
    maxBoostDb: 16,
    maxCutDb: -10,
    gateDb: -58,
    meterAttackMs: 140,
    meterReleaseMs: 1100,
    gainUpMs: 620,
    gainDownMs: 65,
    highpassHz: 85,
    presenceDb: 3.2,
    warmthDb: -0.8,
    compressorThresholdDb: -6,
    compressorRatio: 12,
    compressorReleaseSeconds: 0.16,
    limiterCeilingDb: -1.5
  }),
  cinema: Object.freeze({
    id: "cinema",
    name: "Cinema",
    description: "Controls shocks while preserving cinematic dynamics.",
    targetDb: -21,
    maxBoostDb: 10,
    maxCutDb: -12,
    gateDb: -56,
    meterAttackMs: 220,
    meterReleaseMs: 1800,
    gainUpMs: 1100,
    gainDownMs: 95,
    highpassHz: 28,
    presenceDb: 1.2,
    warmthDb: 1.6,
    compressorThresholdDb: -3,
    compressorRatio: 18,
    compressorReleaseSeconds: 0.28,
    limiterCeilingDb: -1
  }),
  night: Object.freeze({
    id: "night",
    name: "Night",
    description: "Keeps whispers clear and loud moments firmly contained.",
    targetDb: -20,
    maxBoostDb: 15,
    maxCutDb: -16,
    gateDb: -60,
    meterAttackMs: 110,
    meterReleaseMs: 900,
    gainUpMs: 520,
    gainDownMs: 45,
    highpassHz: 55,
    presenceDb: 2.2,
    warmthDb: 0,
    compressorThresholdDb: -9,
    compressorRatio: 10,
    compressorReleaseSeconds: 0.14,
    limiterCeilingDb: -4
  })
});

export const DEFAULT_SETTINGS = Object.freeze({
  defaultPreset: "balanced",
  defaultVolume: 100,
  rememberSites: true,
  showBadge: true,
  maxBoostDb: 16,
  targetOffsetDb: 0,
  limiterCeilingDb: -1,
  siteProfiles: {}
});

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function isPreset(value) {
  return Object.hasOwn(PRESETS, value);
}

export function normaliseSettings(value = {}) {
  const defaultPreset = isPreset(value.defaultPreset)
    ? value.defaultPreset
    : DEFAULT_SETTINGS.defaultPreset;

  return {
    defaultPreset,
    defaultVolume: clamp(
      Number(value.defaultVolume) || DEFAULT_SETTINGS.defaultVolume,
      50,
      200
    ),
    rememberSites:
      typeof value.rememberSites === "boolean"
        ? value.rememberSites
        : DEFAULT_SETTINGS.rememberSites,
    showBadge:
      typeof value.showBadge === "boolean"
        ? value.showBadge
        : DEFAULT_SETTINGS.showBadge,
    maxBoostDb: clamp(
      Number(value.maxBoostDb) || DEFAULT_SETTINGS.maxBoostDb,
      6,
      24
    ),
    targetOffsetDb: clamp(Number(value.targetOffsetDb) || 0, -6, 4),
    limiterCeilingDb: clamp(
      Number.isFinite(Number(value.limiterCeilingDb))
        ? Number(value.limiterCeilingDb)
        : DEFAULT_SETTINGS.limiterCeilingDb,
      -8,
      -0.5
    ),
    siteProfiles:
      value.siteProfiles && typeof value.siteProfiles === "object"
        ? value.siteProfiles
        : {}
  };
}

export function volumeToDecibels(volume) {
  return 20 * Math.log10(clamp(Number(volume) || 100, 50, 200) / 100);
}

export function buildAudioConfig(
  presetId,
  volume = 100,
  rawSettings = DEFAULT_SETTINGS
) {
  const settings = normaliseSettings(rawSettings);
  const selectedId = isPreset(presetId) ? presetId : settings.defaultPreset;
  const preset = PRESETS[selectedId];

  return {
    ...preset,
    targetDb: preset.targetDb + settings.targetOffsetDb,
    maxBoostDb: Math.min(preset.maxBoostDb, settings.maxBoostDb),
    limiterCeilingDb: Math.min(
      preset.limiterCeilingDb,
      settings.limiterCeilingDb
    ),
    manualGainDb: volumeToDecibels(volume),
    volume: clamp(Number(volume) || 100, 50, 200)
  };
}

export function safeHostname(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.hostname.toLowerCase()
      : "";
  } catch {
    return "";
  }
}

export function profileForHost(settings, hostname) {
  const profile = settings.siteProfiles?.[hostname];
  if (!profile || profile.disabled) return null;

  return {
    preset: isPreset(profile.preset) ? profile.preset : settings.defaultPreset,
    volume: clamp(Number(profile.volume) || settings.defaultVolume, 50, 200)
  };
}
