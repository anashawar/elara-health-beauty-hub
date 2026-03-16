# Seasonal App Icons & Splash Screens — Native Setup Guide

## Pre-bundled Assets

### Icons (1024×1024)
- `icon-ramadan.png` — Ramadan (crescent moon & stars)
- `icon-eid.png` — Eid (geometric patterns)  
- `icon-newroz.png` — Newroz (spring flowers & fire)
- `icon-newyear.png` — New Year (fireworks & confetti)

### Splash Screens (1080×1920)
Located in `public/splash/`:
- `splash-ramadan.png`
- `splash-eid.png`
- `splash-newroz.png`
- `splash-newyear.png`

---

## iOS Setup (Xcode)

### Alternate Icons
1. Open `ios/App/App/Info.plist`
2. Add the following under the root `<dict>`:

```xml
<key>CFBundleIcons</key>
<dict>
  <key>CFBundlePrimaryIcon</key>
  <dict>
    <key>CFBundleIconFiles</key>
    <array>
      <string>AppIcon</string>
    </array>
  </dict>
  <key>CFBundleAlternateIcons</key>
  <dict>
    <key>icon-ramadan</key>
    <dict>
      <key>CFBundleIconFiles</key>
      <array>
        <string>icon-ramadan</string>
      </array>
    </dict>
    <key>icon-eid</key>
    <dict>
      <key>CFBundleIconFiles</key>
      <array>
        <string>icon-eid</string>
      </array>
    </dict>
    <key>icon-newroz</key>
    <dict>
      <key>CFBundleIconFiles</key>
      <array>
        <string>icon-newroz</string>
      </array>
    </dict>
    <key>icon-newyear</key>
    <dict>
      <key>CFBundleIconFiles</key>
      <array>
        <string>icon-newyear</string>
      </array>
    </dict>
  </dict>
</dict>
```

3. Copy the icon PNG files into `ios/App/App/` directory
4. Each icon needs @2x (120×120) and @3x (180×180) versions

### Splash Screens
Copy splash PNGs into the iOS asset catalog or use Capacitor splash screen plugin config.

---

## Android Setup

### Alternate Icons (Activity Aliases)
1. Open `android/app/src/main/AndroidManifest.xml`
2. Add activity-alias entries for each alternate icon:

```xml
<activity-alias
  android:name=".MainActivityRamadan"
  android:enabled="false"
  android:icon="@mipmap/icon_ramadan"
  android:roundIcon="@mipmap/icon_ramadan_round"
  android:targetActivity=".MainActivity">
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>
</activity-alias>
<!-- Repeat for eid, newroz, newyear -->
```

3. Place icon files in `android/app/src/main/res/mipmap-*` directories

### Splash Screens
Place splash PNGs in `android/app/src/main/res/drawable/` and reference via capacitor config.

---

## Capacitor Plugin

Install: `npm install @niceplugins/capacitor-alternate-icons`

The `useAppIcon` hook in `src/hooks/useAppIcon.ts` handles the switching logic.

---

## Switching Icons from Admin

The admin can trigger icon switches remotely by updating a database field. 
The app checks the active occasion on launch and auto-switches if configured.
