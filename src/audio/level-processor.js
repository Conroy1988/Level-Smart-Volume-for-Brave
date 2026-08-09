import {
  AdaptiveGainController,
  decibelsToGain,
  gainToDecibels
} from "./adaptive-controller.js";

class LevelProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.controller = new AdaptiveGainController(sampleRate, {});
    this.lastGain = 1;
    this.meterCounter = 0;
    this.enabled = true;

    this.port.onmessage = ({ data }) => {
      if (data?.type === "configure") {
        this.controller.configure(data.config || {});
        this.enabled = data.enabled !== false;
      } else if (data?.type === "reset") {
        this.controller.reset();
        this.lastGain = 1;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.length || !output?.length) return true;

    const frameCount = input[0]?.length || 128;
    let energy = 0;
    let peak = 0;
    let samples = 0;

    for (const channel of input) {
      for (let index = 0; index < channel.length; index += 1) {
        const sample = channel[index];
        energy += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        samples += 1;
      }
    }

    const rms = Math.sqrt(energy / Math.max(samples, 1));
    const state = this.enabled
      ? this.controller.update(rms, peak, frameCount)
      : {
          measuredDb: gainToDecibels(rms),
          smoothedLevelDb: gainToDecibels(rms),
          adaptiveGainDb: 0,
          totalGainDb: 0
        };
    const targetGain = this.enabled ? decibelsToGain(state.totalGainDb) : 1;

    let outputEnergy = 0;
    let outputPeak = 0;
    for (let channelIndex = 0; channelIndex < output.length; channelIndex += 1) {
      const source = input[channelIndex] || input[0];
      const destination = output[channelIndex];

      for (let index = 0; index < destination.length; index += 1) {
        const mix = index / Math.max(destination.length - 1, 1);
        const gain = this.lastGain + (targetGain - this.lastGain) * mix;
        const sample = (source?.[index] || 0) * gain;
        destination[index] = sample;
        outputEnergy += sample * sample;
        outputPeak = Math.max(outputPeak, Math.abs(sample));
      }
    }
    this.lastGain = targetGain;

    this.meterCounter += frameCount;
    if (this.meterCounter >= sampleRate / 12) {
      const outputSamples = frameCount * output.length;
      this.port.postMessage({
        type: "meter",
        inputDb: state.measuredDb,
        levelDb: state.smoothedLevelDb,
        adaptiveGainDb: state.adaptiveGainDb,
        totalGainDb: state.totalGainDb,
        outputDb: gainToDecibels(
          Math.sqrt(outputEnergy / Math.max(outputSamples, 1))
        ),
        peakDb: gainToDecibels(outputPeak)
      });
      this.meterCounter = 0;
    }

    return true;
  }
}

registerProcessor("level-processor", LevelProcessor);
