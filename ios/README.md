# Sidequest — iOS

Native SwiftUI app for **Sidequest**. The Xcode target folder is still named **WeekendExplorer** (legacy naming from an earlier scaffold). It talks to the FastAPI backend at `/discover` and `/plan`, uses Firebase Auth + Firestore, and reads Google Calendar for free weekend slots.

> **Hackathon demo path:** The web app (`frontend/`) is the primary demo surface. The iOS app is optional and not required for the live pitch or App Hosting deploy.

## Prerequisites

- macOS with Xcode 15+ (iOS 17 SDK)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
- Firebase project `perfect-weekend-planner` with an **iOS app** registered
- FastAPI backend running locally (see repo root `README.md`)

## Setup

1. **Generate the Xcode project**

   ```bash
   cd ios/WeekendExplorer
   xcodegen generate
   open WeekendExplorer.xcodeproj
   ```

2. **Add `GoogleService-Info.plist` from Firebase Console**

   `GoogleService-Info.plist` is **gitignored** — each developer downloads their own copy.

   From [Firebase Console](https://console.firebase.google.com/) → Project **perfect-weekend-planner** → Project settings → Your apps → **Add app** → iOS → bundle ID `com.perfectweekendplanner.explorer` → download `GoogleService-Info.plist` into `WeekendExplorer/Resources/GoogleService-Info.plist`.

   After downloading, also update `Info.plist` `CFBundleURLSchemes` with the `REVERSED_CLIENT_ID` from the downloaded plist (replace `com.googleusercontent.apps.PLACEHOLDER`).

3. **Configure `BACKEND_URL`**

   Default in `Config.xcconfig`:

   ```
   BACKEND_URL = http://127.0.0.1:8000
   ```

   - **Simulator**: `127.0.0.1` works when the backend runs on the same Mac.
   - **Physical device**: set `BACKEND_URL` to your Mac's LAN IP, e.g. `http://192.168.1.42:8000`, and ensure the device is on the same network. Find your IP with `ipconfig getifaddr en0`.

4. **Signing**

   Open the project in Xcode → select the **WeekendExplorer** target → **Signing & Capabilities** → choose your **Team**. `DEVELOPMENT_TEAM` in `Config.xcconfig` is intentionally empty.

5. **Enable Google Calendar API** (same GCP project as Firebase) if you use calendar free/busy.

6. **CORS (backend only)** — The FastAPI backend must allow your device/simulator origin if you hit CORS from a web client; the native iOS app calls the API directly and does not need CORS changes.

## Run tests

```bash
cd ios/WeekendExplorer
xcodegen generate

xcodebuild test \
  -scheme WeekendExplorer \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -quiet
```

Unit tests cover model JSON decoding, discover URL query building, weekend calendar logic, and brand color hex values. UI tests verify launch and sign-in accessibility identifiers (`signInView`, `signInButton`).

## Project layout

| Path | Purpose |
|------|---------|
| `project.yml` | XcodeGen spec (targets, SPM, schemes) |
| `Config.xcconfig` | `BACKEND_URL`, `DEVELOPMENT_TEAM` |
| `WeekendExplorer/App/` | `@main` app entry, Firebase configure |
| `WeekendExplorer/Models/` | `DiscoverResponse`, `PlanResult`, etc. |
| `WeekendExplorer/Services/` | `APIClient`, `CalendarService` |
| `WeekendExplorer/Theme/` | `BrandTheme` colors (`#1a73e8` accent) |
| `WeekendExplorerTests/` | Unit tests |
| `WeekendExplorerUITests/` | UI tests |

## SPM dependencies

- [firebase-ios-sdk](https://github.com/firebase/firebase-ios-sdk) ≥ 11.0.0 — `FirebaseAuth`, `FirebaseFirestore`, `FirebaseCore`
- [GoogleSignIn-iOS](https://github.com/google/GoogleSignIn-iOS) ≥ 8.0.0 — `GoogleSignIn`

`OTHER_LDFLAGS` includes `-ObjC` (required for Firebase static linking).
