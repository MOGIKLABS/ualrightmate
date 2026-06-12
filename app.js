const storeKey = "u-alright-mate-state-v1";
const voiceAgentConfig = window.U_ALRIGHT_MATE_VOICE_AGENT || {};

const fallbackState = {
  color: "blue",
  finish: "gloss",
  accessory: "starry",
  character: "pip",
  playerEmoji: "🥚",
  startedAt: new Date().toISOString(),
  maturityPoints: 0,
  thoughts: "",
  sparks: [],
  activeTab: "sparkList",
  exportTarget: "productivity",
  hatch: 8,
  ideaDates: [],
  lastThoughtMilestone: 0,
  voiceLog: [],
  lastVoiceTranscript: "waiting",
  lastVoiceReply: "ready for a spark",
};

const prompts = [
  "what keeps pulling your attention?",
  "what would make this useful by tonight?",
  "what belongs in work, notes, or a post?",
  "what is the scrappiest next move?",
  "what can be parked without guilt?",
  "what would future-you want titled clearly?",
];

const petLines = {
  empty: [
    "Pip is listening from inside the egg",
    "warm the egg with a tiny idea",
    "type first. Pip can sort it later.",
  ],
  working: [
    "a little crack just appeared",
    "Pip is wriggling in there",
    "that idea warmed the shell",
    "solid spark. Pip heard that one",
  ],
  hatched: [
    "Pip is here and mildly iconic",
    "Pip has entered admin mode",
    "Pip is ready to punt this into the world",
  ],
};

const characterCatalog = [
  { id: "pip", name: "Pip", unlockDays: 0 },
  { id: "day2", name: "Moss", unlockDays: 2 },
  { id: "day5", name: "Nova", unlockDays: 5 },
];

const playerEmojiChoices = ["🥚", "✨", "💿", "🌈", "⚡", "💭", "🌱", "🫧"];

const integrations = {
  productivity: {
    label: "Productivity App > Export",
    extension: "md",
    type: "text/markdown",
    render: ({ sparks, plan, post }) => {
      const workspaceLines = [
        "u alright mate? / workspace outline",
        "",
        "1. Raw sparks",
        ...sparks.map((spark, index) => `   ${index + 1}. ${spark}`),
        "",
        "2. Action list",
        ...plan.map((item, index) => `   ${index + 1}. ${item.title}: ${item.body}`),
        "",
        "3. SNS draft",
        `   ${post}`,
      ];

      return [
        "# Productivity App > Export",
        "",
        "## Notion",
        "",
        "### Sparks",
        ...asMarkdownList(sparks),
        "",
        "### Action Board",
        ...plan.map((item) => `- [ ] **${item.title}** - ${item.body}`),
        "",
        "### SNS Draft",
        post,
        "",
        "## Obsidian",
        "---",
        `created: ${new Date().toISOString().slice(0, 10)}`,
        "source: u alright mate?",
        "tags: [idea-dump, formulated]",
        "---",
        "",
        "### linked sparks",
        ...asMarkdownList(sparks.map((spark) => `[[${titleCase(spark).slice(0, 64)}]]`)),
        "",
        "### next moves",
        ...plan.map((item) => `- [ ] ${item.title}: ${item.body}`),
        "",
        "### SNS draft",
        post,
        "",
        "## Workspace",
        ...workspaceLines,
      ].join("\n");
    },
  },
  sns: {
    label: "SNS",
    extension: "txt",
    type: "text/plain",
    render: ({ post }) => post,
  },
};

const state = loadState();
const els = {
  avatar: document.querySelector("#avatar"),
  petStatus: document.querySelector("#petStatus"),
  sparkCount: document.querySelector("#sparkCount"),
  sessionStamp: document.querySelector("#sessionStamp"),
  petBubble: document.querySelector("#petBubble"),
  characterName: document.querySelector("#characterName"),
  playerEmoji: document.querySelector("#playerEmoji"),
  orbCharacter: document.querySelector("#orbCharacter"),
  orbThoughts: document.querySelector("#orbThoughts"),
  orbNudge: document.querySelector("#orbNudge"),
  orbExport: document.querySelector("#orbExport"),
  thoughtBoard: document.querySelector(".thought-board"),
  exportPanel: document.querySelector(".export-panel"),
  customizer: document.querySelector(".customizer"),
  maturityStatus: document.querySelector("#maturityStatus"),
  maturityHint: document.querySelector("#maturityHint"),
  maturityFill: document.querySelector("#maturityFill"),
  hatchPercent: document.querySelector("#hatchPercent"),
  hatchFill: document.querySelector("#hatchFill"),
  thoughtInput: document.querySelector("#thoughtInput"),
  sparkButton: document.querySelector("#sparkButton"),
  nudgeButton: document.querySelector("#nudgeButton"),
  voiceButton: document.querySelector("#voiceButton"),
  voiceAgent: document.querySelector("#voiceAgent"),
  voiceStatus: document.querySelector("#voiceStatus"),
  voiceTranscript: document.querySelector("#voiceTranscript"),
  voiceReply: document.querySelector("#voiceReply"),
  voicePulse: document.querySelector("#voicePulse"),
  voiceReactor: document.querySelector("#voiceReactor"),
  elevenLabsPanel: document.querySelector("#elevenLabsPanel"),
  elevenLabsStatus: document.querySelector("#elevenLabsStatus"),
  elevenLabsLink: document.querySelector("#elevenLabsLink"),
  elevenLabsConvai: document.querySelector("#elevenLabsConvai"),
  sampleVoiceButton: document.querySelector("#sampleVoiceButton"),
  pipVoiceSample: document.querySelector("#pipVoiceSample"),
  clearButton: document.querySelector("#clearButton"),
  sparkItems: document.querySelector("#sparkItems"),
  emptyState: document.querySelector("#emptyState"),
  planItems: document.querySelector("#planItems"),
  postOutput: document.querySelector("#postOutput"),
  exportOutput: document.querySelector("#exportOutput"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  shareButton: document.querySelector("#shareButton"),
  toast: document.querySelector("#toast"),
};

let recognition = null;
let isListening = false;
let isSpeaking = false;
let isSamplePlaying = false;
let speechVoices = [];
let elevenLabsReactionTimer = null;
let elevenLabsPatchTimer = null;
let elevenLabsPatchAttempts = 0;

boot();

function boot() {
  normalizeState();
  els.thoughtInput.value = state.thoughts;
  wireCharacterControls();
  wireAvatarControls();
  wireTabs();
  wireExportTargets();
  wireCoreActions();
  wirePlayerOrbs();
  setupSpeech();
  setupVoiceSample();
  setupElevenLabsAgent();
  render();
}

function wireCharacterControls() {
  document.querySelectorAll("[data-character]").forEach((button) => {
    button.addEventListener("click", () => {
      const characterId = button.dataset.character;
      if (!isCharacterUnlocked(characterId)) return;
      state.character = characterId;
      bumpHatch(2);
      say(`${getCharacterName(characterId)} tuned in`);
      render();
    });
  });
}

function wireAvatarControls() {
  document.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      state.color = button.dataset.color;
      bumpHatch(2);
      say(randomLine(petLines.working));
      render();
    });
  });

  document.querySelectorAll("[data-finish]").forEach((button) => {
    button.addEventListener("click", () => {
      state.finish = button.dataset.finish;
      bumpHatch(2);
      say("fresh shell finish applied");
      render();
    });
  });

  document.querySelectorAll("[data-accessory]").forEach((button) => {
    button.addEventListener("click", () => {
      state.accessory = button.dataset.accessory;
      bumpHatch(2);
      say("accessory locked in");
      render();
    });
  });
}

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  });
}

function wireExportTargets() {
  document.querySelectorAll("[data-export]").forEach((button) => {
    button.addEventListener("click", () => {
      state.exportTarget = button.dataset.export;
      bumpHatch(1);
      if (els.toast) els.toast.textContent = `${integrations[state.exportTarget].label} selected`;
      render();
    });
  });
}

function wirePlayerOrbs() {
  els.orbCharacter?.addEventListener("click", cyclePlayerEmoji);
  els.orbThoughts?.addEventListener("click", openThoughtsFeelings);
  els.orbNudge?.addEventListener("click", () => addNudgePrompt("nudge dropped in"));
  els.orbExport?.addEventListener("click", openShare);
}

function wireCoreActions() {
  els.thoughtInput.addEventListener("input", () => {
    state.thoughts = els.thoughtInput.value;
    const thoughtLength = state.thoughts.trim().length;
    const milestone = Math.min(10, Math.floor(thoughtLength / 42));
    if (milestone > (state.lastThoughtMilestone || 0)) {
      bumpHatch(Math.min(10, (milestone - (state.lastThoughtMilestone || 0)) * 3));
      state.lastThoughtMilestone = milestone;
      render();
      return;
    }
    if (thoughtLength > 20 && state.hatch < 18) {
      state.hatch = Math.max(state.hatch, 18);
      render();
      return;
    }
    saveState();
    renderMeta();
  });

  els.sparkButton.addEventListener("click", () => {
    const sparks = formulateSparks(state.thoughts);
    if (!sparks.length) {
      shake(els.thoughtInput);
      say(randomLine(petLines.empty));
      return;
    }

    state.sparks = sparks;
    state.activeTab = "sparkList";
    registerIdeaDay();
    bumpHatch(Math.min(42, 14 + sparks.length * 5));
    say(state.hatch >= 100 ? randomLine(petLines.hatched) : randomLine(petLines.working));
    pop(els.avatar);
    render();
  });

  els.nudgeButton.addEventListener("click", () => {
    addNudgePrompt();
  });

  els.clearButton.addEventListener("click", () => {
    state.thoughts = "";
    state.sparks = [];
    state.activeTab = "sparkList";
    state.lastThoughtMilestone = 0;
    els.thoughtInput.value = "";
    say(state.hatch >= 100 ? "board wiped. Pip is still here." : "board wiped. egg still believes.");
    render();
  });

  els.copyButton.addEventListener("click", copyExport);
  els.downloadButton.addEventListener("click", downloadExport);
  els.shareButton.addEventListener("click", shareExport);
}

function cyclePlayerEmoji() {
  const currentIndex = playerEmojiChoices.indexOf(state.playerEmoji);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  state.playerEmoji = playerEmojiChoices[nextIndex % playerEmojiChoices.length];
  bumpHatch(2);
  say(`player emoji ${state.playerEmoji}`);
  pop(els.avatar);
  flashPanel(els.customizer);
  render();
}

function openThoughtsFeelings() {
  state.activeTab = "sparkList";
  bumpHatch(1);
  render();
  els.thoughtBoard?.scrollIntoView({ behavior: "smooth", block: "start" });
  els.thoughtInput?.focus({ preventScroll: true });
  say("thoughts/feelings open");
  flashPanel(els.thoughtBoard);
}

function openShare() {
  bumpHatch(1);
  render();
  els.exportPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
  els.exportOutput?.focus({ preventScroll: true });
  if (els.toast) els.toast.textContent = "share open";
  flashPanel(els.exportPanel);
}

function addNudgePrompt(message = "tiny prompt dropped in") {
  const prompt = randomLine(prompts);
  const spacer = els.thoughtInput.value.trim() ? "\n\n" : "";
  els.thoughtInput.value = `${els.thoughtInput.value}${spacer}${prompt} `;
  state.thoughts = els.thoughtInput.value;
  els.thoughtInput.focus();
  bumpHatch(3);
  saveState();
  say(message);
  render();
}

function flashPanel(element) {
  if (!element) return;
  element.classList.remove("panel-flash");
  void element.offsetWidth;
  element.classList.add("panel-flash");
}

function setupSpeech() {
  setupSpeechSynthesis();
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voiceButton.disabled = true;
    els.voiceButton.title = "Voice capture is unavailable in this browser";
    setVoiceMode("unavailable", "browser voice unavailable");
    setVoiceTranscript("typing lane open");
    setVoiceReply("Pip can still sort typed sparks");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-GB";

  recognition.addEventListener("start", () => {
    isListening = true;
    els.voiceButton.classList.add("active");
    setVoiceMode("listening");
    setVoiceTranscript("listening...");
    say("listening...");
  });

  recognition.addEventListener("result", (event) => {
    const changedResults = Array.from(event.results).slice(event.resultIndex);
    const transcript = changedResults
      .map((result) => result[0]?.transcript || "")
      .join(" ");

    const finalText = changedResults
      .filter((result) => result.isFinal)
      .map((result) => result[0]?.transcript || "")
      .join(" ");

    if (finalText.trim()) {
      captureVoiceThought(finalText);
    } else if (transcript.trim()) {
      setVoiceTranscript(transcript);
    }
  });

  recognition.addEventListener("error", (event) => {
    isListening = false;
    els.voiceButton.classList.remove("active");
    const blocked = event.error === "not-allowed" || event.error === "service-not-allowed";
    const message = blocked ? "mic blocked" : "voice fizzled";
    setVoiceMode("ready", message);
    say(message);
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    els.voiceButton.classList.remove("active");
    if (!isSpeaking) setVoiceMode("ready");
    renderMeta();
  });

  els.voiceButton.addEventListener("click", () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      say("voice paused");
      return;
    }
    stopVoiceSample(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    isSpeaking = false;
    try {
      recognition.start();
    } catch {
      setVoiceMode("ready", "voice already waking");
    }
  });
}

function setupElevenLabsAgent() {
  if (!els.elevenLabsPanel || !voiceAgentConfig.agentId) return;

  if (els.elevenLabsConvai) {
    els.elevenLabsConvai.setAttribute("agent-id", voiceAgentConfig.agentId);
    if (voiceAgentConfig.branchId) {
      els.elevenLabsConvai.setAttribute("branch-id", voiceAgentConfig.branchId);
    }
  }

  if (els.elevenLabsLink && voiceAgentConfig.talkToUrl) {
    els.elevenLabsLink.href = voiceAgentConfig.talkToUrl;
  }

  setElevenLabsStatus("connecting");
  els.elevenLabsPanel.classList.add("is-connecting");

  const markOnline = () => {
    els.elevenLabsPanel.classList.remove("is-connecting", "is-fallback");
    els.elevenLabsPanel.classList.add("is-online");
    setElevenLabsStatus("elevenlabs online");
    setVoiceReply("Pip live voice is linked");
    elevenLabsPatchAttempts = 0;
    window.setTimeout(patchElevenLabsWidget, 160);
    return true;
  };

  const markFallback = () => {
    if (window.customElements?.get("elevenlabs-convai")) return markOnline();
    els.elevenLabsPanel.classList.remove("is-connecting");
    els.elevenLabsPanel.classList.add("is-fallback");
    setElevenLabsStatus("open agent ready");
    return false;
  };

  if (!window.customElements) {
    markFallback();
    return;
  }

  window.customElements.whenDefined("elevenlabs-convai").then(markOnline).catch(markFallback);
  window.setTimeout(markFallback, 3600);
}

function setupVoiceSample() {
  if (!els.sampleVoiceButton || !els.pipVoiceSample) return;

  els.pipVoiceSample.volume = 0.86;

  els.sampleVoiceButton.addEventListener("click", async () => {
    if (isSamplePlaying) {
      stopVoiceSample();
      return;
    }

    if (recognition && isListening) recognition.stop();
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    try {
      els.pipVoiceSample.currentTime = 0;
      await els.pipVoiceSample.play();
    } catch {
      isSamplePlaying = false;
      setVoiceMode("ready", "sample blocked");
      setVoiceReply("Tap sample again if the browser held it back");
      say("sample blocked");
      renderVoiceAgent();
    }
  });

  els.pipVoiceSample.addEventListener("play", () => {
    isSamplePlaying = true;
    els.sampleVoiceButton.textContent = "stop";
    setVoiceTranscript("pip sample");
    setVoiceReply("Pip voice sample playing");
    setVoiceMode("sample", "pip sample");
    say("pip voice sample");
    pop(els.avatar);
    renderVoiceAgent();
  });

  els.pipVoiceSample.addEventListener("pause", () => {
    isSamplePlaying = false;
    els.sampleVoiceButton.textContent = "sample";
    if (!isListening && !isSpeaking) setVoiceMode("ready");
    renderVoiceAgent();
  });

  els.pipVoiceSample.addEventListener("ended", () => {
    isSamplePlaying = false;
    els.sampleVoiceButton.textContent = "sample";
    setVoiceMode("ready", "pip voice ready");
    renderVoiceAgent();
  });

  els.pipVoiceSample.addEventListener("error", () => {
    isSamplePlaying = false;
    els.sampleVoiceButton.textContent = "sample";
    setVoiceMode("ready", "sample missing");
    setVoiceReply("Pip sample could not load");
    say("sample missing");
    renderVoiceAgent();
  });
}

function patchElevenLabsWidget() {
  const root = els.elevenLabsConvai?.shadowRoot;
  if (!root) {
    window.clearTimeout(elevenLabsPatchTimer);
    if (elevenLabsPatchAttempts < 8) {
      elevenLabsPatchAttempts += 1;
      elevenLabsPatchTimer = window.setTimeout(patchElevenLabsWidget, 420);
    }
    return false;
  }

  if (!root.querySelector("#pip-widget-cleanup")) {
    const style = document.createElement("style");
    style.id = "pip-widget-cleanup";
    style.textContent = `
      a[href*="elevenlabs"], a[href*="elevenagents"] { display: none !important; }
      img, [class*="logo"], [class*="avatar"] { display: none !important; }
    `;
    root.append(style);
  }

  root.querySelectorAll("a").forEach((link) => {
    if (/eleven/i.test(link.textContent || link.href)) link.hidden = true;
  });

  root.querySelectorAll("button").forEach((button) => {
    if (button.dataset.pipBound === "true") return;
    button.dataset.pipBound = "true";
    button.addEventListener("click", () => {
      const label = `${button.textContent} ${button.getAttribute("aria-label") || ""}`;
      if (/start|call/i.test(label)) {
        markElevenLabsInteraction("listening", "pip live voice waking", "live voice");
      } else if (/message/i.test(label)) {
        markElevenLabsInteraction("ready", "message lane ready", "type to Pip");
      }
    });
  });

  if (elevenLabsPatchAttempts < 8) {
    elevenLabsPatchAttempts += 1;
    window.clearTimeout(elevenLabsPatchTimer);
    elevenLabsPatchTimer = window.setTimeout(patchElevenLabsWidget, 700);
  }

  return true;
}

function markElevenLabsInteraction(mode, status, reply) {
  window.clearTimeout(elevenLabsReactionTimer);
  setVoiceMode(mode, status);
  setVoiceReply(reply);
  say(status);
  if (mode === "listening") pop(els.avatar);
  elevenLabsReactionTimer = window.setTimeout(() => {
    if (!isListening && !isSpeaking && !isSamplePlaying) setVoiceMode("ready");
    renderVoiceAgent();
  }, 2400);
}

function stopVoiceSample(reset = false) {
  if (!els.pipVoiceSample) return;
  els.pipVoiceSample.pause();
  if (reset) els.pipVoiceSample.currentTime = 0;
}

function setupSpeechSynthesis() {
  if (!("speechSynthesis" in window)) return;
  cacheSpeechVoices();
  window.speechSynthesis.addEventListener("voiceschanged", cacheSpeechVoices);
}

function cacheSpeechVoices() {
  speechVoices = window.speechSynthesis.getVoices();
}

function captureVoiceThought(rawText) {
  const cleanText = cleanVoiceText(rawText);
  if (!cleanText) return;

  const spacer = els.thoughtInput.value.trim() ? "\n" : "";
  els.thoughtInput.value = `${els.thoughtInput.value}${spacer}${cleanText}`;
  state.thoughts = els.thoughtInput.value;
  state.sparks = formulateSparks(state.thoughts);
  state.activeTab = "sparkList";
  state.lastVoiceTranscript = cleanText;
  registerIdeaDay();
  bumpHatch(10);

  const reply = createVoiceReply(cleanText);
  state.lastVoiceReply = reply;
  state.voiceLog = [{ heard: cleanText, reply, at: new Date().toISOString() }, ...state.voiceLog].slice(0, 8);

  say(reply);
  pop(els.avatar);
  render();
  speakPip(reply);
}

function createVoiceReply(text) {
  const sparks = formulateSparks(text);
  const firstSpark = shortenForSpeech(sparks[0] || cleanVoiceText(text));
  const sparkCount = sparks.length || 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const questionish = /[?]|\b(why|how|what|when|where|should|could|can|do we|does)\b/i.test(text);
  const actionish = /\b(make|build|write|draft|post|send|ship|launch|book|email|call|design|test|record|publish|decide|choose|fix|update|schedule|export|action)\b/i.test(text);

  if (state.hatch >= 96) {
    return `Pip is out. I caught ${sparkCount} spark${sparkCount === 1 ? "" : "s"}: ${firstSpark}.`;
  }

  if (questionish) {
    return `Caught it. I am parking the question first: ${firstSpark}.`;
  }

  if (actionish) {
    return `Got it. I heard an action spark: ${firstSpark}.`;
  }

  if (wordCount > 28) {
    return `Big bundle caught. I found ${sparkCount} spark${sparkCount === 1 ? "" : "s"} and made the first one: ${firstSpark}.`;
  }

  return `Got it. Tiny spark logged: ${firstSpark}.`;
}

function speakPip(message) {
  if (!("speechSynthesis" in window) || !message) {
    setVoiceMode("ready");
    return;
  }

  stopVoiceSample(true);
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  const voice = pickPipVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || navigator.language || "en-GB";
  utterance.rate = 1.04;
  utterance.pitch = 1.35;
  utterance.volume = 0.9;

  utterance.addEventListener("start", () => {
    isSpeaking = true;
    setVoiceMode("speaking");
  });
  utterance.addEventListener("end", () => {
    isSpeaking = false;
    setVoiceMode("ready");
    renderVoiceAgent();
  });
  utterance.addEventListener("error", () => {
    isSpeaking = false;
    setVoiceMode("ready", "pip reply muted");
    renderVoiceAgent();
  });

  isSpeaking = true;
  setVoiceMode("speaking");
  synth.speak(utterance);
}

function pickPipVoice() {
  const voices = speechVoices.length ? speechVoices : window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => /^en-GB/i.test(voice.lang) && /female|sonia|serena|google/i.test(voice.name)) ||
    voices.find((voice) => /^en/i.test(voice.lang)) ||
    voices[0]
  );
}

function setVoiceMode(mode, message) {
  const labels = {
    ready: "pip voice ready",
    listening: "listening...",
    speaking: "pip replying",
    sample: "pip sample",
    unavailable: "browser voice unavailable",
  };

  if (els.voiceAgent) {
    els.voiceAgent.dataset.voiceMode = mode;
    els.voiceAgent.classList.toggle("is-listening", mode === "listening");
    els.voiceAgent.classList.toggle("is-speaking", mode === "speaking");
    els.voiceAgent.classList.toggle("is-sample", mode === "sample");
  }

  document.body.dataset.voiceMode = mode;
  if (els.voiceStatus) els.voiceStatus.textContent = message || labels[mode] || labels.ready;
  if (els.voiceButton) els.voiceButton.setAttribute("aria-pressed", String(mode === "listening"));
}

function setVoiceTranscript(text) {
  const cleanText = cleanVoiceText(text) || "waiting";
  state.lastVoiceTranscript = cleanText;
  if (els.voiceTranscript) els.voiceTranscript.textContent = cleanText;
}

function setVoiceReply(text) {
  const cleanText = cleanVoiceText(text) || "ready for a spark";
  state.lastVoiceReply = cleanText;
  if (els.voiceReply) els.voiceReply.textContent = cleanText;
}

function setElevenLabsStatus(text) {
  if (!els.elevenLabsStatus) return;
  els.elevenLabsStatus.textContent = cleanVoiceText(text) || "connecting";
}

function renderVoiceAgent() {
  if (!els.voiceAgent) return;
  els.voiceAgent.classList.toggle("is-listening", isListening);
  els.voiceAgent.classList.toggle("is-speaking", isSpeaking);
  els.voiceAgent.classList.toggle("is-sample", isSamplePlaying);
  if (els.voiceTranscript) els.voiceTranscript.textContent = state.lastVoiceTranscript || "waiting";
  if (els.voiceReply) els.voiceReply.textContent = state.lastVoiceReply || "ready for a spark";
  if (els.voiceButton) els.voiceButton.setAttribute("aria-pressed", String(isListening));
}

function render() {
  renderAvatar();
  renderMeta();
  renderTabs();
  renderSparks();
  renderPlan();
  renderPost();
  renderExport();
  renderVoiceAgent();
  saveState();
}

function renderAvatar() {
  const characterId = isCharacterUnlocked(state.character) ? state.character : "pip";
  const hatchStage = getHatchStage(state.hatch);
  state.character = characterId;
  els.avatar.className = `hatch-avatar character-${characterId} ${state.color} ${state.finish} ${state.accessory} ${hatchStage}`;
  els.avatar.setAttribute("aria-label", getHatchStatus(state.hatch, characterId));
  if (els.playerEmoji) els.playerEmoji.textContent = state.playerEmoji || playerEmojiChoices[0];
  els.characterName.textContent = getCharacterName(characterId);
  document.body.classList.toggle("is-happy", state.sparks.length > 0);
  document.body.classList.toggle("is-hatched", state.hatch >= 100);
  document.body.dataset.hatchStage = hatchStage;

  renderCharacterRoster();
  document.querySelectorAll("[data-color]").forEach((button) => {
    button.classList.toggle("active", button.dataset.color === state.color);
  });
  document.querySelectorAll("[data-finish]").forEach((button) => {
    button.classList.toggle("active", button.dataset.finish === state.finish);
  });
  document.querySelectorAll("[data-accessory]").forEach((button) => {
    button.classList.toggle("active", button.dataset.accessory === state.accessory);
  });
}

function renderMeta() {
  const sparkLabel = state.sparks.length === 1 ? "1 spark" : `${state.sparks.length} sparks`;
  els.petStatus.textContent = getHatchStatus(state.hatch, state.character);
  els.sparkCount.textContent = sparkLabel;
  els.hatchPercent.textContent = `${state.hatch}%`;
  els.hatchFill.style.width = `${state.hatch}%`;
  els.sessionStamp.textContent = `local ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  renderMaturity();
}

function renderMaturity() {
  const maturity = getMateMaturity();
  if (els.maturityStatus) {
    els.maturityStatus.textContent = `day ${maturity.day} · ${maturity.status}`;
  }
  if (els.maturityFill) {
    els.maturityFill.style.width = `${maturity.progress}%`;
  }
  if (els.maturityHint) {
    els.maturityHint.textContent = maturity.next
      ? `next: ${maturity.next.status} at day ${maturity.next.day}. ideas and chats speed it up.`
      : "fully fledged adult. more ideas keep Pip sharper.";
  }
}

function renderCharacterRoster() {
  document.querySelectorAll("[data-character]").forEach((button) => {
    const characterId = button.dataset.character;
    const unlocked = isCharacterUnlocked(characterId);
    button.disabled = !unlocked;
    button.classList.toggle("locked", !unlocked);
    button.classList.toggle("active", characterId === state.character && unlocked);
  });
}

function normalizeState() {
  const legacyExportTargets = {
    notion: "productivity",
    obsidian: "productivity",
    docs: "productivity",
    social: "sns",
  };
  if (!Array.isArray(state.ideaDates)) state.ideaDates = [];
  if (!Array.isArray(state.voiceLog)) state.voiceLog = [];
  if (!state.character) state.character = "pip";
  if (!playerEmojiChoices.includes(state.playerEmoji)) state.playerEmoji = playerEmojiChoices[0];
  if (!state.startedAt || Number.isNaN(new Date(state.startedAt).getTime())) {
    state.startedAt = new Date().toISOString();
  }
  if (!Number.isFinite(state.maturityPoints)) state.maturityPoints = 0;
  state.exportTarget = legacyExportTargets[state.exportTarget] || state.exportTarget;
  if (!integrations[state.exportTarget]) state.exportTarget = "productivity";
  if (typeof state.lastVoiceTranscript !== "string") state.lastVoiceTranscript = "waiting";
  if (typeof state.lastVoiceReply !== "string") state.lastVoiceReply = "ready for a spark";
  if (!Number.isFinite(state.lastThoughtMilestone)) state.lastThoughtMilestone = 0;
  if (!isCharacterUnlocked(state.character)) state.character = "pip";
}

function getHatchStage(hatch) {
  if (hatch >= 100) return "stage-hatched";
  if (hatch >= 72) return "stage-peeking";
  if (hatch >= 40) return "stage-cracking";
  if (hatch >= 18) return "stage-warming";
  return "stage-egg";
}

function getHatchStatus(hatch, characterId = "pip") {
  const characterName = getCharacterName(characterId);
  if (hatch >= 100) return `${characterName} mode`;
  if (hatch >= 72) return `${characterName} peeking`;
  if (hatch >= 40) return "shell cracking";
  if (hatch >= 18) return "egg warming";
  return "egg mode";
}

function getMateMaturity() {
  const startedAt = new Date(state.startedAt).getTime();
  const calendarDay = Number.isFinite(startedAt)
    ? Math.max(1, Math.floor((Date.now() - startedAt) / 86400000) + 1)
    : 1;
  const engagementDayBoost = Math.floor((state.maturityPoints || 0) / 18);
  const day = Math.min(14, Math.max(1, calendarDay + engagementDayBoost));
  const progress = Math.min(100, Math.round((day / 14) * 100));
  const status = getMaturityStatus(day);
  const next = getNextMaturity(day);
  return { day, status, progress, next };
}

function getMaturityStatus(day) {
  if (day >= 14) return "fully fledged adult";
  if (day >= 5) return "teenager";
  if (day >= 3) return "toddler";
  return "baby status";
}

function getNextMaturity(day) {
  if (day < 3) return { day: 3, status: "toddler" };
  if (day < 5) return { day: 5, status: "teenager" };
  if (day < 14) return { day: 14, status: "fully fledged adult" };
  return null;
}

function getCharacterName(characterId) {
  return characterCatalog.find((character) => character.id === characterId)?.name || "Pip";
}

function isCharacterUnlocked(characterId) {
  const character = characterCatalog.find((item) => item.id === characterId);
  if (!character) return false;
  return ideaDayCount() >= character.unlockDays;
}

function registerIdeaDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (!state.ideaDates.includes(today)) {
    state.ideaDates.push(today);
  }
}

function ideaDayCount() {
  return Array.isArray(state.ideaDates) ? new Set(state.ideaDates).size : 0;
}

function renderTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const isActive = button.dataset.tab === state.activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === state.activeTab);
  });
}

function renderSparks() {
  els.sparkItems.innerHTML = "";
  state.sparks.forEach((spark) => {
    const item = document.createElement("li");
    item.textContent = spark;
    els.sparkItems.append(item);
  });
  els.emptyState.hidden = state.sparks.length > 0;
}

function renderPlan() {
  els.planItems.innerHTML = "";
  const plan = createPlan(state.sparks);
  if (!plan.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "make sparks first, then this becomes a tidy list";
    els.planItems.append(empty);
    return;
  }

  plan.forEach((item) => {
    const card = document.createElement("article");
    card.className = "plan-card";
    const title = document.createElement("h3");
    title.textContent = item.title;
    const body = document.createElement("p");
    body.textContent = item.body;
    card.append(title, body);
    els.planItems.append(card);
  });
}

function renderPost() {
  els.postOutput.value = createPost(state.sparks);
}

function renderExport() {
  document.querySelectorAll("[data-export]").forEach((button) => {
    button.classList.toggle("active", button.dataset.export === state.exportTarget);
  });

  els.exportOutput.value = buildExport();
}

function formulateSparks(raw) {
  return raw
    .split(/\n+|(?<=[.!?])\s+/)
    .map(cleanSpark)
    .filter(Boolean)
    .flatMap(splitLongSpark)
    .map(cleanSpark)
    .filter(uniqueOnly)
    .slice(0, 12);
}

function cleanSpark(text) {
  return text
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.?!]+$/, "");
}

function cleanVoiceText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortenForSpeech(text, maxLength = 76) {
  const cleanText = cleanVoiceText(text);
  if (cleanText.length <= maxLength) return cleanText;
  return `${cleanText.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function splitLongSpark(text) {
  if (text.length < 135) return [text];
  return text
    .split(/\s(?:and|but|so|then|also|because)\s/i)
    .filter(Boolean)
    .slice(0, 3);
}

function uniqueOnly(value, index, list) {
  return list.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index;
}

function createPlan(sparks) {
  if (!sparks.length) return [];

  const actionWords = /(launch|ship|send|make|build|write|draft|post|book|email|call|design|test|record|publish|decide|choose|fix|update|schedule|export|action)/i;
  const questionWords = /(\?|why|how|what|when|where|should|could|can we|do we)/i;

  const actions = sparks.filter((spark) => actionWords.test(spark)).slice(0, 4);
  const questions = sparks.filter((spark) => !actions.includes(spark) && questionWords.test(spark)).slice(0, 3);
  const leftovers = sparks
    .filter((spark) => !actions.includes(spark) && !questions.includes(spark))
    .slice(0, 4);

  const plan = [];
  if (actions.length) {
    plan.push({
      title: "next moves",
      body: actions.map((spark) => softenAction(spark)).join("; "),
    });
  }

  if (questions.length) {
    plan.push({
      title: "open questions",
      body: questions.join("; "),
    });
  }

  if (leftovers.length) {
    plan.push({
      title: "park for later",
      body: leftovers.join("; "),
    });
  }

  plan.push({
    title: "tiny first step",
    body: actions[0] ? `Start with: ${softenAction(actions[0])}` : `Name the clearest useful piece: ${sparks[0]}`,
  });

  return plan;
}

function createPost(sparks) {
  if (!sparks.length) {
    return "messy thought -> tidy spark. more soon.";
  }

  const lead = sparks[0];
  const supporting = sparks.slice(1, 4);
  const lines = [`thinking about this: ${lead}.`];

  if (supporting.length) {
    lines.push("");
    supporting.forEach((spark) => lines.push(`- ${spark}`));
  }

  lines.push("");
  lines.push("turning the mess into something useful.");
  return lines.join("\n");
}

function buildExport() {
  const adapter = integrations[state.exportTarget] || integrations.productivity;
  const payload = {
    sparks: state.sparks.length ? state.sparks : formulateSparks(state.thoughts),
    plan: createPlan(state.sparks.length ? state.sparks : formulateSparks(state.thoughts)),
    post: createPost(state.sparks.length ? state.sparks : formulateSparks(state.thoughts)),
  };
  return adapter.render(payload);
}

function asMarkdownList(items) {
  if (!items.length) return ["- No sparks captured yet."];
  return items.map((item) => `- ${item}`);
}

function softenAction(text) {
  const trimmed = text.trim();
  if (/^(make|build|write|draft|post|send|ship|launch|book|email|call|design|test|record|publish|decide|choose|fix|update|schedule)\b/i.test(trimmed)) {
    return trimmed;
  }
  return `shape "${trimmed}" into a concrete next step`;
}

async function copyExport() {
  const text = buildExport();
  try {
    await navigator.clipboard.writeText(text);
    say(`${integrations[state.exportTarget].label} copied`);
  } catch {
    els.exportOutput.select();
    document.execCommand("copy");
    say("copied from the old-school lane");
  }
}

function downloadExport() {
  const adapter = integrations[state.exportTarget] || integrations.productivity;
  const blob = new Blob([buildExport()], { type: adapter.type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `u-alright-mate-${state.exportTarget}.${adapter.extension}`;
  link.click();
  URL.revokeObjectURL(url);
  say(`${adapter.label} file downloaded`);
}

async function shareExport() {
  const text = buildExport();
  if (!navigator.share) {
    await copyExport();
    say("share unavailable, copied instead");
    return;
  }

  try {
    await navigator.share({
      title: "u alright mate?",
      text,
    });
    say("sent to share sheet");
  } catch {
    say("share cancelled");
  }
}

function bumpHatch(amount) {
  const cleanAmount = Number.isFinite(amount) ? amount : 0;
  state.hatch = Math.min(100, Math.max(8, state.hatch + cleanAmount));
  state.maturityPoints = Math.max(0, (state.maturityPoints || 0) + Math.max(0, cleanAmount));
}

function say(message) {
  els.petBubble.textContent = message;
  els.toast.textContent = message;
}

function randomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function shake(element) {
  element.classList.remove("shake");
  void element.offsetWidth;
  element.classList.add("shake");
}

function pop(element) {
  element.classList.remove("pop");
  void element.offsetWidth;
  element.classList.add("pop");
}

function titleCase(text) {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function loadState() {
  try {
    return { ...fallbackState, ...JSON.parse(localStorage.getItem(storeKey)) };
  } catch {
    return { ...fallbackState };
  }
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}
