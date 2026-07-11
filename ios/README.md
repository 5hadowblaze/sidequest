# Sidequest — iOS

Native SwiftUI app for **Sidequest** — *your weekend, verified*. Rebuilt from
scratch on Apple's **Liquid Glass** design system (iOS 26), **dark mode only**,
matching the web app's purple/teal identity. It talks to the FastAPI backend
(`/discover`, `/plan`), uses Firebase Auth + Firestore, and reads the device
calendar for free weekend slots.

See [`IOS_APP_PLAN.md`](IOS_APP_PLAN.md) for the full build plan and status.

## Prerequisites

- macOS with **Xcode 26** (iOS 26 SDK) — required for Liquid Glass APIs
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`
- (Live mode) Firebase project `perfect-weekend-planner` with an iOS app registered
- FastAPI backend running (see repo root `README.md`)

## Setup

```bash
cd ios/Sidequest
xcodegen generate
open Sidequest.xcodeproj
```

The project builds and runs immediately in **demo mode** (seeded events, mock
sign-in) — no Firebase or backend required.

### Go live

1. Register an iOS app in Firebase and download the real config:

   ```bash
   firebase apps:create IOS "Sidequest" --project perfect-weekend-planner \
     --bundle-id com.perfectweekendplanner.sidequest
   firebase apps:sdkconfig IOS <APP_ID> --project perfect-weekend-planner \
     > Sidequest/Resources/GoogleService-Info.plist
   ```

   `GoogleService-Info.plist` is gitignored — each developer supplies their own.
   The committed placeholder just keeps the project buildable in demo mode.

2. Set `Info.plist` → `CFBundleURLSchemes` to the plist's `REVERSED_CLIENT_ID`.
3. Point `BACKEND_URL` in `Config.xcconfig` at your backend:
   - Simulator / same Mac: `http://127.0.0.1:8000`
   - Physical device: your Mac's LAN IP, e.g. `http://192.168.1.42:8000`
   - Production: `https://weekend-explorer--perfect-weekend-planner.us-central1.hosted.app/api`
4. Xcode → target **Sidequest** → Signing & Capabilities → select your Team.

The app auto-detects the real plist and switches to live auth + API.

## Run tests

```bash
cd ios/Sidequest
xcodegen generate
xcodebuild test -scheme Sidequest \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

Unit tests cover model JSON decoding, discover URL building, weekend calendar
logic, and brand color tokens. UI tests verify launch, the sign-in screen, and
the demo sign-in → explorer path.

## Project layout

| Path | Purpose |
|------|---------|
| `project.yml` | XcodeGen spec (iOS 26, SPM: Firebase + GoogleSignIn) |
| `Config.xcconfig` | `BACKEND_URL`, `DEVELOPMENT_TEAM` |
| `Sidequest/App/` | `@main` entry, Firebase configure, routing |
| `Sidequest/DesignSystem/` | Theme tokens + Liquid Glass primitives |
| `Sidequest/Components/` | Reusable UI (logo, badges, glow, spinner, confetti) |
| `Sidequest/Features/` | SignIn, Onboarding, Explorer, EventDetail, Plan |
| `Sidequest/Services/` | API client, auth, profile, calendar, demo data |
| `Sidequest/Models/` | Codable models matching the FastAPI contract |
| `Sidequest/ViewModels/` | `ExplorerViewModel` |
| `SidequestTests/`, `SidequestUITests/` | Tests |

## SPM dependencies

- [firebase-ios-sdk](https://github.com/firebase/firebase-ios-sdk) ≥ 11.0 — `FirebaseAuth`, `FirebaseFirestore`, `FirebaseCore`
- [GoogleSignIn-iOS](https://github.com/google/GoogleSignIn-iOS) ≥ 8.0 — `GoogleSignIn`

`OTHER_LDFLAGS` includes `-ObjC` (required for Firebase static linking).
