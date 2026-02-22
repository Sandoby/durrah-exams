# Email Design Improvement Plan — Apple-Inspired, Professional Overhaul

> **Goal:** Redesign every email sent by the Durrah for Tutors platform to achieve a polished, premium, Apple-like aesthetic with pixel-perfect consistency across all email clients.

---

## 1. Current State Audit

### 1.1 Edge Functions That Send Emails

| # | Edge Function | Email Types | Uses Shared Template? |
|---|---|---|---|
| 1 | `send-welcome-email` | Welcome, subscription reminders (7d/3d), expired, expired+3d, password reset, email verification | ✅ `renderUnifiedEmailTemplate` |
| 2 | `send-payment-email` | Payment success, payment failed, subscription expiring | ✅ `renderUnifiedEmailTemplate` |
| 3 | `send-password-reset-otp` | OTP verification code | ✅ `renderUnifiedEmailTemplate` (+ custom OTP block) |
| 4 | `send-campaign-email` | Admin campaign / marketing emails | ❌ **Own inline template** (duplicated HTML) |
| 5 | `check-expiring-subscriptions` | Subscription reminders (7d/3d), expired, expired+3d | ✅ `renderUnifiedEmailTemplate` |
| 6 | `generate-invoice` | Invoice HTML (rendered in browser / potentially emailed) | ❌ **Completely separate HTML** |

### 1.2 Shared Template (`_shared/email-template.ts`)

The shared template (`renderUnifiedEmailTemplate`) provides:
- Preheader text
- Header with logo + brand name
- Eyebrow pill badge
- Title + body HTML
- Optional CTA button
- Footer with links + copyright

### 1.3 Current Design Issues

| Issue | Details |
|---|---|
| **Inconsistent templates** | `send-campaign-email` and `generate-invoice` use their own hard-coded HTML instead of the shared template. |
| **Header is bulky** | The logo area uses a wide `#e5e7f0` gray banner that feels heavy and dated compared to Apple's clean, minimal headers. |
| **Brand name typography** | "Durrah for Tutors" spans 34px in a single line — feels like a billboard, not an elegant header. |
| **CTA button is flat** | Single solid-color rectangle with `border-radius:10px`. No shadow, no hover hint, no subtle gradient. Looks generic. |
| **Eyebrow badge is plain** | A pill with flat background. Lacks the subtle polish of Apple's tag elements. |
| **No visual hierarchy separator** | No divider between header and body; content runs together. |
| **Footer is minimal** | Only "Website | Privacy" links. No social icons, no unsubscribe link, no postal address (CAN-SPAM). |
| **No dark mode support** | Zero `@media (prefers-color-scheme: dark)` rules. Looks broken in Apple Mail dark mode. |
| **Invoice template off-brand** | Uses `#667eea` purple, `Arial`, and a completely different layout. Doesn't resemble the rest of the system. |
| **No RTL / Arabic support** | Platform is used in Egypt — no `dir="rtl"` structure or Arabic font stack. |
| **Logo size varies** | 52×52 in shared template vs 80×80 in campaign template. |
| **No retina image** | Logo uses 1× resolution; looks blurry on high-DPI screens. |

---

## 2. Design Principles (Apple-Inspired)

1. **White space is a feature** — generous padding, restrained content density.
2. **Typography-first** — SF Pro / system font stack, clear weight hierarchy (700/600/400), tight letter-spacing.
3. **Monochrome with one accent** — mostly `#1d1d1f` / `#424245` / `#6e6e73` text on `#ffffff`, one accent color per email type.
4. **Subtle depth** — hairline borders (`#e8e8ed`), soft shadows on cards, no hard dividers.
5. **Rounded, soft shapes** — 16px card radius, 12px button radius, 8px inner element radius.
6. **Focused CTA** — one primary button per email, unmissable but elegant.
7. **Dark mode native** — automatic inversion via `@media (prefers-color-scheme: dark)` with tested Apple Mail support.

---

## 3. Proposed Design System

### 3.1 New Unified Email Template Structure

```
┌─────────────────────────────────────────────────┐
│                  (preheader hidden)              │
├─────────────────────────────────────────────────┤
│                                                 │
│              [Logo]  Durrah                      │
│                      for Tutors                 │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │  ┌ eyebrow pill ┐                       │   │
│   │                                         │   │
│   │  Title (24px, bold)                     │   │
│   │                                         │   │
│   │  Body text (15px, #424245)              │   │
│   │                                         │   │
│   │  ┌───────────────────────────────────┐  │   │
│   │  │  Detail card (if applicable)      │  │   │
│   │  │  e.g. invoice summary, OTP box    │  │   │
│   │  └───────────────────────────────────┘  │   │
│   │                                         │   │
│   │         [ CTA Button ]                  │   │
│   │                                         │   │
│   │  Secondary text (13px, muted)           │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   Footer: links · unsubscribe · address         │
│   © 2026 Durrah for Tutors                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.2 Color Tokens

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-page` | `#f5f5f7` | `#1c1c1e` | Page background |
| `--bg-card` | `#ffffff` | `#2c2c2e` | Content card |
| `--bg-header` | `#f9f9fb` | `#252527` | Header strip |
| `--text-primary` | `#1d1d1f` | `#f5f5f7` | Headings |
| `--text-secondary` | `#424245` | `#a1a1a6` | Body text |
| `--text-tertiary` | `#6e6e73` | `#8e8e93` | Captions, footer |
| `--border` | `#e8e8ed` | `#3a3a3c` | Card borders |
| `--accent-default` | `#4b47d6` | `#6e6aff` | Brand / CTA |
| `--accent-success` | `#34c759` | `#30d158` | Payment confirmed |
| `--accent-warning` | `#ff9f0a` | `#ffd60a` | Subscription warning |
| `--accent-danger` | `#ff3b30` | `#ff453a` | Expired / failed |
| `--accent-info` | `#007aff` | `#0a84ff` | Verification |

### 3.3 Typography Scale

| Element | Size | Weight | Letter-spacing | Color |
|---|---|---|---|---|
| Brand name "Durrah" | 26px | 700 | -0.5px | accent |
| Brand name "for Tutors" | 26px | 400 | -0.2px | `#8e8e93` |
| Eyebrow | 11px | 600 | 0.5px | accent |
| Title | 24px | 700 | -0.3px | primary |
| Body | 15px | 400 | 0 | secondary |
| Detail label | 13px | 600 | 0 | tertiary |
| Detail value | 15px | 600 | 0 | primary |
| CTA button | 15px | 600 | 0 | `#ffffff` |
| Footer | 12px | 400 | 0 | tertiary |

### 3.4 Spacing Scale

| Section | Padding |
|---|---|
| Page → outer table | 40px top/bottom, 16px sides |
| Header inner | 20px vertical, 24px horizontal |
| Card inner | 32px all sides |
| Between sections (header→card, card→footer) | 16px |
| Title → body | 12px |
| Body → detail card | 20px |
| Detail card → CTA | 24px |
| CTA → secondary text | 16px |

---

## 4. Implementation Plan

### Phase 1: Rebuild the Shared Template Engine

**File:** `supabase/functions/_shared/email-template.ts`

| Task | Details |
|---|---|
| 1.1 | Extend `UnifiedEmailTemplateInput` interface with new optional fields: `detailCard` (key-value pairs), `secondaryText`, `showUnsubscribe`, `direction` (`ltr`/`rtl`). |
| 1.2 | Redesign the header: smaller logo (40×40), brand name reduced to 26px, centered layout, lighter background (`#f9f9fb`), 1px bottom border. |
| 1.3 | Add `@media (prefers-color-scheme: dark)` block with class-based overrides for background, text, borders, and card colors. |
| 1.4 | Redesign the CTA button: slight vertical padding increase (14px 28px), add `box-shadow: 0 1px 3px rgba(0,0,0,0.12)`, use `border-radius: 12px`. |
| 1.5 | Add a **detail card component** — a light gray rounded box (`#f9f9fb`, 12px radius, 1px `#e8e8ed` border) that renders an array of `{ label, value }` pairs in clean rows. |
| 1.6 | Improve the eyebrow pill: 11px uppercase, subtle `letter-spacing: 0.5px`, use accent color as text with 8% opacity background. |
| 1.7 | Redesign the footer: add unsubscribe link, physical address line, social icon row (optional), softer divider. |
| 1.8 | Add Retina logo support: use `width`/`height` attributes at display size but serve 2× image URL. |
| 1.9 | Add `dir="rtl"` support: accept a `direction` parameter that flips alignment and padding. |
| 1.10 | Export a new helper: `renderDetailCard(items: { label: string; value: string }[])` for reuse in payment/invoice templates. |

### Phase 2: Migrate All Functions to the Shared Template

| Task | Details |
|---|---|
| 2.1 | **`send-campaign-email`** — Remove the 80+ lines of duplicated HTML in `generateEmailHtml()`. Replace with a call to `renderUnifiedEmailTemplate()`. |
| 2.2 | **`generate-invoice`** — Rewrite using the shared template + `detailCard` for invoice line items. Replace the old `Arial`-based layout with the Apple-inspired design. |
| 2.3 | **`send-password-reset-otp`** — Keep the custom OTP box but integrate it as `bodyHtml` content within the shared template (already mostly done, just refine the OTP code styling). |
| 2.4 | **`send-welcome-email`** — Already uses shared template; refine content wording and add a secondary text line: "This email was sent because you created an account." |
| 2.5 | **`send-payment-email`** — Already uses shared template; convert inline detail `<div>` blocks to use the new `renderDetailCard()` helper for the invoice summary. |
| 2.6 | **`check-expiring-subscriptions`** — Already uses shared template; no structural changes needed. |

### Phase 3: Visual Polish Per Email Type

#### 3.1 Welcome Email
- Add a subtle hero illustration or gradient strip below the header (brand accent → transparent).
- Include a 3-step "Getting Started" mini-guide as a horizontal icon row.
- CTA: "Open Dashboard →"

#### 3.2 Payment Success Email
- Use the detail card for: Invoice ID, Date, Plan, Amount, Valid Until.
- Add a green `✓` checkmark icon before the title.
- Add a secondary text: "A copy of this invoice is available in your dashboard."
- CTA: "View Dashboard →"

#### 3.3 Payment Failed Email
- Red accent throughout.
- Detail card with: Order ID, Error Reason, Attempted Amount.
- CTA: "Try Again →"
- Secondary helpline text at bottom.

#### 3.4 Subscription Reminder (7-day)
- Amber/yellow accent.
- Progress bar visual showing "7 days remaining" (HTML/CSS horizontal bar).
- Features checklist inside a detail card.
- CTA: "Renew Now →"

#### 3.5 Subscription Reminder (3-day)
- Orange accent with urgency.
- Countdown-style display: "3 days left".
- Same feature list with emphasis on what will be lost.
- CTA: "Renew Now →"

#### 3.6 Subscription Expired
- Red accent.
- Clear "Access Suspended" label.
- Reassurance: "Your data is safe and will be available when you reactivate."
- CTA: "Reactivate →"

#### 3.7 Subscription Expired +3 Days (Win-back)
- Softer brand accent (indigo).
- Warm, personal tone.
- Small testimonial or stat: "Join 500+ tutors who trust Durrah."
- CTA: "Come Back →"

#### 3.8 Password Reset / OTP
- Monochrome — no color distraction.
- Large monospaced OTP code in a centered pill with subtle shadow.
- "Expires in 15 minutes" shown as a muted caption directly below the code.
- No CTA button — the code IS the action.

#### 3.9 Email Verification
- Blue/teal accent.
- Simple, clean: "Confirm your email to unlock all features."
- CTA: "Verify Email →"

#### 3.10 Campaign Emails
- Dynamic accent color (passed as parameter).
- Use the shared template with body HTML injected.
- Consistent header/footer wrapping.

#### 3.11 Invoice (HTML)
- Full Apple-invoice style: clean table with alternating row tints.
- Prominent total amount with currency.
- "What's Included" section with checkmark icons.
- Print-friendly CSS (`@media print`).

### Phase 4: Dark Mode Implementation

| Task | Details |
|---|---|
| 4.1 | Add `<meta name="color-scheme" content="light dark">` to `<head>`. |
| 4.2 | Add `<meta name="supported-color-schemes" content="light dark">` for Apple Mail. |
| 4.3 | Insert `@media (prefers-color-scheme: dark) { ... }` stylesheet block with class-based overrides. |
| 4.4 | Use CSS classes on key elements (`.email-body`, `.email-card`, etc.) so dark mode selectors can target them. |
| 4.5 | Invert logo for dark backgrounds or add white outline version. |
| 4.6 | Test in: Apple Mail (macOS/iOS), Gmail (web/app), Outlook 365, Yahoo Mail. |

### Phase 5: Accessibility & Deliverability

| Task | Details |
|---|---|
| 5.1 | Add `role="presentation"` to all layout tables (done partially). |
| 5.2 | Ensure all images have meaningful `alt` text. |
| 5.3 | CTA buttons: VML fallback for Outlook (`<!--[if mso]>` blocks). |
| 5.4 | Minimum 4.5:1 contrast ratio on all text. |
| 5.5 | Add plain-text version (`text` field) to every Resend API call (only `send-password-reset-otp` does this currently). |
| 5.6 | Add `List-Unsubscribe` header to marketing/campaign emails. |
| 5.7 | Include physical mailing address in footer (CAN-SPAM / GDPR compliance). |

### Phase 6: Consistency & Cleanup

| Task | Details |
|---|---|
| 6.1 | Unify `from` address: currently varies between `info@`, `support@`, `security@`. Standardize: `security@` for OTP/password, `info@` for everything else. |
| 6.2 | Unify logo URL: use a single constant imported from `_shared/email-template.ts`. |
| 6.3 | Fix typo in `send-password-reset-otp`: uses `RESEND_.com_API_KEY` (has `.com` in the env var name). |
| 6.4 | Remove hardcoded `SITE_URL` / `LOGO_URL` from individual functions — centralize in shared module. |
| 6.5 | Create a `_shared/email-constants.ts` file for: `SITE_URL`, `LOGO_URL`, `FROM_ADDRESS`, `SUPPORT_EMAIL`, etc. |

---

## 5. File Change Summary

| File | Action |
|---|---|
| `supabase/functions/_shared/email-template.ts` | Major rewrite — new design, dark mode, detail card, RTL |
| `supabase/functions/_shared/email-constants.ts` | **NEW** — centralized constants |
| `supabase/functions/send-welcome-email/index.ts` | Minor — refine content, add secondary text |
| `supabase/functions/send-payment-email/index.ts` | Medium — use `renderDetailCard()` for invoice data |
| `supabase/functions/send-password-reset-otp/index.ts` | Minor — refine OTP styling, fix env var typo |
| `supabase/functions/send-campaign-email/index.ts` | Medium — replace inline HTML with shared template |
| `supabase/functions/check-expiring-subscriptions/index.ts` | Minor — no structural changes |
| `supabase/functions/generate-invoice/index.ts` | Major — full rewrite using shared template |

---

## 6. Testing Checklist

- [ ] Render all 11 email types and visually compare side-by-side
- [ ] Test in Apple Mail (macOS + iOS) — light and dark mode
- [ ] Test in Gmail (web + mobile app)
- [ ] Test in Outlook 365 (web + desktop)
- [ ] Test in Yahoo Mail
- [ ] Verify plain-text fallback renders correctly
- [ ] Check CTA button renders in Outlook (VML fallback)
- [ ] Validate HTML with [Email on Acid](https://www.emailonacid.com/) or [Litmus](https://www.litmus.com/)
- [ ] Confirm all links point to correct URLs
- [ ] Verify unsubscribe link works
- [ ] Check Retina logo rendering on high-DPI screens
- [ ] Confirm dark mode auto-switches correctly
- [ ] Validate CAN-SPAM compliance (unsubscribe + address)
- [ ] Run accessibility audit (contrast ratios, alt text, semantic structure)

---

## 7. Priority Order

| Priority | Phase | Estimated Effort |
|---|---|---|
| 🔴 Critical | Phase 1 (Shared template rebuild) | ~4 hours |
| 🔴 Critical | Phase 2 (Migrate all functions) | ~3 hours |
| 🟡 High | Phase 3 (Visual polish per type) | ~4 hours |
| 🟡 High | Phase 4 (Dark mode) | ~2 hours |
| 🟢 Medium | Phase 5 (Accessibility) | ~2 hours |
| 🟢 Medium | Phase 6 (Consistency/cleanup) | ~1 hour |

**Total estimated effort: ~16 hours**

---

## 8. Design Reference

The target aesthetic should match Apple's transactional emails:
- **Apple ID verification emails** — clean white card, centered logo, monospaced code
- **Apple Store receipts** — clean detail table, green accent for success, prominent total
- **iCloud storage alerts** — amber warning with progress bar, clear CTA

Key differentiator: **Durrah branding** (indigo/purple `#4b47d6` accent) while maintaining Apple's restraint and whitespace philosophy.
