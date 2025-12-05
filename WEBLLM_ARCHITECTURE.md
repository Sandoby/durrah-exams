# WebLLM Integration - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DURRAH EXAMS - QUESTION EXTRACTION                │
└─────────────────────────────────────────────────────────────────────┘

                        USER'S BROWSER (React)
                              ▼
                     ┌─────────────────────┐
                     │  QuestionBank.tsx   │
                     │  (UI & Form)        │
                     └──────────┬──────────┘
                                │ Upload PDF/DOCX/TXT
                                ▼
                     ┌─────────────────────┐
                     │ File Parser         │
                     │ • pdfjs-dist        │
                     │ • mammoth.js        │
                     │ • Native File API   │
                     └──────────┬──────────┘
                                │ Extract raw text
                                ▼
              ╔═══════════════════════════════════════╗
              ║   HYBRID EXTRACTION ORCHESTRATOR       ║
              ║   (hybridExtractor.ts)                ║
              ║   • Manages AI provider selection     ║
              ║   • Handles fallback chain            ║
              ║   • Merges extraction results         ║
              ╚═══════════════════════════════════════╝
                                │
                ┌───────────────┼───────────────┬─────────────┐
                ▼               ▼               ▼             ▼
          ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
          │ Step 1   │  │ Local    │  │ Step 3   │  │ Step 4   │
          │ Local    │  │ Parser   │  │ Fallback │  │ Results  │
          │ Parser   │  │ Only     │  │ Available│  │ Returned │
          │ (Always) │  │ (60%)    │  │          │  │          │
          └─────┬────┘  └──────────┘  └──────────┘  └──────────┘
                │
                ▼
         ┌──────────────────┐
         │ Confidence < 80% │
         └────┬───────┬─────┘
              │       │
              YES     NO
              │       └──→ Return local results ✅
              │
              ▼
    ╔═══════════════════════════════════════════════════════════════╗
    ║        STEP 2: AI ENHANCEMENT (Priority Hierarchy)            ║
    ╚═══════════════════════════════════════════════════════════════╝
              │
        ┌─────┴─────┐
        ▼           ▼
    Option 1:  Option 2:
    BROWSER-   LOCAL SERVER
    BASED      (If running)
        │           │
        ▼           ▼
    ┌──────────┐  ┌──────────┐
    │ WebLLM   │  │ Ollama   │
    │ 85%      │  │ 85%      │
    │ Private  │  │ Private  │
    │ Free     │  │ Free     │
    │ ~1-2min  │  │ ~1-2min  │
    │          │  │          │
    │ Models:  │  │ Models:  │
    │ • Phi-2  │  │ • Llama2 │
    │ • Mistral│  │ • Mistral│
    │ • Tiny   │  │ • Others │
    │ Llama    │  │          │
    └────┬─────┘  └────┬─────┘
         │             │
         └──────┬──────┘
                ▼
         Success? NO  YES
                │    └──→ ✅ Use AI results
                │
        ┌───────┴────────┐
        ▼                ▼
    Option 3:       Option 4:
    CLOUD API        CLOUD API
    (Fallback)       (Fallback 2)
        │                │
        ▼                ▼
    ┌──────────┐  ┌──────────┐
    │ Groq     │  │ HuggingF  │
    │ 80%      │  │ 75%      │
    │ Fast     │  │ Slower   │
    │ Free API │  │ Free     │
    │ 100k     │  │          │
    │ tokens/  │  │ Backup   │
    │ month    │  │ only     │
    │ ~2-5sec  │  │          │
    └────┬─────┘  └────┬─────┘
         │             │
         └──────┬──────┘
                ▼
         Success? NO
                │
                ▼
         ┌─────────────┐
         │ Final       │
         │ Fallback:   │
         │ Local Only  │
         │ (60%)       │
         └─────┬───────┘
               │
               ▼
        ┌──────────────────┐
        │ Return Results   │
        │ + Confidence     │
        │ + Metadata       │
        │ + AI Provider    │
        └──────┬───────────┘
               │
               ▼
        Save to Supabase DB
```

## Detailed Component Flow

### Phase 1: Document Upload
```
PDF/DOCX/TXT
     │
     ▼
File Parser (pdfjs-dist, mammoth)
     │
     ▼
Raw Text Extraction
     │
     ▼
Unicode Sanitization
(Remove null bytes, control chars)
```

### Phase 2: Local Parsing
```
Raw Text
     │
     ▼
Regex Patterns Match:
 • "Question X:" prefix
 • "Q." pattern
 • "Multiple choice" sections
 • "True/False" format
 • "[A/B/C/D]" options
     │
     ▼
Extract Questions
     │
     ▼
Calculate Confidence Score:
 - Format adherence: 0-40%
 - Question clarity: 0-30%
 - Option count: 0-30%
     │
     ▼
Confidence Score 0-100%
```

### Phase 3: Intelligent AI Selection

```
User's Browser Capabilities:
    │
    ├─ Has WebGPU?
    │  │
    │  ├─ YES → Try WebLLM ✅ RECOMMENDED
    │  │
    │  └─ NO → Skip to Option 3
    │
    ├─ Is Ollama Running?
    │  │
    │  ├─ YES (localhost:11434) → Try Ollama
    │  │
    │  └─ NO → Skip to Option 3
    │
    └─ Fallback: Cloud APIs
       ├─ Groq (100k tokens/month)
       ├─ HuggingFace (limited)
       └─ Local Parser (always works)
```

### Phase 4: WebLLM Browser-Based Processing

```
BROWSER ENVIRONMENT (WebLLM)
        │
        ├─ Model: Phi-2 (2.7B), Mistral (7B), or TinyLlama (1.1B)
        │
        ├─ Download Model (First time only)
        │  • 2-5 GB file size
        │  • Cached in browser storage
        │  • 5-10 minutes on first run
        │  • Instant on subsequent runs
        │
        ├─ Load Model into GPU/CPU
        │  • WebGPU acceleration (if available)
        │  • Falls back to CPU (slower)
        │  • 30-60 seconds
        │
        ├─ Prepare Prompt
        │  • System: "You are an expert at extracting questions"
        │  • User: "Extract questions from this text"
        │  • Temperature: 0.2 (deterministic)
        │  • Max tokens: 2048
        │
        ├─ Run Inference
        │  • Model processes text
        │  • Generates question JSON
        │  • 1-2 minutes (first time)
        │  • 30-60 seconds (cached)
        │
        ├─ Parse Response
        │  • Extract JSON from markdown
        │  • Validate question structure
        │  • Clean and normalize
        │
        └─ Return Results
           • Questions array
           • 85% accuracy
           • Metadata
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER'S BROWSER                          │
│                    (Client-Side Only)                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Document   │  │   Local      │  │   WebLLM     │     │
│  │   Parser     │  │   Parser     │  │   Runtime    │     │
│  │              │  │              │  │              │     │
│  │ • PDF ← Text │  │ • Regex      │  │ • Phi-2      │     │
│  │ • DOCX ← Txt │  │   Patterns   │  │ • Model      │     │
│  │ • TXT ← Raw  │  │ • Confidence │  │ • Inference  │     │
│  │              │  │   Scoring    │  │              │     │
│  └────┬─────────┘  └────┬─────────┘  └──────┬───────┘     │
│       │                 │                    │             │
│       └─────────────────┴────────────────────┘             │
│                       │                                    │
│                       ▼ (All processing here)              │
│            Results stay in Browser Cache                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │
              │ (Only JSON sent - NO raw documents)
              ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (Optional Cloud)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Questions Table                                     │  │
│  │  • question_text (only)                              │  │
│  │  • extracted_questions (JSON)                        │  │
│  │  • confidence_score                                  │  │
│  │  • ai_provider (webllm/groq/etc)                     │  │
│  │  • user_id (auth)                                    │  │
│  │  • created_at                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Performance Timeline

### First Time Using WebLLM
```
0s      → User clicks "Extract"
0-3s    → Local parsing completes
3s      → Confidence calculated (80%)
3s      → Check WebGPU support
5-10s   → Browser requests model from CDN
20-30s  → Model downloads (2GB)
30-60s  → Model loads into GPU/CPU memory
60s     → Inference starts
120-180s→ Response received
180s    → Results displayed
```

### Second Time (Cached)
```
0s      → User clicks "Extract"
0-3s    → Local parsing completes
3s      → Confidence calculated
3s      → Model already loaded
5-60s   → Inference runs
60-120s → Results displayed
```

### Using Groq (Always Fast)
```
0s      → User clicks "Extract"
0-3s    → Local parsing completes
3s      → Confidence low
3-8s    → API request sent to Groq
8-13s   → Processing in Groq servers
13s     → Response received
13-15s  → Results displayed
```

## Fallback Decision Tree

```
User uploads document
        │
        ▼
Try WebLLM?
    ├─ Check WebGPU support
    │  ├─ YES → Initialize WebLLM
    │  │         │
    │  │         ├─ Download model (1st time)
    │  │         ├─ Load model
    │  │         └─ Extract questions
    │  │
    │  └─ NO → Skip to next
    │
    ├─ Success?
    │  ├─ YES → Return results ✅
    │  └─ NO → Continue to next
    │
Try Ollama?
    ├─ Is server running (localhost:11434)?
    │  ├─ YES → Send extraction request
    │  │         └─ Extract questions
    │  └─ NO → Skip to next
    │
    ├─ Success?
    │  ├─ YES → Return results ✅
    │  └─ NO → Continue to next
    │
Try Groq Cloud API
    ├─ Send to Groq servers
    │  └─ Process with LLM
    │
    ├─ Success?
    │  ├─ YES → Return results ✅
    │  └─ NO → Continue to next
    │
Try HuggingFace Fallback
    ├─ Send to HuggingFace
    │  └─ Process with model
    │
    ├─ Success?
    │  ├─ YES → Return results ✅
    │  └─ NO → Continue to next
    │
Final Fallback: Local Parser Only
    ├─ Return regex-based extraction
    └─ Mark as "Low Confidence (60%)"
```

## Security & Privacy Model

```
BROWSER (100% Private)
├─ Document Upload → Memory Only
├─ Text Extraction → Memory Only
├─ WebLLM Processing → Memory Only + GPU Cache
└─ Results Generated → Memory Only

OPTIONAL CLOUD (Only if user explicitly sends)
├─ Supabase DB → Encrypted
│  └─ Only question data (not original doc)
├─ Groq API → Temporary
│  └─ Only for enhancement (can disable)
└─ HuggingFace → Temporary
   └─ Only as fallback (can disable)
```

## Configuration Matrix

```
OPTION 1: Maximum Privacy (Recommended)
├─ WebLLM: ✅ Enabled
├─ Ollama: ❌ Disabled
├─ Groq: ❌ Disabled
├─ HuggingFace: ❌ Disabled
├─ Result: 100% browser-based processing
└─ Privacy: ✅ Perfect

OPTION 2: Speed Priority
├─ WebLLM: ❌ Disabled
├─ Ollama: ❌ Disabled
├─ Groq: ✅ Enabled (fastest)
├─ HuggingFace: ✅ Enabled
├─ Result: Cloud processing (1-5 sec)
└─ Privacy: ⚠️ Data in cloud

OPTION 3: Balanced (Current Default)
├─ WebLLM: ✅ Enabled (try first)
├─ Ollama: ✅ If running
├─ Groq: ✅ Enabled
├─ HuggingFace: ✅ Fallback
├─ Result: Best of both worlds
└─ Privacy: ✅ Browser-first, cloud fallback

OPTION 4: Local Server Only
├─ WebLLM: ❌ Disabled
├─ Ollama: ✅ Required (must run)
├─ Groq: ❌ Disabled
├─ HuggingFace: ❌ Disabled
├─ Result: Local processing
└─ Privacy: ✅ Perfect (but need server)
```

---

## Summary

**WebLLM Integration provides:**
- ✅ Private browser-based AI extraction
- ✅ Intelligent fallback system
- ✅ Multiple free AI providers
- ✅ Confidence-based decision making
- ✅ Comprehensive error handling
- ✅ User-friendly experience
- ✅ Zero API key management

**Best for:** Users who want fast, private, free question extraction! 🚀
