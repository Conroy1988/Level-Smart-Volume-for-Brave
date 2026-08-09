export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function decibelsToGain(decibels) {
  return 10 ** (decibels / 20);
}

export function gainToDecibels(gain) {
  return 20 * Math.log10(Math.max(gain, 1e-9));
}

function smoothingFactor(milliseconds, seconds) {
  const timeConstant = Math.max(milliseconds, 1) / 1000;
  return Math.exp(-seconds / timeConstant);
}

/**
 * Block-rate automatic gain controller shared by the worklet and unit tests.
 * It deliberately reacts faster to danger than to quiet material, which keeps
 * loud transitions controlled without making room tone audibly pump.
 */
export class AdaptiveGainController {
  constructor(sampleRate, config) {
    this.sampleRate = sampleRate;
    this.configure(config);
    this.reset();
  }

  configure(config) {
    this.config = {
      targetDb: -19,
      maxBoostDb: 12,
      maxCutDb: -12,
      gateDb: -56,
      meterAttackMs: 180,
      meterReleaseMs: 1400,
      gainUpMs: 850,
      gainDownMs: 85,
      limiterCeilingDb: -1,
      manualGainDb: 0,
      ...config
    };
  }

  reset() {
    this.levelDb = this.config.targetDb;
    this.gainDb = 0;
  }

  update(rms, peak, frameCount = 128) {
    const blockSeconds = frameCount / this.sampleRate;
    const measuredDb = gainToDecibels(rms);
    const peakDb = gainToDecibels(peak);
    const meterTime =
      measuredDb > this.levelDb
        ? this.config.meterAttackMs
        : this.config.meterReleaseMs;
    const meterFactor = smoothingFactor(meterTime, blockSeconds);
    this.levelDb =
      meterFactor * this.levelDb + (1 - meterFactor) * measuredDb;

    let desiredGainDb = 0;
    if (measuredDb > this.config.gateDb) {
      desiredGainDb = clamp(
        this.config.targetDb - this.levelDb,
        this.config.maxCutDb,
        this.config.maxBoostDb
      );

      // Leave the final limiter enough room to work cleanly on single-block
      // transients instead of asking it to absorb all adaptive gain at once.
      const peakSafeGain =
        this.config.limiterCeilingDb - peakDb - this.config.manualGainDb + 1.5;
      desiredGainDb = Math.min(desiredGainDb, peakSafeGain);
    }

    const gainTime =
      desiredGainDb < this.gainDb
        ? this.config.gainDownMs
        : this.config.gainUpMs;
    const gainFactor = smoothingFactor(gainTime, blockSeconds);
    this.gainDb =
      gainFactor * this.gainDb + (1 - gainFactor) * desiredGainDb;

    if (!Number.isFinite(this.gainDb)) this.gainDb = 0;

    return {
      measuredDb,
      smoothedLevelDb: this.levelDb,
      adaptiveGainDb: this.gainDb,
      totalGainDb: this.gainDb + this.config.manualGainDb
    };
  }
}
