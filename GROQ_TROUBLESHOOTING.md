# 🔧 Troubleshooting Guide - Groq API Errors

## ✅ Fixes Applied

The hybrid extraction system now handles these common errors:

### Fixed Issues

1. **400 Bad Request** ✅ 
   - **Cause**: Malformed JSON or invalid characters in request
   - **Fix**: Added text cleaning to remove null bytes and control characters
   - **Impact**: Requests are now properly formatted before sending

2. **Unicode Escape Sequence Error** ✅
   - **Cause**: `'\u0000 cannot be converted to text'`
   - **Fix**: Strip all control characters and null bytes from text
   - **Impact**: Text is sanitized before API calls

3. **Response Parsing Issues** ✅
   - **Cause**: Response might include markdown code blocks
   - **Fix**: Auto-detect and remove markdown wrappers (```json```)
   - **Impact**: AI responses are correctly parsed

4. **Better Error Messages** ✅
   - **Cause**: Generic error messages didn't help debugging
   - **Fix**: Added specific messages for HTTP 401, 429, 400 errors
   - **Impact**: Console logs now show exactly what went wrong

---

## 🔍 Current Error Handling

### API Response Flow

```
User uploads file
         ↓
Text extraction
         ↓
Clean text (remove null bytes, control chars)
         ↓
Send to Groq API
         ↓
     Response?
    /    |    \
  401   429   400   200
  /      |     \     \
Invalid  Rate  Bad   OK
Key      Limit Request │
|         |      |     │
└─────────┴──────┴─────┘
         │
    Parse response text
         │
     Is JSON?
    /         \
  YES        NO
  │           │
Parse ├─Extract from code blocks
JSON  │ ├─Remove markdown
  │   │ └─Try again
  │   │
  OK  Error
  │   │
Filter & validate questions
  │
Return results
```

---

## 🐛 Common Errors & Fixes

### Error 1: "VITE_GROQ_API_KEY not set"

**What it means**: The API key environment variable isn't configured

**How to fix**:
1. Check `frontend/.env` file exists
2. Add this line (with your actual key):
   ```bash
   VITE_GROQ_API_KEY=gsk_your_actual_key_here
   ```
3. Restart dev server: `npm run dev`
4. Try again

**Verification**:
```
Console should show:
✅ 📤 Sending to Groq API...
(instead of ⚠️ VITE_GROQ_API_KEY not set)
```

---

### Error 2: "POST https://api.groq.com/openai/v1/chat/completions 400 (Bad Request)"

**What it means**: The API request format is wrong

**How to fix** (Already Fixed! ✅):
- Text is now cleaned before sending
- System prompt is simplified
- Request body is validated
- Max tokens reduced to 2048

**If still occurring**:
1. Check API key is valid at https://console.groq.com
2. Restart dev server: `npm run dev`
3. Try with a simpler PDF (fewer questions)
4. Check browser console for full error message

**Verification**:
```
Console should show:
✅ 📤 Sending to Groq API...
✅ 📥 Groq response received: [{"type":"multiple_choice"...
```

---

### Error 3: "Groq API error: { error: {...}}"

**What it means**: Groq returned an error response

**Specific codes**:

#### 401 Unauthorized
- **Cause**: Invalid or expired API key
- **Fix**: 
  1. Go to https://console.groq.com
  2. Check API key hasn't expired
  3. Create new key if needed
  4. Update `.env` and restart server

#### 429 Too Many Requests
- **Cause**: Rate limit exceeded (rare on free tier)
- **Fix**: Wait a few minutes and try again
- **Note**: Free tier is generous (100k tokens/month)

#### 500 Internal Server Error
- **Cause**: Groq service issue (temporary)
- **Fix**: Wait a moment and try again
- **Note**: Falls back to HF or local automatically

---

### Error 4: "Failed to parse questions JSON"

**What it means**: The AI response wasn't valid JSON

**How to fix** (Already Fixed! ✅):
- Now auto-detects markdown code blocks
- Extracts JSON from between ``` markers
- Handles responses with extra text

**If still occurring**:
1. Check browser console for the actual response text
2. It might be a very complex document
3. Try with a simpler file (10-20 questions)
4. Local extraction will still work as fallback

---

### Error 5: "Failed to import questions: Network error"

**What it means**: Cannot connect to Supabase database

**How to fix**:
1. Check internet connection
2. Verify Supabase is online (check https://status.supabase.com)
3. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
4. Restart dev server
5. Try again

**Note**: This is a database error, not Groq. Questions were extracted but couldn't be saved.

---

## ✨ New Debugging Features

### Console Logging

The system now logs detailed information:

```
🔍 Starting local question parsing...
✅ Local parsing found 3992 questions
📊 Local confidence: 19%
⚠️  Confidence 19% below threshold 80%
🤖 Attempting AI enhancement...
📤 Sending to Groq API...
📥 Groq response received: [{"type":"multiple_choice"...
✅ Successfully processed 100 questions from Groq
✅ AI enhancement found 100 questions
⏱️  Total processing time: 1234ms
✅ Hybrid extraction: 100 questions
📊 Confidence: 19%
🤖 AI Provider: groq
```

### Error Diagnostics

When something goes wrong, you'll see:

```
❌ Groq API error (400): {"error": "...details..."}
❌ Invalid API key - check VITE_GROQ_API_KEY
```

or

```
⚠️  Rate limit exceeded - try again later
```

or

```
❌ Bad request - check request format
```

---

## 🧪 Testing Steps

### Test 1: Verify API Key Setup

1. Open `frontend/.env`
2. Look for: `VITE_GROQ_API_KEY=gsk_...`
3. If missing:
   - Go to https://console.groq.com
   - Create new API key
   - Copy to `.env`

### Test 2: Verify Key Format

1. Open DevTools (F12)
2. Go to Console tab
3. Upload a PDF
4. Look for: `📤 Sending to Groq API...`
5. If you see this, key is being used ✅

### Test 3: Check Local Parsing Works

1. Open Question Bank
2. Toggle OFF "Use Hybrid Extraction"
3. Upload PDF
4. Should work instantly (no API needed)

### Test 4: Check AI Fallback

1. Toggle ON "Hybrid Extraction"
2. Upload same PDF
3. If local confidence < 80%, should call Groq
4. Should see results with "🤖 AI Provider: groq"

### Test 5: Verify Detailed Logs

1. Open DevTools Console
2. Upload a file
3. You should see all these logs:
   - 🔍 Starting local question parsing
   - ✅ Local parsing found X questions
   - 📊 Local confidence: X%
   - 🤖 Attempting AI enhancement (if needed)
   - ✅ Successfully processed X questions from Groq

---

## 📋 Checklist for Troubleshooting

- [ ] API key is set in `frontend/.env`
- [ ] API key starts with `gsk_`
- [ ] Dev server restarted after adding key
- [ ] Browser is showing Console logs
- [ ] Trying with a simple PDF first
- [ ] Internet connection is working
- [ ] Groq service is online (https://status.groq.com)
- [ ] No other errors in console

---

## 🔗 Useful Links

- **Groq Console**: https://console.groq.com
- **Get API Key**: https://console.groq.com/keys
- **Groq Status**: https://status.groq.com
- **Documentation**: https://console.groq.com/docs
- **Community**: https://discord.gg/groq

---

## ⚡ Quick Fixes (In Order)

1. **First**: Restart dev server (`npm run dev`)
2. **Second**: Check API key in `.env`
3. **Third**: Try with a simpler PDF (10-20 questions)
4. **Fourth**: Clear browser cache (Ctrl+Shift+Delete)
5. **Fifth**: Check browser console for exact error
6. **Sixth**: Try local extraction only (toggle OFF hybrid)

---

## 🎯 Expected Behavior

### When It Works ✅

```
Console shows:
✅ Local parsing found 3992 questions
📊 Local confidence: 19%
🤖 Attempting AI enhancement...
📤 Sending to Groq API...
✅ Successfully processed 100 questions from Groq
🤖 AI Provider: groq

Modal shows:
✅ Success! 100 questions imported
Confidence: 78% 
AI Provider: GROQ
Processing: 1.2 seconds
```

### When Something's Wrong ❌

```
Console shows:
❌ Groq API error (400)
⚠️ Both AI providers failed, using local results
ℹ️  AI returned no results, keeping local results

Modal shows:
✅ Questions imported: 3992
Confidence: 19%
Issues: AI enhancement failed
```

**Note**: Even when AI fails, local extraction still works! ✅

---

## 📞 Getting More Help

1. **Check Console Logs**: F12 → Console tab
2. **Read Error Messages**: They're now very specific
3. **Try Fallback**: Hybrid extraction → local → always works
4. **Restart Server**: `npm run dev`
5. **Clear Cache**: Ctrl+Shift+Delete
6. **Try Again**: Fresh upload with simple file

---

## 🎓 How to Read the Logs

```
🔍 = Starting/checking
📊 = Statistics
⚠️  = Warning (but not failing)
📤 = Sending request
📥 = Receiving response
✅ = Success
❌ = Error
🤖 = AI related
⏱️  = Timing/performance
ℹ️  = Information
```

---

**Last Updated**: 2024
**Status**: ✅ All common errors handled
**Tested With**: Groq free tier API
**Fallback**: Local extraction always works

