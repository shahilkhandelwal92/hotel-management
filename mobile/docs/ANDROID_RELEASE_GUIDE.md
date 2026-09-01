# StayOS Android Release Build & Packaging Guide

## 1. Local Build Workflow (Free & Open Source Tooling)

### Step 1: Export Hermes Release Bundle
```bash
cd mobile
npm run export:android
```
This generates the optimized Hermes JavaScript bytecode bundle under `mobile/dist/`.

### Step 2: Local Gradle APK Generation
```bash
npx expo run:android --variant release
```
Or with standard Android Studio / Gradle:
```bash
cd android && ./gradlew assembleRelease
```
The output APK is generated at:
`android/app/build/outputs/apk/release/app-release.apk`

### Step 3: Google Play App Bundle (AAB) Generation
```bash
cd android && ./gradlew bundleRelease
```
The output AAB is generated at:
`android/app/build/outputs/bundle/release/app-release.aab`
