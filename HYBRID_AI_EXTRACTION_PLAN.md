# Hybrid AI Question Extraction Plan - Durrah Exams

## 📋 Executive Summary
Implement a **dual-layer extraction system** combining:
1. **Local Logic** (100% free) - Pattern matching, formatting rules
2. **Free AI Models** (fallback for complex cases) - Semantic understanding

---

## 🏗️ Architecture Overview

```
User Upload File (PDF/DOCX/TXT)
    ↓
Step 1: LOCAL TEXT EXTRACTION
    ├─ PDF → pdfjs-dist (already bundled ✓)
    ├─ DOCX → mammoth (already bundled ✓)
    └─ TXT → native File API (already bundled ✓)
    ↓
Step 2: LOCAL PATTERN RECOGNITION (Free Logic)
    ├─ Detect question formats (MCQ, T/F, Fill-blank, etc.)
    ├─ Extract options & answers
    ├─ Identify difficulty levels
    ├─ Parse categories/tags
    └─ Confidence Score: 0-100%
    ↓
Step 3: CONFIDENCE CHECK
    ├─ If confidence > 80% → USE LOCAL ONLY ✓
    └─ If confidence ≤ 80% → CALL FREE AI (fallback)
    ↓
Step 4: FREE AI ENRICHMENT (Optional)
    ├─ Re-parse complex questions
    ├─ Validate extracted data
    ├─ Generate explanations
    └─ Suggest difficulty levels
    ↓
Step 5: SAVE TO DATABASE
```

---

## 🎯 Best Free AI Models for Question Extraction

### **Option 1: Mistral 7B via Hugging Face API (RECOMMENDED)**
✅ **Best Choice for Question Extraction**
- **Cost**: FREE with 30,000 API calls/month
- **Accuracy**: 90%+ for educational content
- **Speed**: ~2-3 seconds per question
- **Rate Limit**: 30 requests/minute
- **Setup**: 2 minutes

```
API: https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1
```

**Pros:**
- No credit card needed
- Best reasoning for Q&A
- Good for edge cases
- Open source

**Cons:**
- Rate limited
- Requires Hugging Face account

---

### **Option 2: Groq API (FASTEST ALTERNATIVE)**
⚡ **Best for Speed**
- **Cost**: FREE with ~100,000 tokens/month
- **Accuracy**: 85-90%
- **Speed**: <500ms per question (FASTEST)
- **Models**: Mixtral 8x7b, LLaMA 2 70b
- **Setup**: 5 minutes

```
API: https://api.groq.com/openai/v1/chat/completions
```

**Pros:**
- Extremely fast
- Generous free tier
- LLaMA 2 70B available
- Best latency

**Cons:**
- Requires billing info (but no charge)

---

### **Option 3: Together AI**
💰 **Balanced Option**
- **Cost**: FREE $5 credit monthly
- **Accuracy**: 88-92%
- **Speed**: 1-2 seconds
- **Models**: LLaMA 2, Mistral, Falcon
- **Setup**: 5 minutes

```
API: https://api.together.xyz/v1/chat/completions
```

---

### **Option 4: Claude API (Anthropic) - Limited Free**
🧠 **Best Quality (Limited Free Tier)**
- **Cost**: 5$ credit but rate limited
- **Accuracy**: 95%+ (best)
- **Speed**: 1-3 seconds
- **Setup**: 5 minutes

```
API: https://api.anthropic.com/v1/messages
```

**⚠️ Not recommended for high-volume** - save for validation only

---

## 🚀 Recommended Implementation: Tier 1 + Fallback

### **Tier 1: LOCAL LOGIC (FREE)**
```typescript
// Phase 1: Extract text from file
// Phase 2: Parse with regex patterns
// Phase 3: Calculate confidence score

Confidence > 80% → Use it
Confidence ≤ 80% → Call Groq API (fastest fallback)
```

### **Tier 2: FREE AI (GROQ - Fallback)**
```
When local extraction uncertain:
- Send to Groq API
- Get reparsed questions
- Merge results
- Cost: ~$0.0001 per question
```

---

## 🔑 API Keys Setup (5 minutes)

### **Step 1: Get Groq API Key (RECOMMENDED)**
1. Go to https://console.groq.com
2. Sign up with Google/Email
3. Create new API key
4. Copy key

**Add to `.env.local`:**
```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

### **Step 2: Get Hugging Face Token (Backup)**
1. Go to https://huggingface.co/settings/tokens
2. Create new token (read permission enough)
3. Copy token

**Add to `.env.local`:**
```env
VITE_HF_API_KEY=hf_xxxxxxxxxxxxx
```

---

## 💻 Implementation Code Structure

### **1. Local Pattern Recognition** (enhances existing)
```typescript
// lib/extractors/localParser.ts
export function parseQuestionsLocally(text: string): {
    questions: ExtractedQuestion[];
    confidence: number; // 0-100
}
```

**Detects:**
- MCQ format: "1) Question? a) Option a b) Option b"
- T/F format: "True or False:"
- Fill-blank: "Complete: _____ is..."
- Difficulty hints: "Hard:", "Medium:"
- Categories: "[Category]: Question"

### **2. Confidence Scoring System**
```typescript
// lib/extractors/confidenceScorer.ts
export function calculateConfidence(parsedData): number {
    // Each correctly parsed element +20%
    // Valid answer key +20%
    // Multiple options detected +20%
    // Category/difficulty found +20%
    // Punctuation well-formed +20%
}
```

### **3. AI Fallback Service** (new)
```typescript
// lib/ai/aiExtractor.ts
export async function enhanceWithAI(
    text: string,
    localResult: ParsedResult,
    provider: 'groq' | 'huggingface'
): Promise<ExtractedQuestion[]>
```

### **4. Hybrid Pipeline** (orchestrator)
```typescript
// lib/extractors/hybridExtractor.ts
export async function extractQuestionsHybrid(
    text: string,
    options?: { useAI?: boolean; aiProvider?: 'groq' | 'hf' }
): Promise<ExtractedQuestion[]>
```

---

## 📊 Cost Breakdown (Monthly)

| Method | Cost | Questions/Month | Per Question |
|--------|------|-----------------|--------------|
| Local Only | $0 | Unlimited | $0.00 |
| Local + Groq Fallback | $0 | 100k + 3.3k AI | $0.00 |
| Hugging Face | $0 | 30k | $0.00 |
| Claude (Pro) | $20 | 1M | $0.00001 |

**Recommended**: Local + Groq Fallback = **$0/month** for most users

---

## 🔄 Question Format Support

### **Automatically Detected & Parsed:**
- ✅ Multiple Choice (ABCD / 1234 / bullet points)
- ✅ True/False (Yes/No variants)
- ✅ Fill in the Blank (underscores, parentheses)
- ✅ Dropdown/Select (option lists)
- ✅ Short Answer
- ✅ Matching
- ✅ Multiple Select (checkboxes)

### **Metadata Extraction:**
- Category/Subject (e.g., [Biology] or Category: Biology)
- Difficulty Level (Easy/Medium/Hard or 1-5 scale)
- Points (Points: 5 or [5 pts])
- Tags (comma-separated or hashtags)

---

## 🎯 Implementation Phases

### **Phase 1: Enhanced Local Parser (1-2 hours)**
- Improve regex patterns
- Add confidence scoring
- Better edge case handling
- Test with sample files

### **Phase 2: Groq Integration (1 hour)**
- Add Groq API wrapper
- Implement fallback logic
- Error handling
- Rate limiting

### **Phase 3: Testing & Validation (1 hour)**
- Test with 10 sample question files
- Validate accuracy
- Measure performance
- Document patterns

### **Phase 4: UI/UX (30 minutes)**
- Show confidence scores
- Display extraction status
- Option to retry with AI
- Preview before saving

---

## 🔐 Security Best Practices

```typescript
// ✅ DO
- Store API keys in environment variables
- Validate file size (max 10MB)
- Sanitize extracted text
- Rate limit API calls
- Log extraction metrics

// ❌ DON'T
- Commit API keys to git
- Use client-side API keys in production
- Trust user-provided API keys
- Skip input validation
```

---

## 📈 Expected Results

### **With Local Logic Only:**
- Accuracy: 75-85%
- Speed: <500ms
- Cost: $0
- Coverage: 70% of questions extracted correctly

### **With Local + AI Fallback:**
- Accuracy: 90-95%
- Speed: <2s (fallback cases)
- Cost: $0 (free tier)
- Coverage: 95%+ questions extracted correctly

---

## 🚦 Next Steps (Priority Order)

1. **TODAY**: Implement confidence scoring in local parser
2. **TODAY**: Add Groq API integration (with error handling)
3. **TOMORROW**: Create hybrid extraction pipeline
4. **TOMORROW**: Add UI to show extraction confidence
5. **NEXT WEEK**: Batch test with real question files
6. **NEXT WEEK**: Optimize performance

---

## 📞 API References

- **Groq**: https://console.groq.com/docs/quickstart
- **Hugging Face**: https://huggingface.co/docs/api-inference
- **Claude**: https://docs.anthropic.com/
- **Together AI**: https://www.together.ai/docs

---

## ✅ Recommendation Summary

**🏆 BEST CHOICE: Groq API + Local Logic**

Why:
- ✅ Completely free ($0/month)
- ✅ Fastest AI (< 500ms)
- ✅ Generous free tier (100k tokens/month)
- ✅ No credit card for generous tier
- ✅ Easiest setup (5 minutes)
- ✅ Best UX with instant fallback

**Fallback Order:**
1. Local parser (instant, free) ← PRIMARY
2. Groq API (fast, free) ← SECONDARY
3. Hugging Face (reliable, free) ← TERTIARY

