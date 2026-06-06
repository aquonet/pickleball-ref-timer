// Simple timer app - Amazfit Bip 6
// Fix: use hmFS to persist timer state across app dismissals

const STATE_FILE = "timer_state.json";

let timeText = null;
let labelText = null;
let intervalId = null;
let lastRemaining = null;

// Default state
let state = {
  running: false,
  startedAt: null,
  pausedRemaining: 60,
  label: "1 MIN TIMEOUT"
};

function saveState() {
  try {
    const json = JSON.stringify(state);
    const buf = new Uint8Array(json.length);
    for (let i = 0; i < json.length; i++) {
      buf[i] = json.charCodeAt(i);
    }
    hmFS.write(STATE_FILE, buf.buffer, 0, buf.length);
  } catch (e) {}
}

function loadState() {
  try {
    const [statInfo, err] = hmFS.stat(STATE_FILE);
    if (err !== 0 || !statInfo) return;
    const size = statInfo.size;
    if (size <= 0) return;
    const buf = new ArrayBuffer(size);
    hmFS.read(STATE_FILE, buf, 0, size);
    const arr = new Uint8Array(buf);
    let json = "";
    for (let i = 0; i < arr.length; i++) {
      json += String.fromCharCode(arr[i]);
    }
    const loaded = JSON.parse(json);
    if (loaded) state = loaded;
  } catch (e) {}
}

function vibrateTwoSeconds() {
  const vibrate = hmSensor.createSensor(hmSensor.id.VIBRATE);
  let count = 0;
  const pulse = setInterval(function () {
    vibrate.scene = 27;
    vibrate.start();
    setTimeout(function () {
      vibrate.stop();
    }, 250);
    count += 1;
    if (count >= 10) {
      clearInterval(pulse);
      vibrate.stop();
    }
  }, 350);
}

function formatTime(seconds) {
  if (seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function getRemaining() {
  if (!state.running) return state.pausedRemaining;
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const remaining = state.pausedRemaining - elapsed;
  return remaining > 0 ? remaining : 0;
}

function updateDisplay() {
  if (timeText) {
    timeText.setProperty(hmUI.prop.TEXT, formatTime(getRemaining()));
  }
}

function updateLabel(text) {
  state.label = text;
  if (labelText) {
    labelText.setProperty(hmUI.prop.TEXT, text);
  }
}

function stopTimer() {
  if (state.running) {
    state.pausedRemaining = getRemaining();
    state.running = false;
    state.startedAt = null;
  }
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  updateDisplay();
  saveState();
}

function setTimer(seconds, label) {
  stopTimer();
  state.pausedRemaining = seconds;
  state.running = false;
  state.startedAt = null;
  updateLabel(label);
  updateDisplay();
  saveState();
}

function startDisplayLoop() {
  if (intervalId !== null) return;
  lastRemaining = getRemaining();
  intervalId = setInterval(function () {
    const remaining = getRemaining();
    updateDisplay();

    // Vibrate when crossing 15 seconds
    if (lastRemaining > 15 && remaining <= 15) {
      vibrateTwoSeconds();
    }

    // Timer finished - beep and stop
    if (remaining <= 0 && state.running) {
      stopTimer();
      updateLabel("TIME");
      saveState();
      vibrateTwoSeconds();
    }

    lastRemaining = remaining;
  }, 1000);
}

function startTimer() {
  if (state.running) return;
  if (state.pausedRemaining <= 0) return;
  state.running = true;
  state.startedAt = Date.now();
  saveState();
  startDisplayLoop();
}

function resetTimer() {
  setTimer(60, "1 MIN TIMEOUT");
}

function makeButton(x, y, w, h, text, clickFunc) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    x: x,
    y: y,
    w: w,
    h: h,
    text: text,
    text_size: 26,
    color: 0xffffff,
    normal_color: 0x333333,
    press_color: 0x666666,
    radius: 12,
    click_func: clickFunc
  });
}

Page({
  build() {
    // Load persisted state first
    loadState();

    labelText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 20, w: 390, h: 45,
      color: 0xffffff, text_size: 30,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      char_space: 2,
      text: state.label
    });

    timeText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0, y: 70, w: 390, h: 100,
      color: 0xffffff, text_size: 80,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      char_space: 2,
      text: formatTime(getRemaining())
    });

    makeButton(30, 180, 150, 55, "START", startTimer);
    makeButton(210, 180, 150, 55, "PAUSE", stopTimer);
    makeButton(30, 250, 150, 55, "RESET", resetTimer);
    makeButton(210, 250, 150, 55, "10 MIN", function () {
      setTimer(600, "10 MIN TIMEOUT");
      startTimer();
    });
    makeButton(30, 320, 150, 55, "1 MIN", function () {
      setTimer(60, "1 MIN TIMEOUT");
      startTimer();
    });
    makeButton(210, 320, 150, 55, "2 MIN", function () {
      setTimer(120, "2 MIN BREAK");
      startTimer();
    });
    makeButton(30, 390, 330, 45, "15 MIN MEDICAL", function () {
      setTimer(900, "MEDICAL TIMEOUT");
      startTimer();
    });

    // If timer was running before app was dismissed, resume display loop
    if (state.running) {
      startDisplayLoop();
    }
  }
});
