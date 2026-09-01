# StayOS Android Application Rollback SOP

## 1. Trigger Conditions
* Critical crash upon login on supported device models.
* Failure in offline recovery or token restoration.

---

## 2. Fast Rollback Procedure
1. Notify on-duty staff to revert to previous stable release (`v1.0.0`, VersionCode 1).
2. Distribute `StayOS-Operations-v1.0.0.apk` via internal MDM / portal.
3. Users install the previous package over the existing installation.
4. Server backward compatibility ensures all session tokens and operational APIs remain functional.
