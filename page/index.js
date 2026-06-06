// Simple timer app (restored working version)

let remaining = 60;
let running = false;
let intervalId = null;
let timeText = null;
let labelText = null;

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
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function updateDisplay() {
  if (timeText) {
    timeText.setProperty(hmUI.prop.TEXT, formatTime(remaining));
  }
}

function updateLabel(text) {
  if (labelText) {
    labelText.setProperty(hmUI.prop.TEXT, text);
  }
}

function stopTimer() {
  running = false;

  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function setTimer(seconds, label) {
  stopTimer();
  remaining = seconds;
  updateLabel(label);
  updateDisplay();
}


function startTimer() {
  if (running) return;

  running = true;

  intervalId = setInterval(function () {
    if (remaining > 0) {
      remaining -= 1;
      updateDisplay();

      if (remaining === 45) {
        vibrateTwoSeconds();
      }
    }

    if (remaining <= 0) {
      stopTimer();
      updateLabel("TIME");
    }
  }, 1000);
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
    text_size: 22,
    color: 0xffffff,
    normal_color: 0x333333,
    press_color: 0x666666,
    radius: 12,
    click_func: clickFunc
  });
}

Page({
  build() {
    labelText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 20,
      w: 390,
      h: 45,
      color: 0xffffff,
      text_size: 24,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: "1 MIN TIMEOUT"
    });

    timeText = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 75,
      w: 390,
      h: 90,
      color: 0xffffff,
      text_size: 64,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE,
      text: formatTime(remaining)
    });

    makeButton(30, 180, 150, 55, "START", startTimer);
    makeButton(210, 180, 150, 55, "PAUSE", stopTimer);

    makeButton(30, 250, 150, 55, "RESET", resetTimer);
    makeButton(210, 250, 150, 55, "15 SEC", function () {
      setTimer(15, "15 SEC WARNING");
    });

    makeButton(30, 320, 150, 55, "1 MIN", function () {
      setTimer(60, "1 MIN TIMEOUT");
      startTimer();
    });

    makeButton(210, 320, 150, 55, "2 MIN", function () {
      setTimer(120, "2 MIN BREAK");
    });

    makeButton(30, 390, 330, 45, "15 MIN MEDICAL", function () {
      setTimer(900, "MEDICAL TIMEOUT");
    });
  }
});
