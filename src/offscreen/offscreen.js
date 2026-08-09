import { Message, Target } from "../shared/protocol.js";

const sessions = new Map();

function configureFilters(session, config) {
  const now = session.context.currentTime;
  session.highpass.frequency.setTargetAtTime(config.highpassHz, now, 0.03);
  session.warmth.gain.setTargetAtTime(config.warmthDb, now, 0.03);
  session.presence.gain.setTargetAtTime(config.presenceDb, now, 0.03);
  session.compressor.threshold.setTargetAtTime(
    config.compressorThresholdDb,
    now,
    0.02
  );
  session.compressor.ratio.setTargetAtTime(
    config.compressorRatio,
    now,
    0.02
  );
  session.compressor.release.setTargetAtTime(
    config.compressorReleaseSeconds,
    now,
    0.02
  );
  session.worklet.port.postMessage({ type: "configure", config });
  session.config = config;
}

async function startSession({ tabId, streamId, config }) {
  await stopSession(tabId, "restart");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  const context = new AudioContext({ latencyHint: "interactive" });
  await context.audioWorklet.addModule(
    chrome.runtime.getURL("src/audio/level-processor.js")
  );

  const source = context.createMediaStreamSource(stream);
  const highpass = context.createBiquadFilter();
  highpass.type = "highpass";
  highpass.Q.value = 0.707;

  const warmth = context.createBiquadFilter();
  warmth.type = "lowshelf";
  warmth.frequency.value = 150;

  const presence = context.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.Q.value = 0.9;

  const worklet = new AudioWorkletNode(context, "level-processor", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [Math.max(stream.getAudioTracks()[0]?.getSettings().channelCount || 2, 1)]
  });

  const compressor = context.createDynamicsCompressor();
  compressor.knee.value = 0;
  compressor.attack.value = 0.003;

  const session = {
    tabId,
    stream,
    context,
    source,
    highpass,
    warmth,
    presence,
    worklet,
    compressor,
    config
  };
  sessions.set(tabId, session);

  source
    .connect(highpass)
    .connect(warmth)
    .connect(presence)
    .connect(worklet)
    .connect(compressor)
    .connect(context.destination);

  configureFilters(session, config);
  worklet.port.onmessage = ({ data }) => {
    if (data?.type !== "meter") return;
    chrome.runtime.sendMessage({
      type: Message.METER,
      target: Target.BROADCAST,
      tabId,
      meter: data
    }).catch(() => {});
  };

  const track = stream.getAudioTracks()[0];
  track.addEventListener(
    "ended",
    () => {
      if (!sessions.has(tabId)) return;
      sessions.delete(tabId);
      context.close().catch(() => {});
      chrome.runtime.sendMessage({
        type: Message.SESSION_ENDED,
        target: Target.BACKGROUND,
        tabId,
        reason: "capture-ended"
      }).catch(() => {});
    },
    { once: true }
  );

  await context.resume();
  return { ok: true, tabId, sampleRate: context.sampleRate };
}

async function stopSession(tabId, reason = "user") {
  const session = sessions.get(tabId);
  if (!session) return { ok: true, tabId, alreadyStopped: true };

  sessions.delete(tabId);
  session.stream.getTracks().forEach((track) => track.stop());
  await session.context.close().catch(() => {});
  return { ok: true, tabId, reason };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== Target.OFFSCREEN) return false;

  const handle = async () => {
    switch (message.type) {
      case Message.START:
        return startSession(message);
      case Message.STOP:
        return stopSession(message.tabId, message.reason);
      case Message.SET_PRESET:
      case Message.SET_VOLUME: {
        const session = sessions.get(message.tabId);
        if (!session) return { ok: false, error: "No active audio session." };
        configureFilters(session, message.config);
        return { ok: true, tabId: message.tabId };
      }
      case Message.OFFSCREEN_GET_SESSIONS:
        return {
          ok: true,
          tabIds: [...sessions.keys()]
        };
      default:
        return { ok: false, error: "Unknown offscreen request." };
    }
  };

  handle()
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
