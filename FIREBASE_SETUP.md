# Firebase Setup

ANL uses Firebase for push notifications (FCM). Two files are required:

---

## iOS — `GoogleService-Info.plist`

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project or open existing → Add app → iOS
3. Bundle ID: `com.cloudygetty.allnightlong`
4. Download `GoogleService-Info.plist`
5. Place at: `ANL/GoogleService-Info.plist` (project root)

---

## Android — `google-services.json`

1. Same Firebase project → Add app → Android
2. Package name: `com.cloudygetty.allnightlong`
3. Download `google-services.json`
4. Place at: `ANL/google-services.json` (project root)

---

## APNs Key (iOS push — required for TestFlight)

1. [developer.apple.com](https://developer.apple.com) → Certificates → Keys → Create new key
2. Enable "Apple Push Notifications service (APNs)"
3. Download `.p8` file — **save it, you can only download once**
4. Note your Key ID and Team ID

Upload to Firebase:
- Firebase Console → Project Settings → Cloud Messaging → APNs Auth Key
- Upload `.p8`, enter Key ID + Team ID

---

## Expo Push (simpler alternative for development)

ANL's `push.js` service already uses `expo-server-sdk` as primary.
Firebase is the fallback for production reliability.

To use Expo push only (skip Firebase during dev):
```bash
# Just set this in .env — no Firebase needed for Expo Go testing
EXPO_ACCESS_TOKEN=your_expo_access_token
```

Get token: [expo.dev/accounts/[your-account]/settings/access-tokens](https://expo.dev)

---

## Placeholder files (prevents EAS build errors)

The files below are gitignored. EAS will error if `google-services.json`
is referenced in `app.config.js` but missing. Either:

**Option A** — Add real files before building
**Option B** — Comment out Firebase plugin in `app.config.js` until ready:

```js
// In app.config.js, comment out:
// googleServicesFile: './google-services.json',
```
