# Sidequest iOS — Build Plan & Status

Native SwiftUI app for **Sidequest** ("your weekend, verified"), rebuilt from
scratch with Apple's **Liquid Glass** design system (iOS 26), dark-only, matching
the web app's purple/teal identity and talking to the existing FastAPI backend.

> This document is the living plan. Status is updated as work lands.

## Locked decisions

| Decision | Choice |
|----------|--------|
| Codebase | **Fresh build** — the old `ios/WeekendExplorer` app was removed |
| Glass | **Option A — native Liquid Glass** (`glassEffect`, glass buttons), iOS **26** min |
| Name | **Sidequest** — new target/scheme/bundle `com.perfectweekendplanner.sidequest` |
| Appearance | **Dark mode only** (`UIUserInterfaceStyle = Dark`, `.preferredColorScheme(.dark)`) |
| Mode | **Live-ready** (Firebase Auth + Firestore + FastAPI) with automatic **demo mode** fallback |
| Language | Swift 5.10 language mode on the iOS 26 SDK (Liquid Glass is an SDK feature) |

## Environment constraints (important)

The build agent runs on **Linux with no Xcode/Swift toolchain**, and the Firebase
CLI here is **not authenticated**. Consequences:

- All Swift / XcodeGen code is written and self-reviewed for consistency, but the
  **final `xcodegen generate` + `xcodebuild` / simulator run must happen on macOS**
  (Xcode 26). It has **not** been compiler-verified in this environment.
- **Live Firebase** requires a real `GoogleService-Info.plist`. A committed
  **placeholder** keeps the project buildable and forces **demo mode**; the app
  goes live automatically once the real plist is dropped in (see below).

## Architecture

```
ios/Sidequest/
  project.yml            # XcodeGen spec (iOS 26, SPM: Firebase + GoogleSignIn)
  Config.xcconfig        # BACKEND_URL, DEVELOPMENT_TEAM
  Sidequest/
    App/                 # @main entry, Firebase configure, root routing
    DesignSystem/        # Theme tokens + Liquid Glass primitives/button styles
    Components/          # BrandLogo, FlowLayout, badges, glow bg, spinner, confetti, haptics, user menu
    Features/
      SignIn/            # Google sign-in (glass CTA, glow orbs)
      Onboarding/        # Multi-step: city → budget → diet → activities → access → celebrate
      Explorer/          # Map-first: MapKit + glass bottom tray of event cards
      EventDetail/       # Hero + rule badges + "Plan this weekend"
      Plan/              # Glass itinerary sheet + Prometheux stats + cited path
      Common/            # LoadingView
    Services/            # AppConfig, APIClient, AuthService, ProfileService, CalendarService, DemoData
    Models/              # Codable models matching the FastAPI contract (snake_case)
    ViewModels/          # ExplorerViewModel (auth/profile/calendar/discover/plan)
    Resources/           # Info.plist, GoogleService-Info.plist (placeholder), Assets (app icon, colors)
  SidequestTests/        # Models, API URL building, calendar math, theme tokens
  SidequestUITests/      # Launch + sign-in + demo → explorer
```

### Design system (dark-only, web-matched)

- Colors: background `#0A0A0A`, surface `#141416`, border `#27272A`; **purple `#818CF8`**
  (primary/tint), **teal `#2DD4BF`** (verified), **coral `#FB7185`** (error), **amber `#FBBF24`**.
- Glass primitives: `sqGlassCard`, `sqGlassPill`, `sqGlassCircle` (native `glassEffect`
  with brand tint + hairline stroke), plus `SQPrimaryButtonStyle` / `SQGlassButtonStyle`.
- Type: SF Pro with tight tracking (Geist-like). Radii: cards 16, sheets 28, pills capsule.

### Backend contract (unchanged; models validated against `backend/models.py`)

- `GET /discover?location&budget&diet&activities&accessibility&calendar_slots` → `DiscoverResponse`.
- `POST /plan` (`PlanRequest`) → `PlanResult`.
- Auth: `Authorization: Bearer <Firebase ID token>`; 401 → refresh + retry.
- Relative `image_url` values resolved against the backend asset origin.

## Going live (Firebase)

The project is **live-ready**. To activate real auth + Firestore:

```bash
# Authenticated Firebase CLI (token / service account) required:
firebase apps:create IOS "Sidequest" --project perfect-weekend-planner \
  --bundle-id com.perfectweekendplanner.sidequest
firebase apps:sdkconfig IOS <APP_ID> --project perfect-weekend-planner \
  > ios/Sidequest/Sidequest/Resources/GoogleService-Info.plist
```

Then set `Info.plist` → `CFBundleURLSchemes` to the plist's `REVERSED_CLIENT_ID`,
point `BACKEND_URL` (in `Config.xcconfig`) at the running FastAPI / App Hosting proxy,
and rebuild. `AppConfig.isFirebaseConfigured` flips to `true` automatically and the app
uses live Google Sign-In, Firestore profiles, and authenticated API calls.

Until then the app runs in **demo mode**: mock sign-in, local profile, and seeded
events/itineraries (`DemoData`) — fully navigable with zero secrets.

## Build & test (macOS)

```bash
cd ios/Sidequest
brew install xcodegen
xcodegen generate
xcodebuild test -scheme Sidequest \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
```

## Status checklist

- [x] Remove legacy `ios/WeekendExplorer`
- [x] XcodeGen project (iOS 26, dark-only, Sidequest bundle) + generated app icon
- [x] Design system + Liquid Glass primitives
- [x] Models matching backend contract
- [x] Services (config, API client, auth, profile, calendar, demo data)
- [x] Shared components (logo, flow layout, badges, glow, spinner, confetti, haptics)
- [x] ExplorerViewModel orchestration
- [x] Screens: SignIn, Onboarding, Explorer (map + glass tray), EventDetail, PlanResults, Loading
- [x] Unit tests (models, API URL, calendar, theme) + UI test scaffold
- [ ] **Compile / simulator run on macOS** (blocked: no Xcode on this Linux VM)
- [ ] **Live Firebase provisioning** (blocked: Firebase CLI not authenticated here)

## Known follow-ups (need macOS / secrets)

1. Compiler pass on Xcode 26 — resolve any Liquid Glass API signature drift.
2. Provision the real `GoogleService-Info.plist` and OAuth URL scheme.
3. Optional: device-location (`CLLocationManager`) to auto-center the map.
4. Optional: bundle the Geist font for pixel-exact web parity.
