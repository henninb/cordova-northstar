# Polaris (cordova-northstar)

A cross-platform mobile application built with Apache Cordova that displays weather, sports scores, and astronomy information for the Twin Cities area.

## Features

- Current weather conditions
- Sports scores
- Astronomy data (sunrise, sunset, moon phase)
- Twin Cities focused content

## Tech Stack

- Apache Cordova
- HTML/CSS/JavaScript (in `www/`)
- Targets Android and iOS

## Prerequisites

- Node.js and npm
- Apache Cordova CLI: `npm install -g cordova`
- Android SDK (for Android builds)
- Xcode (for iOS builds, macOS only)

## Setup

```bash
npm install
```

## Build & Run

```bash
# Android
npm run build:android
npm run run:android

# iOS
npm run build:ios
npm run run:ios

# Serve locally
npm start
```

Or use the deploy script:

```bash
./deploy.sh
```
