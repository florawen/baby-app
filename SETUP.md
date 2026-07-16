# Baby Zhu's Slice of Life — Setup Guide

Everything lives in Firebase (free). One account, one dashboard, done.

---

## Step 1: Create Your Firebase Project (~5 minutes)

1. Go to https://console.firebase.google.com
2. Sign in with any Google account
3. Click **"Create a project"**
   - Name it: `baby-zhu` (or whatever you like)
   - Disable Google Analytics when asked (not needed)
   - Click **Create project**

---

## Step 2: Enable Authentication

1. In the left sidebar, click **Build > Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, click **Email/Password**
4. Toggle **Enable** → Save
5. That's it! Users will register and log in with email + password.

---

## Step 3: Enable the Database

1. In the left sidebar, click **Build > Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → Next
4. Pick the region closest to most of your family:
   - US family → `us-central1`
   - Mixed/international → `us-central1` is fine
5. Click **Enable**

---

## Step 4: Enable Photo Storage

1. In the left sidebar, click **Build > Storage**
2. Click **"Get started"**
3. Choose **"Start in test mode"** → Next
4. Same region as above → **Done**

---

## Step 5: Get Your Config Keys

1. Click the **gear icon** (top-left) → **Project settings**
2. Scroll down to **"Your apps"**
3. Click the **web icon** (`</>`)
4. Enter any name (e.g., `baby-zhu-web`) → **Register app**
5. You'll see a code block with `firebaseConfig`. Copy these values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
6. Open `js/firebase-config.js` on your computer and replace the placeholders:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "baby-zhu.firebaseapp.com",
    projectId: "baby-zhu",
    storageBucket: "baby-zhu.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

---

## Step 6: Deploy Your App (~3 minutes)

You'll use the Firebase CLI to upload the app. One-time setup:

### Install Firebase CLI

Open Terminal on your Mac and paste:

```
npm install -g firebase-tools
```

(If you don't have npm, install Node.js first from https://nodejs.org)

### Login & Deploy

Run these commands in Terminal one at a time:

```
cd ~/baby-app
firebase login
firebase init hosting
```

When prompted during `firebase init hosting`:
- **What do you want to use as your public directory?** → type `.` (just a dot)
- **Configure as a single-page app?** → `No`
- **Set up automatic builds with GitHub?** → `No`
- **Overwrite index.html?** → `No`

Then deploy:

```
firebase deploy --only hosting
```

Done! Firebase gives you a URL like:
`https://baby-zhu.web.app`

Your app is now live. Share that URL with your family.

---

## Step 7: Connect a Custom Domain (optional, ~10 minutes)

### Buy a domain

Go to https://porkbun.com and search for something cute:
- `babyzhuslife.com` (~$10/year)
- `sliceoflife.baby` (check availability)
- `babyzhu.family`

### Connect to Firebase

1. In Firebase Console → **Hosting** (left sidebar)
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `babyzhuslife.com`)
4. Firebase gives you DNS records to add
5. Go to Porkbun → your domain → **DNS Records**
6. Add the records Firebase told you (usually 2 A records or a TXT + A record)
7. Wait 10-30 minutes for DNS to propagate
8. Firebase auto-provisions HTTPS — you're done

---

## Step 8: Secure Your Database (do this after testing)

Once everything works, lock down the rules so only authenticated family members can access data:

### Firestore Rules

Firebase Console → Firestore → **Rules** tab → paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /families/{familyId} {
      allow read, write: if request.auth != null
        && request.auth.uid in resource.data.members;
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.members;

      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/families/$(familyId)).data.members;
      }
    }
  }
}
```

Click **Publish**.

### Storage Rules

Firebase Console → Storage → **Rules** tab → paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /families/{familyId}/{allPaths=**} {
      allow read, write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

Click **Publish**. (Limits uploads to 10MB per photo. Only authenticated users can read/write.)

---

## You're Done!

### How to use it:
- First person to open the app registers and creates the family
- From Settings, generate an invite link and share it with family
- Each family member registers their own account via the invite link
- Everything syncs in real-time across all devices

### How to update the app later:
If you ever want to change something, just edit the files and run:
```
cd ~/baby-app
firebase deploy --only hosting
```

### Free tier limits (you won't hit these):
| Service | Free Limit | Family usage |
|---------|-----------|-------------|
| Firestore | 50K reads/day | You'd need ~100 users |
| Storage | 5 GB | ~2,500 photos |
| Hosting | 10 GB/month | Unlimited for a family |

### Troubleshooting:
- **Blank screen?** → Check browser console (Cmd+Option+J) for errors
- **Data not syncing?** → Make sure firebase-config.js has your real keys
- **Photos not uploading?** → Check Storage rules are set to test mode
- **Domain not working?** → DNS can take up to 48 hours (usually 30 min)
