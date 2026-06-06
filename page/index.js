import { createWidget, widget, align, prop } from "@zos/ui";
import { Vibrator, VIBRATOR_SCENE_TIMER } from "@zos/sensor";
import { localStorage } from "@zos/storage";
import {
  setPageBrightTime,
  resetPageBrightTime,
  setWakeUpRelaunch,
  pauseDropWristScreenOff,
  resetDropWristScreenOff,
} from "@zos/display";

const STATE_KEY = "pickleball_timer_state";
const WARNING_TIME = 15;
const SCREEN_TIME_MS = 10 * 60 * 1000;

let timeText = null;
let labelText = null;
let intervalId = null;
let lastRemaining = null;
let vibrator = null;

let state = {
  running: false,
  startedAt: null,
  pausedRemaining: 60,
  label: "1 MIN TIMEOUT",
  warned15: false,
};

function saveState() {
  localStorage.setItem(STATE_KEY, state);
}

function loadState() {
  const loaded = localStorage.getItem(STATE_KEY, null);

  if (loaded) {
    state = {
      running: loaded.running === true,
      startedAt: loaded.startedAt || null,
      pausedRemaining:
        typeof loaded.pausedRemaining === "number"
          ? loaded.pausedRemaining
          : 60,
      label: loaded.label || "1 MIN TIMEOUT",
      warned15: loaded.warned15 === true,
    };
  }
}

function keepScreenOn() {
  setPageBrightTime({ brightTime: SCREEN_TIME_MS });
  pauseDropWristScreenOff({ duration: SCREEN_TIME_MS });
  setWakeUpRelaunch({ relaunch: true });
}

function releaseScreen() {
  resetPageBrightTime();
  resetDropWristScreenOff();
}

function vibrateWarning(maxcount = 10) {
  if (!vibrator) {
    vibrator = new Vibrator();
  }

  let count = 0;

  const pulse = setInterval(function () {
    vibrator.start({ scene: VIBRATOR_SCENE_TIMER });

    setTimeout(function () {
      vibrator.stop();
    }, 250);

    count += 1;

    if (count >= maxcount) {
      clearInterval(pulse);
      vibrator.stop();
    }
  }, 350);
}

function formatTime(seconds) {
  if (seconds <= 0) {
    return "0:00";
  }

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;

  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function getRemaining() {
  if (!state.running) {
    return state.pausedRemaining;
  }

  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const remaining = state.pausedRemaining - elapsed;

  return remaining > 0 ? remaining : 0;
}

function updateDisplay() {
  if (timeText) {
    timeText.setProperty(prop.MORE, {
      text: formatTime(getRemaining()),
    });
  }
}

function updateLabel(text) {
  state.label = text;

  if (labelText) {
    labelText.setProperty(prop.MORE, {
      text: text,
    });
  }
}

function clearDisplayLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function stopTimer() {
  const remainingNow = getRemaining();

  if (state.running) {
    state.pausedRemaining = remainingNow;
    state.running = false;
    state.startedAt = null;
  }

  clearDisplayLoop();
  releaseScreen();
  updateDisplay();
  saveState();
}

function finishTimer() {
  state.running = false;
  state.startedAt = null;
  state.pausedRemaining = 0;
  state.warned15 = false;

  clearDisplayLoop();

  updateLabel("TIME");
  updateDisplay();

  saveState();
  vibrateWarning(3);
}

function setTimer(seconds, label) {
  stopTimer();

  state.pausedRemaining = seconds;
  state.running = false;
  state.startedAt = null;
  state.warned15 = false;

  updateLabel(label);
  updateDisplay();
  saveState();
}

function startDisplayLoop() {
  if (intervalId !== null) {
    return;
  }

  lastRemaining = getRemaining();

  intervalId = setInterval(function () {
    const remaining = getRemaining();

    updateDisplay();

    if (
      !state.warned15 &&
      lastRemaining > WARNING_TIME &&
      remaining <= WARNING_TIME
    ) {
      state.warned15 = true;
      saveState();
      vibrateWarning();
    }

    if (remaining <= 0 && state.running) {
      finishTimer();
      return;
    }

    lastRemaining = remaining;
  }, 1000);
}

function startTimer() {
  if (state.running) {
    return;
  }

  if (state.pausedRemaining <= 0) {
    return;
  }

  state.running = true;
  state.startedAt = Date.now();

  keepScreenOn();
  saveState();
  startDisplayLoop();
}

function startPreset(seconds, label) {
  setTimer(seconds, label);
  startTimer();
}

function resetTimer() {
  setTimer(60, "1 MIN TIMEOUT");
}

function makeButton(x, y, w, h, text, clickFunc) {
  createWidget(widget.BUTTON, {
    x,
    y,
    w,
    h,
    text,
    text_size: 26,
    color: 0xffffff,
    normal_color: 0x333333,
    press_color: 0x666666,
    radius: 12,
    click_func: clickFunc,
  });
}

Page({
  build() {
    loadState();

    labelText = createWidget(widget.TEXT, {
      x: 0,
      y: 20,
      w: 390,
      h: 45,
      color: 0xffffff,
      text_size: 30,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: state.label,
    });

    timeText = createWidget(widget.TEXT, {
      x: 0,
      y: 70,
      w: 390,
      h: 100,
      color: 0xffffff,
      text_size: 80,
      align_h: align.CENTER_H,
      align_v: align.CENTER_V,
      text: formatTime(getRemaining()),
    });

   makeButton(30, 180, 150, 55, "PAUSE", function () {
  if (state.running) {
    stopTimer();
  } else {
    startTimer();
  }
});
makeButton(210, 180, 150, 55, "RESET", resetTimer);

makeButton(30, 250, 150, 55, "1 MIN", function () {
  setTimer(60, "1 MIN TIMEOUT");
  startTimer();
});

makeButton(210, 250, 150, 55, "2 MIN", function () {
  setTimer(120, "2 MIN C ENDS");
  startTimer();
});

makeButton(30, 320, 150, 55, "10 MIN", function () {
  setTimer(600, "10 MIN TIMEOUT");
  startTimer();
});

makeButton(210, 320, 150, 55, "15 MIN", function () {
  setTimer(900, "MEDICAL TIMEOUT");
  startTimer();
});

    if (state.running) {
      keepScreenOn();
      startDisplayLoop();
    }
  },

  onDestroy() {
    clearDisplayLoop();
    saveState();
    releaseScreen();
  },
});