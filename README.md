<div align="center">

<img src="public/icon-192.png" alt="IVE: Dive Archive App Icon" width="112" height="112" />

# IVE: Dive Archive

**A mobile-first fan archive and music-discovery experience dedicated to IVE — built by a DIVE, for DIVEs.**

[![Download APK](https://img.shields.io/badge/Download_APK-v1.0.0_Android-5ce1b8?style=for-the-badge&logo=android&logoColor=000)](https://github.com/Nadzz677/ive-fan-app/releases/latest)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=fff)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=fff)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=000)](https://firebase.google.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8_Android-119EFF?style=for-the-badge&logo=capacitor&logoColor=fff)](https://capacitorjs.com)

<br />

**[Download Android APK](https://github.com/Nadzz677/ive-fan-app/releases/latest)** · [Features](#-features) · [Tech Stack](#-tech-stack) · [About the Developer](#-about-the-developer) · [Disclaimer](#-copyright--fan-disclaimer)

</div>

---

## Overview

**IVE: Dive Archive** brings IVE's discography, member profiles, era aesthetics, and music discovery together in a sleek Android app. Designed to feel like a dedicated K-pop streaming and fandom companion rather than a generic webpage, it pairs glassmorphism UI and smooth micro-interactions with album-inspired **Living Era Themes**—while syncing live UI, bug-fix, and catalog updates seamlessly without requiring constant APK reinstalls.

> **Project Status:** Currently in pre-release development (`v1.0.0`). Features, catalog entries, and polish are continuously evolving before wider public release.

---

## Android APK Installation & Security

1. Open the **[Latest GitHub Release](https://github.com/Nadzz677/ive-fan-app/releases/latest)** and download **`IVE-Dive-Archive-v1.0.0.apk`**.
2. If prompted by Android, allow installation from trusted browser/file source and install normally.
3. **Verify Integrity (Optional):** Every release includes a `.sha256` checksum file so you can confirm the APK was not modified.
4. **Hardened by Design:** Enforces HTTPS-only transport (no cleartext HTTP), system-trusted TLS certificates only, disabled Android backup extraction, strict WebView origin & file-access isolation, disabled WebView remote debugging, R8/ProGuard shrinking, and v1/v2/v3 APK signature verification.

---

## Features

| Feature                    | Highlights                                                                                                                                                                                                                                                     |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **12 Living Era Themes**   | Switch between the signature midnight-violet palette and **11 album-inspired era themes** powered by OKLCH design tokens with radial theme-transition animations.                                                                                              |
| **Music Player & Lyrics**  | Embedded **YouTube IFrame** playback from official IVE / Starship channels, featuring a persistent mini-player, full-screen expanded player, lock-screen media controls, shuffle/repeat queue, and **Original + Romanized lyrics** (referenced from AZLyrics). |
| **2021–2026 Discography**  | Browse Korean, Japanese, and global releases with rich album artwork, release metadata, tracklists, and quick play actions.                                                                                                                                    |
| **6 Member Dossiers**      | Dedicated profiles for **An Yujin, Gaeul, Rei, Jang Wonyoung, Liz, and Leeseo** with interactive cards and live next-birthday countdowns.                                                                                                                      |
| **Latest News Dispatches** | Curated feed of IVE comebacks, milestones, and updates right from the Home screen.                                                                                                                                                                             |
| **Cloud-Synced Favorites** | Save favorite tracks and playback preferences locally and sync seamlessly via **Firebase Anonymous Authentication**.                                                                                                                                           |
| **Instant Live Updates**   | Content updates via Cloud Firestore and UI/bug-fix deploys sync automatically to installed APKs on launch.                                                                                                                                                     |

---

## Tech Stack

| Layer                 | Technologies                                                                        |
| :-------------------- | :---------------------------------------------------------------------------------- |
| **Frontend**          | React 19, TypeScript, Tailwind CSS v4, Lucide Icons                                 |
| **Routing & Data**    | TanStack Router, TanStack Query                                                     |
| **Backend & Hosting** | Firebase Hosting, Cloud Firestore, Firebase Anonymous Auth                          |
| **Media & Lyrics**    | YouTube IFrame API (Official IVE / Starship embeds), AZLyrics reference             |
| **Mobile**            | Capacitor 8 (`@capacitor/android`, `app`, `haptics`, `splash-screen`, `status-bar`) |

---

## About the Developer

Made with love by **[@Nadzz677](https://github.com/Nadzz677)** — a 19-year-old developer and fellow DIVE who built this archive purely out of passion to help fans and newcomers explore IVE's eras, members, discography, and lyrics in one place.

- **GitHub:** [@Nadzz677](https://github.com/Nadzz677)
- **Contact / Takedown Requests:** `nadzhaa254@gmail.com`

---

## Copyright & Fan Disclaimer

- **Non-Commercial Fan Project:** **IVE: Dive Archive** is an unofficial, non-profit fan project and is **not affiliated with, endorsed by, or sponsored by** IVE, Starship Entertainment, Kakao Entertainment, Columbia Records, or Sony Music Japan.
- **Audio & Lyrics Attribution:** All music playback is streamed via official **YouTube IFrame embeds** from IVE / Starship Entertainment channels (no downloadable audio files are hosted or distributed). Original and Romanized lyrics are referenced from **AZLyrics** for personal fandom enjoyment and educational reference.
- **Support IVE Officially:** Playback in this app does **not** count toward official Korean or global music charts or music-show voting. Please continue supporting IVE on official platforms!
