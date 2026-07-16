# Baby Zhu-Van Swieten's Slice of Life

## Overview

A family coordination app built for my sister's first baby. Standalone web app deployed to Firebase Hosting. No framework, no build step — static HTML/JS/CSS with Firebase serverless backend.

**Live URL:** https://baby-zhu-van-swieten.web.app  
**Demo mode:** https://baby-zhu-van-swieten.web.app?demo  
**Due date:** September 17, 2026

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/JS/CSS (no framework) |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore (real-time sync via onSnapshot) |
| Storage | Firebase Storage (photo uploads) |
| Hosting | Firebase Hosting (HTTPS, CDN) |
| SDK | Firebase compat v9.23.0 (CDN script tags) |

---

## Architecture

### Data Model

```
families/{familyId}
  ├── name, createdBy, members[], guests[], createdAt
  ├── tracker/{docId}       — feed/diaper/sleep logs
  ├── contacts/{docId}      — village contacts
  ├── scrapbook/{docId}     — photos with captions
  ├── journal/{docId}       — journal entries
  ├── items/{docId}         — inventory + registry items (status: 'have' | 'need')
  ├── growth/{docId}        — weight/length/head measurements
  └── invites/{docId}       — member & guest invite links

users/{uid}
  ├── email, displayName, familyId, role, createdAt
```

### Roles

- **member** — full app access (family members join via invite link)
- **guest** — registry-only view (friends/coworkers claim items)

### File Structure

```
baby-app/
├── index.html              — all screens, modals, tabs
├── css/style.css           — all styles (~1100 lines)
├── js/
│   ├── firebase-config.js  — Firebase project config
│   ├── db.js               — Firestore/Storage wrapper (CRUD, snapshots, uploads)
│   ├── auth.js             — login, register, logout, invites, role routing
│   ├── app.js              — init, tab switching, countdown, daily fact, module orchestration
│   ├── tracker.js          — feed/diaper/sleep logging with timers + summary + doctor prep
│   ├── growth.js           — weight/length/head tracking with deltas
│   ├── village.js          — contacts/support network
│   ├── scrapbook.js        — photo uploads with lightbox viewer
│   ├── journal.js          — date-indexed journal entries
│   ├── inventory.js        — "What I Have" with quantities + low-stock alerts
│   ├── registry.js         — "What I Need" with guest claiming
│   └── demo.js             — demo mode (?demo) with fake data, no auth
├── firebase.json           — hosting + storage rules config
├── storage.rules           — Firebase Storage security rules
├── .firebaserc             — project alias
└── sw.js                   — service worker (PWA-like)
```

---

## Features (7 tabs)

### 1. Home
- Countdown timer to due date (live seconds)
- Daily rotating baby fact (31 facts, changes by date)

### 2. Tracker
- **Start/stop timers** for feeds and sleep (localStorage persistence, survives refresh)
- Manual entry fallback for all types
- **Daily summary** — today's totals (feeds, diapers wet/dirty, naps + total sleep)
- **Doctor Prep** — 7-day averages modal (feeds/day, avg interval, diapers/day, sleep hours, longest stretch) with copy-to-clipboard
- History log grouped by date with delete

### 3. Village
- Contacts with roles: Pediatrician, OB/GYN, Lactation Consultant, Doula, Midwife, Postpartum Therapist, Aunty, Grandma, Grandpa, Family, Friend, Emergency, Other
- Custom role text input when "Other" is selected
- Tap-to-call phone numbers

### 4. Scrapbook
- 3-column photo wall grid
- Photo upload to Firebase Storage
- Lightbox viewer with prev/next navigation and counter
- Captions and dates

### 5. Journal
- Date-indexed entries
- List view with date + teaser (first 60 chars)
- Full entry view on tap

### 6. Stuff (Inventory)
- Items with status: 'have'
- Quantity tracking with +/- modal
- Low-stock threshold with visual alert badge
- Manual "Need More" flag
- Categories

### 7. Registry
- Items with status: 'need'
- Shopping links (external URLs)
- **Guest invite system** — generate link, guest registers, sees registry only
- **Claiming** — guest claims item, others see "Someone's getting this" (anonymous), family sees "Claimed by [name]"
- Unclaim option for the claimer

---

## Growth Tracking

- Separate section on Tracker tab
- Log: date, weight (lb), length (in), head circumference (in), notes
- Shows change deltas from previous measurement (+0.5 lb, +0.2 in)
- Stored in `growth` Firestore subcollection

---

## Auth & Security

- Email/password authentication
- Family membership via invite links (expire after 30 days)
- Guest role with limited access (registry only)
- Firebase Storage rules: authenticated users in family can read/write
- Firestore offline persistence (works without signal)
- Module init wrapped in try/catch (one broken feature doesn't crash the app)
- Snapshot error callbacks prevent silent listener death

---

## Demo Mode

Activated by `?demo` query parameter. Bypasses Firebase entirely — loads hardcoded realistic data across all tabs. Used for interview presentations. No personal data exposed.

---

## Deployment

```bash
firebase deploy --only hosting          # just the web app
firebase deploy --only hosting,storage  # app + storage rules
```

After deploy, users should Cmd+Shift+R (hard refresh) to bypass browser cache.

---

## Firebase Project

- **Project ID:** baby-zhu-van-swieten
- **Console:** https://console.firebase.google.com/project/baby-zhu-van-swieten
- **Plan:** Blaze (pay-as-you-go, stays within free tier for family use)

---

## Design Decisions

| Decision | Reasoning |
|----------|-----------|
| No framework | Small family app, no complex state, CDN scripts = zero build step |
| Single HTML file | All screens/modals in one file, tab switching via JS class toggles |
| Firebase compat SDK | Simpler than modular SDK for script-tag loading |
| localStorage for timers | Timer state needs to survive refresh but doesn't need cross-device sync |
| Separate inventory/registry tabs | User feedback — "stuff I have" vs "stuff I need" are different mental models |
| 7 tabs with tight nav padding | Each feature has distinct purpose; padding reduced to 6px for fit |
| Role-based guest access | Guests shouldn't see tracker/journal/village — only registry |
| Anonymous claiming | Prevents duplicate purchases while preserving gift surprise |

---

## Future Considerations (not built)

- Apple Watch integration (HealthKit requires native iOS app)
- Push notifications / reminders ("3 hours since last feed")
- WHO percentile charts for growth tracking
- Pediatrician data export (PDF or structured format)
- Dark mode

---

## Built With

AI-assisted development using Claude Code. Conversational workflow: describe features in plain language → discuss trade-offs → implement → test → iterate. Human directed architecture, UX priorities, and feature scoping. AI accelerated boilerplate, patterns, and iterative refinement.
