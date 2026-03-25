#!/bin/sh
set -e

APK="platforms/android/app/build/outputs/apk/debug/app-debug.apk"

if ! command -v adb > /dev/null 2>&1; then
  echo "adb not found. Install Android SDK platform-tools and ensure adb is in your PATH."
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "APK not found at $APK — run ./run.sh first to build."
  exit 1
fi

# Prefer physical USB device over emulator
SERIAL=$(adb devices -l | awk '/usb:/{print $1; exit}')

if [ -z "$SERIAL" ]; then
  echo "No physical device connected. Enable USB debugging and connect your phone."
  exit 1
fi

echo "Target device: $SERIAL"
echo "Installing $APK..."
adb -s "$SERIAL" install -r "$APK"

echo "Launching app..."
adb -s "$SERIAL" shell am start -n com.henninb.weather/com.henninb.weather.MainActivity
echo "Done."
