# Couples Vibe Widget — Complete Project Context & Architecture Guide

> **Purpose**: This document provides end-to-end context, technical architecture, database schemas, and codebase patterns for any AI or engineer continuing development on this project.

---

## 1. Executive Summary & Concept

**Couples Vibe** is a real-time ambient presence application and Android Home Screen widget designed for couples. 
- It allows two paired partners to share their current emotional/physical "vibe" (e.g., *Loved*, *Happy*, *Sleepy*, *Peaceful*, *Chill*).
- **Primary UX Goal**: Zero friction. Users can glance at their home screen to see their partner's live vibe in real time and send their own vibe with a **single tap directly on the widget** without opening the main app.
- **Strict Single-Vibe Rule**: Only **one** vibe can be active at a time (no multi-selection or stacking). Tapping a new vibe immediately replaces the previous one.
- **100% Emoji Consistency**: Emojis displayed on the widget buttons, widget display cards, bottom sheets, and app screens are derived from a unified master catalog (`VibeCatalog`).

---

## 2. Tech Stack

### Android Client (Primary Core)
- **Language**: Kotlin
- **UI Framework**: Jetpack Compose (Material 3)
- **Home Screen Widget**: Jetpack Glance (`androidx.glance:glance-appwidget:1.1.0`)
- **Widget State Management**: Jetpack Glance DataStore (`androidx.glance:glance-appwidget-testing`, `androidx.datastore:datastore-preferences:1.1.1`)
- **Concurrency**: Kotlin Coroutines (`viewModelScope`, IO scope, StateFlow)
- **Architecture**: MVVM + Repository Pattern
- **Background Execution**: Lightweight, zero background services. Zero continuous CPU or battery usage.
- **Build System**: Gradle 8.x with Kotlin DSL (`build.gradle.kts`), Android SDK 34 (Target), SDK 26 (Min)

### Backend & Realtime Infrastructure
- **Provider**: Google Firebase
- **Database**: Firebase Realtime Database (WebSocket-based zero-latency pub/sub)
- **Database URL**: `https://couples-vibe-default-rtdb.europe-west1.firebasedatabase.app`
- **Authentication**: Firebase Anonymous Authentication (frictionless onboarding, no password required)
- **Security**: Custom Firebase Realtime Database Security Rules (`database.rules.json`)

### Web Prototype (Companion)
- **Framework**: React 18, TypeScript, Vite, Tailwind CSS (in `src/`, `server.ts`)

---

## 3. Core Architecture & Mechanisms

### A. Zero-Overhead Widget Sync (No Background Services)
- **Zero Background Processing**: No persistent foreground service or background polling runs when idle, keeping CPU and battery consumption at 0%.
- **Direct Widget Actions**: Tapping a vibe directly on the widget updates Glance DataStore instantly and dispatches to Firebase.
- **App-Driven Sync**: When the app is open, Firebase real-time listeners keep the app UI and Glance widget synchronized.

### B. In-Widget Direct 1-Tap Action (`SendVibeActionCallback`)
- Tapping any emoji button on the home screen widget executes `SendVibeActionCallback : ActionCallback`.
- **Step 1 (Optimistic Instant UI)**: Immediately writes the selected vibe ID to the local Glance DataStore (`prefs[PREF_MY_VIBES] = vibeId`) and triggers `CoupleWidget().update()`. The widget reflects the new vibe in milliseconds.
- **Step 2 (Network Dispatch)**: Invokes `VibeRepository.sendUserVibes(coupleId, listOf(vibeId))` asynchronously on `Dispatchers.IO` to sync to Firebase.

### C. Master Vibe Catalog (`VibeCatalog.kt`)
There are **17 predefined vibes** divided into 4 categories. The emojis and labels are identical across the entire app and widget:

| Category | ID | Emoji | Label |
| :--- | :--- | :---: | :--- |
| **Affection** | `loved` | ❤️ | Loved |
| | `cuddle` | 🥰 | Cuddle |
| | `kiss` | 😘 | Kiss |
| | `miss_you` | 🥺 | Miss You |
| | `need_hug` | 🫂 | Need Hug |
| **Energy** | `excited` | 🔥 | Excited |
| | `happy` | 😊 | Happy *(Note: Smiling face 😊, NOT sparkles)* |
| | `playful` | 😜 | Playful |
| | `silly` | 🤪 | Silly |
| **Rest** | `sleepy` | 😴 | Sleepy |
| | `peaceful` | ☁️ | Peaceful |
| | `tired` | 🥱 | Tired |
| | `chill` | ☕ | Chill *(Note: Coffee ☕, NOT teacup)* |
| **Day** | `busy` | 💻 | Busy |
| | `focused` | 🎯 | Focused |
| | `hungry` | 🍕 | Hungry |
| | `thinking_of_you` | 💭 | Thinking of You |

---

## 4. Firebase Realtime Database Schema

```json
{
  "couples": {
    "<coupleId>": {
      "id": "<coupleId>",
      "createdAt": 1726650000000,
      "members": {
        "<uid_1>": true,
        "<uid_2>": true
      },
      "membersData": {
        "<uid_1>": { "displayName": "Alex", "updatedAt": 1726650000000 },
        "<uid_2>": { "displayName": "Eya", "updatedAt": 1726650000000 }
      },
      "currentVibes": {
        "<uid_1>": {
          "vibes": ["peaceful"],
          "updatedAt": 1726651200000
        },
        "<uid_2>": {
          "vibes": ["kiss"],
          "updatedAt": 1726651300000
        }
      }
    }
  },
  "pairingCodes": {
    "<6_digit_code>": {
      "code": "849201",
      "createdBy": "<uid_1>",
      "coupleId": "<coupleId>",
      "createdAt": 1726650000000,
      "expiresAt": 1726736400000,
      "used": false,
      "usedBy": "<uid_2_or_null>"
    }
  },
  "users": {
    "<uid>": {
      "coupleId": "<coupleId>",
      "displayName": "Alex",
      "updatedAt": 1726650000000
    }
  }
}
```

### Firebase Security Rules (`database.rules.json`)
The database rules enforce:
1. `pairingCodes`: Authenticated users can query and claim unused pairing codes.
2. `couples`: Members can read/write their couple data. Non-members can append themselves when claiming a valid pairing code.
3. `users`: Users have full read/write access to their own user record.

---

## 5. Key File Directory & Architecture Map

```
couples-vibe-widget/
├── android/
│   ├── app/
│   │   ├── google-services.json          # Firebase real credentials & project config
│   │   ├── build.gradle.kts              # Dependencies: Glance, DataStore, Firebase, Compose
│   │   └── src/main/
│   │       ├── AndroidManifest.xml       # Foreground Service, BootReceiver, Glance Widget Provider
│   │       └── java/com/couples/vibe/
│   │           ├── CouplesVibeApp.kt     # Application class; initializes Firebase & persistence
│   │           ├── MainActivity.kt       # Activity host, requests notification perms, starts sync service
│   │           ├── data/
│   │           │   ├── VibeRepository.kt # Firebase RTDB operations (auth, pairing, vibe dispatch)
│   │           │   └── model/
│   │           │       └── Models.kt     # Data classes + VibeCatalog object (17 vibes master list)
│   │           ├── service/
│   │           │   ├── VibeForegroundService.kt # 24/7 Firebase socket listener + Glance updater
│   │           │   └── BootReceiver.kt   # Restarts sync service upon device reboot
│   │           ├── widget/
│   │           │   ├── CoupleWidget.kt   # GlanceAppWidget: minimal UI, big displayed emojis, 17 buttons
│   │           │   └── CoupleWidgetReceiver.kt # GlanceAppWidgetReceiver entry point
│   │           └── ui/
│   │               ├── screens/
│   │               │   ├── HomeScreen.kt             # Main app screen (shows you & partner, single vibe)
│   │               │   ├── VibeSelectorBottomSheet.kt# Bottom sheet for picking 1 vibe
│   │               │   ├── PairingScreen.kt          # Enter/Share 6-digit code
│   │               │   └── NameSetupDialog.kt        # One-time prompt for custom user display name
│   │               ├── viewmodel/
│   │               │   └── HomeViewModel.kt          # StateFlow UI state orchestrator
│   │               └── theme/
│   │                   ├── Color.kt                  # Rose500, Stone900, Stone800 palette
│   │                   └── Theme.kt                  # Dark/Light Material 3 themes
├── src/
│   └── data/
│       └── vibes.ts                      # Web TS mirror of VibeCatalog
├── database.rules.json                   # Firebase Realtime Database Security Rules
└── PROJECT_CONTEXT.md                    # This master context file
```

---

## 6. Widget UI Design Details (`CoupleWidget.kt`)

The widget is optimized for standard 4x2 launcher slots and styled with a dark, sleek aesthetic:
1. **Header Card (`Stone800` rounded card)**:
   - **YOU**: Shows "YOU", current emoji at **`34.sp`**, and label at **`11.sp` bold**.
   - **Divider**: Centered `❤️`.
   - **PARTNER**: Shows partner's name in **`Rose500` bold**, partner's emoji at **`34.sp`**, and partner's label.
2. **Action Prompt**:
   - Small, centered uppercase title: `TAP TO SEND INSTANTLY`.
3. **17-Vibe Compact Palette**:
   - Arranged in 3 compact rows:
     - **Row 1 (6 items)**: `loved` (❤️), `cuddle` (🥰), `kiss` (😘), `miss_you` (🥺), `need_hug` (🫂), `excited` (🔥)
     - **Row 2 (6 items)**: `happy` (😊), `playful` (😜), `silly` (🤪), `sleepy` (😴), `peaceful` (☁️), `tired` (🥱)
     - **Row 3 (5 items)**: `chill` (☕), `busy` (💻), `focused` (🎯), `hungry` (🍕), `thinking_of_you` (💭)
   - **Active State**: The currently selected vibe button is highlighted in solid `Rose500`. Unselected buttons have a translucent dark rose tint (`Color(0x33F43F5E)`).

---

## 7. How to Build & Run

### Building the Android APK
From the `android/` directory:
```powershell
# Windows PowerShell
java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleDebug
```
- **Generated APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

### Installing to Connected Device / Emulator
```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 8. Critical Gotchas & Developer Notes

1. **Glance Button Text & Padding**:
   - Glance `Button` wraps Android RemoteViews `Button`. Android buttons have default minimum sizes. Keep button heights around `28.dp`–`30.dp` with `GlanceModifier.defaultWeight()` to prevent row overflow on smaller screens.
2. **Glance State Persistence**:
   - Always call `updateAppWidgetState(context, glanceId) { prefs -> ... }` followed by `CoupleWidget().update(context, glanceId)`. Glance does NOT automatically redraw without the explicit `.update()` call.
3. **Android 14 Foreground Service Types**:
   - Android 14 (API 34) requires explicit service types. `VibeForegroundService` uses `android:foregroundServiceType="dataSync"`.
   - Requires permissions in manifest: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS`.
4. **Happy Emoji**:
   - Always keep `happy` mapped to `😊` across all files. Do not change it back to sparkles (`✨`).
