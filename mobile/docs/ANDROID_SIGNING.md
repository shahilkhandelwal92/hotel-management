# StayOS Android Production Keystore & Code Signing Guide

## 1. Security Invariant
* **NEVER** commit `.keystore` or `.jks` files into source control (`.gitignore` protects against accidental inclusion).
* **NEVER** commit signing passwords or aliases in plain text.

---

## 2. Generating Production Release Keystore
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore stayos-release-key.keystore \
  -alias stayos-operations \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

---

## 3. Configuring Local `gradle.properties` (Excluded from Git)
In `~/.gradle/gradle.properties`:
```properties
STAYOS_RELEASE_STORE_FILE=/secure/path/to/stayos-release-key.keystore
STAYOS_RELEASE_KEY_ALIAS=stayos-operations
STAYOS_RELEASE_STORE_PASSWORD=SecureStorePassword
STAYOS_RELEASE_KEY_PASSWORD=SecureKeyPassword
```
