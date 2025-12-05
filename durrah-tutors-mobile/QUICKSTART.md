# 🚀 Quick Start Guide - Durrah for Tutors Mobile

## ⚡ 5-Minute Setup

### Step 1: Navigate to Mobile Directory
```bash
cd durrah-tutors-mobile
```

### Step 2: Install Dependencies (Already done! ✅)
```bash
# Dependencies are already installed
# If needed, run: npm install
```

### Step 3: Configure Environment
Create a `.env` file:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` and add your Supabase credentials from `../frontend/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Start the App
```bash
npm start
```

You'll see a QR code in the terminal.

### Step 5: Test on Device

**Option A: Physical Device (Easiest)**
1. Install **Expo Go** from App Store/Play Store
2. Scan the QR code from terminal
3. App loads on your device!

**Option B: iOS Simulator (Mac only)**
```bash
npm run ios
```

**Option C: Android Emulator**
```bash
npm run android
```

## 📱 Testing the App

### Login Credentials
Use any existing tutor account from the web platform:
- Email: your_tutor_email@example.com
- Password: your_password

### What Works Now
- ✅ Login authentication
- ✅ Dashboard with exam statistics
- ✅ Exam list view
- ✅ Pull to refresh
- ✅ Logout

### Coming Soon
- 🔜 Exam details
- 🔜 Create/edit exams
- 🔜 View submissions
- 🔜 Question bank management

## 🔧 Common Commands

```bash
# Start development server
npm start

# Clear cache if issues
npm start -- --clear

# Run on iOS
npm run ios

# Run on Android
npm run android

# Check TypeScript
npx tsc --noEmit
```

## 🐛 Troubleshooting

**Problem: "Can't find Supabase credentials"**
- Make sure `.env` file exists with correct values
- Restart expo: `npm start -- --clear`

**Problem: "Network error"**
- Check your Supabase URL and key
- Ensure internet connection

**Problem: "Metro bundler not starting"**
```bash
npm start -- --clear
```

## 📦 Project Structure

```
durrah-tutors-mobile/
├── App.tsx                    # Main entry with navigation
├── src/
│   ├── api/                   # Supabase & API calls
│   ├── screens/               # Login, Dashboard, etc.
│   ├── store/                 # State management
│   ├── components/            # Reusable UI components
│   ├── types/                 # TypeScript types
│   └── theme/                 # Colors & styling
└── .env                       # Your environment variables
```

## 🎯 Next Steps

1. **Test Login**: Use existing tutor credentials
2. **View Dashboard**: See your exams from web platform
3. **Pull to Refresh**: Try the refresh gesture
4. **Ready to Build**: Follow README.md for features

## 📚 Full Documentation

See `README.md` for complete documentation including:
- Building for production
- Publishing to App Store/Play Store
- Full feature list
- Troubleshooting guide

---

**Ready to go!** 🎉 Run `npm start` and scan the QR code.
