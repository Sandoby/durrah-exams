# 📱 Durrah for Tutors - Mobile App

A professional mobile application for tutors to manage their exams, monitor submissions, and track student performance on iOS and Android devices.

## 🎯 Overview

**Durrah for Tutors** is a tutor-only mobile companion to the Durrah Exams platform. It enables educators to:
- Create and manage exams from their mobile device
- Monitor exam submissions in real-time
- View student results and analytics
- Manage question banks
- Get notifications for new submissions

## 📋 Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator
- Physical device with Expo Go app (for testing)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd durrah-tutors-mobile
npm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials from the web app:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run the App

**Start Development Server:**
```bash
npm start
```

**Run on iOS Simulator (Mac only):**
```bash
npm run ios
```

**Run on Android Emulator:**
```bash
npm run android
```

**Run on Physical Device:**
1. Install Expo Go from App Store/Play Store
2. Scan the QR code shown in terminal

## 📁 Project Structure

```
durrah-tutors-mobile/
├── App.tsx                    # Main app entry with navigation
├── src/
│   ├── api/                   # API calls & Supabase client
│   │   ├── supabase.ts
│   │   └── exams.ts
│   ├── screens/               # App screens
│   │   ├── LoginScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── store/                 # State management (Zustand)
│   │   └── auth.store.ts
│   ├── components/            # Reusable components
│   ├── types/                 # TypeScript types
│   │   └── exam.types.ts
│   ├── theme/                 # Design system
│   │   └── colors.ts
│   └── utils/                 # Helper functions
├── assets/                    # Images, fonts, icons
└── .env                       # Environment variables
```

## 🎨 Features

### ✅ Currently Implemented
- ✅ Authentication (Login/Logout)
- ✅ Dashboard with exam overview
- ✅ Exam list with stats
- ✅ Professional UI with Material Design
- ✅ Pull-to-refresh functionality

### 🚧 Coming Soon
- 🔜 Exam detail view
- 🔜 Create/edit exams
- 🔜 View submissions & results
- 🔜 Question bank management
- 🔜 Push notifications
- 🔜 Export results (PDF/Excel)
- 🔜 Analytics dashboard

## 🛠️ Tech Stack

- **Framework:** React Native with Expo SDK
- **Language:** TypeScript
- **Navigation:** React Navigation
- **State Management:** Zustand
- **UI Library:** React Native Paper
- **Backend:** Supabase (PostgreSQL + Auth)
- **Storage:** AsyncStorage

## 📱 Testing

### On iOS
```bash
npm run ios
```

### On Android
```bash
npm run android
```

### On Physical Device
1. Install Expo Go
2. Run `npm start`
3. Scan QR code

## 🔧 Development Commands

```bash
# Start development server
npm start

# Run iOS
npm run ios

# Run Android
npm run android

# Run on web (for testing)
npm run web

# Clear cache and restart
npm start -- --clear

# TypeScript check
npx tsc --noEmit
```

## 📦 Building for Production

### Prerequisites
- EAS Build account (free tier available)
- Apple Developer Account ($99/year for iOS)
- Google Play Developer Account ($25 one-time for Android)

### Build iOS
```bash
eas build --platform ios
```

### Build Android
```bash
eas build --platform android
```

### Submit to App Stores
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## 🔒 Security

- ✅ Supabase Row Level Security (RLS) policies
- ✅ AsyncStorage for secure token storage
- ✅ Auto-refresh authentication tokens
- ✅ Persistent auth sessions

## 🐛 Troubleshooting

### "Metro bundler not starting"
```bash
npm start -- --clear
```

### "Module not found" errors
```bash
rm -rf node_modules
npm install
```

### iOS build issues
```bash
cd ios
pod install
cd ..
npm run ios
```

### Android build issues
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## 📄 Environment Variables

Required variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |

## 🤝 Contributing

This is a companion mobile app for the Durrah Exams platform. Changes should align with the web platform features.

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Contact: support@durrahexams.com

## 📈 Roadmap

**Phase 1 (Current):**
- ✅ Basic authentication
- ✅ Dashboard & exam list
- 🔜 Exam details

**Phase 2 (Next 2 weeks):**
- 🔜 Create/edit exams
- 🔜 View submissions
- 🔜 Question bank

**Phase 3 (Future):**
- 🔜 Push notifications
- 🔜 Analytics
- 🔜 Offline support

## 📝 License

Same as Durrah Exams web platform.

---

**Made for tutors, by educators** 📚
