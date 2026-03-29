#!/bin/sh
set -e

if ! command -v cordova > /dev/null 2>&1; then
  echo "cordova not found, installing globally..."
  npm install -g cordova
fi

cordova platform rm android 2>/dev/null || true
cordova platform add android
cordova run android
