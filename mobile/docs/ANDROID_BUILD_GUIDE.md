# StayOS Android Local Build & APK Packaging Guide

## 1. Prerequisites (100% Free & Open Source)
* Node.js 20+ & npm
* Android Studio (Latest stable Ladybug / Koala)
* Android SDK Platform 34+ / Build-Tools 34.0.0
* JDK 17 (Eclipse Temurin / OpenJDK)

---

## 2. Environment Configuration
Create `mobile/.env`:
```env
# For local Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# For physical device on same WiFi network
# EXPO_PUBLIC_API_URL=http://192.168.1.100:3000

# For production deployment
# EXPO_PUBLIC_API_URL=https://api.stayos.com
```

---

## 3. Development Workflow

### Step 1: Start Backend Server
```bash
# In hotel-management root
npm run dev
```

### Step 2: Start Expo Dev Server
```bash
cd mobile
npx expo start --android
```

---

## 4. Local APK Build (Free - No EAS Cloud Subscription Required)

### Option A: Local Prebuild & Gradle APK Generation
```bash
cd mobile

# Generate native Android project files
npx expo prebuild --platform android

# Build debug installable APK
cd android
./gradlew assembleDebug

# Output APK location:
# mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B: Local EAS CLI Build (Free tier or local flag)
```bash
cd mobile
npx eas-cli build --platform android --profile preview --local
```

---

## 5. Physical Device / Emulator Installation
```bash
# Install to connected device via ADB
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```
