# Firebase Setup Instructions

## ✅ Completed Steps

### 1. Firebase Project Created
- **Project Name**: fireside-archive
- **Project ID**: fireside-archive
- **Project Number**: 51330486826
- **Storage Bucket**: fireside-archive.firebasestorage.app
- **Firestore Database**: fs406 (default)

### 2. Firebase CLI Installed
```bash
npm install -g firebase-tools
firebase login  # Already logged in as ntjson@gmail.com
```

### 3. Firestore Rules Deployed
Security rules have been deployed with role-based access:
- **Public read** for most content
- **Admin/SuperAdmin write** for content management
- **User-owned** outlines with privacy controls

## 🔧 Next Steps

### 1. Get Your Firebase API Credentials

Visit the [Firebase Console](https://console.firebase.google.com/project/fireside-archive/settings/general) and:

1. Click on "Project settings" (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" → Select Web (</>) icon
4. Register app with nickname: "Fireside Archive Web"
5. Copy the configuration values

You'll get something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fireside-archive.firebaseapp.com",
  projectId: "fireside-archive",
  storageBucket: "fireside-archive.firebasestorage.app",
  messagingSenderId: "51330486826",
  appId: "1:51330486826:web:..."
};
```

### 2. Update .env.local

Replace `YOUR_API_KEY_HERE` and `YOUR_APP_ID_HERE` in `.env.local` with the values from step 1:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...  # Replace with your actual API key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fireside-archive.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fireside-archive
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fireside-archive.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=51330486826
NEXT_PUBLIC_FIREBASE_APP_ID=1:51330486826:web:...  # Replace with your actual App ID
```

### 3. Enable Authentication

In [Firebase Console](https://console.firebase.google.com/project/fireside-archive/authentication/providers):

1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click "Save"

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Seed the Database

1. **Create an Admin User First**:
   - Go to `/signup` and create an account
   - In Firebase Console → Firestore Database
   - Find the `user` collection → your user document
   - Edit the `role` field and change it to `"Admin"`

2. **Run the Seed Script**:
   - Navigate to `/admin/seed`
   - Click "Run Seed Script"
   - Check the browser console for progress

This will create:
- 2 Fireside Families
- 2 Firesides
- 5 Snippets
- 1 Deepening

## 📋 Verification Checklist

- [ ] Firebase web app created and credentials copied
- [ ] `.env.local` updated with API key and App ID
- [ ] Email/Password authentication enabled
- [ ] Application runs without errors
- [ ] Can sign up as a new user
- [ ] User role changed to "Admin" in Firestore
- [ ] Seed script runs successfully
- [ ] Data visible in Firestore console

## 🔍 Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure you've created a web app in Firebase Console
- Verify `.env.local` has the correct `NEXT_PUBLIC_FIREBASE_API_KEY`

### "Missing or insufficient permissions"
- Run: `firebase deploy --only firestore:rules --project fireside-archive`
- Verify rules in Firebase Console → Firestore Database → Rules

### Seed script fails
- Check browser console for detailed errors
- Verify you're logged in with an Admin role
- Make sure Firestore database is created (check Firebase Console)

## 📚 Useful Commands

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules --project fireside-archive

# Start Firebase emulators (local testing)
firebase emulators:start

# View Firebase projects
firebase projects:list

# Switch between projects
firebase use fireside-archive
```

## 🔗 Resources

- [Firebase Console](https://console.firebase.google.com/project/fireside-archive)
- [Firestore Database](https://console.firebase.google.com/project/fireside-archive/firestore)
- [Authentication](https://console.firebase.google.com/project/fireside-archive/authentication)
- [Storage](https://console.firebase.google.com/project/fireside-archive/storage)
