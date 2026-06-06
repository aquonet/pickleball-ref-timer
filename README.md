# Pickleball Ref Timer

A referee timer application for the Amazfit Bip 6, built with Zepp OS API 3.

## Features

* One-touch presets

  * 1 Minute Timeout
  * 2 Minute Between Games
  * 10 Minute Timeout
  * 15 Minute Medical Timeout
* 15-second vibration warning
* End-of-timer vibration
* Pause / Resume
* Automatic state persistence when the watch returns to the watch face
* Automatic recovery when the app is reopened

## Development

* Zepp OS API 3.0
* JavaScript
* Zeus CLI

## Build

```bash
npm install
zeus preview
```

or

```bash
zeus build
```

## Notes

The application stores its timer state using local storage so that timers continue correctly even if the watch exits to the watch face.

