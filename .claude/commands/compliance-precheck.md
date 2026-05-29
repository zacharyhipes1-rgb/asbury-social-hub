# /compliance-precheck

## Scope

Add a regulatory and OEM advertising rule engine that runs at submission time (server-side) on captions, on-image text (via OCR), and metadata. Flag risky content before it reaches the reviewer. Touches: `/lib/compliance/`, server-side submit handler in /upload, and the submission detail view in /admin where flags are displayed. Do not change the user-facing upload flow other than adding a compliance results panel.

## Context

- Automotive advertising is regulated by the FTC, state Attorneys General, and each OEM's co-op advertising guidelines. Violations can void co-op funding and trigger consent orders.
- Asbury operates Honda, BMW, Lexus, Acura, and Toyota stores in this demo. Each OEM publishes ad standards (e.g. Honda Tier 3 Brand Standards, BMW Dealer Communications Standards, Lexus Dealer Standards, Acura Brand Standards, Toyota Image USA).
- This command builds the rule scaffolding and ships a starter rule set. It does NOT substitute for legal review.

## Required reading before any code change

1. Read `/lib/` to see existing utility conventions.
2. Read the submission server-side submit handler from `/upload-flow-overhaul`. The compliance check runs at the END of validation, before persisting.
3. Read the /admin submission detail view to understand where to render compliance results.

## Implementation requirements

### 1. Rule engine architecture

- Create `/lib/compliance/engine.ts` exporting `runComplianceChecks(submission, ocrText?)` returning `{ flags: Flag[], severity: 'block' | 'warn' | 'pass' }`.
- A `Flag` is `{ rule_id: string, severity: 'block' | 'warn', message: string, matched_text: string, suggested_fix?: string }`.
- `block` flags prevent submission. `warn` flags allow submission but appear prominently to the reviewer.
- Rules are pure functions in `/lib/compliance/rules/`. Each exports `{ id, applies(submission), evaluate(submission, ocrText) }`.
- Run all rules in parallel using `Promise.all`. Aggregate results.
- Persist results to a new column on the submission: `compliance_results jsonb`. Re-run on every edit.

### 2. OCR for on-image text

- Use `tesseract.js` server-side on the uploaded image asset. Pass extracted text into `runComplianceChecks` as `ocrText`.
- For video, extract the first frame + frame at 50% mark + last frame, OCR each, concatenate.
- If OCR fails (e.g. image too dark, no text), log a warning and pass empty string. Do not block submission on OCR failure.
- Cache OCR results keyed by the asset URL to avoid re-running on edit.

### 3. Starter rule set (ship these; do not invent others)

Create one file per rule in `/lib/compliance/rules/`:

#### FTC + general consumer protection

- `apr-without-disclosure`: Match `\b(0(\.\d+)?%|[0-9]{1,2}(\.\d+)?%)\s*APR\b` in caption or OCR text. If matched and no `*` or "see dealer for details" or "for qualified buyers" within 200 chars, return `block` with message "APR claims require qualifier (e.g. 'for qualified buyers, see dealer for details')".
- `lease-payment-without-disclosure`: Match `\$\d+(\.\d{2})?\s*(\/|per)\s*(mo|month)` near "lease". Require disclosure of money down, term length, total of payments, and "tax title fees additional" within 200 chars. Else `block`.
- `guaranteed-approval`: Match `guaranteed (approval|financing|credit)`. Always `block` with message "Guaranteed approval language is prohibited by FTC; no exceptions".
- `lowest-price-superlative`: Match `(lowest|cheapest|best|biggest|largest)\s+(price|deal|inventory|selection)`. `warn` with message "Superlative claims require substantiation per FTC advertising guides".
- `bait-and-switch-stock`: Match a specific dollar price near a model name; require the caption to include a stock number reference (e.g. `Stock #`, `VIN`, or `1 at this price`). Else `warn`.
- `fuel-economy-claim`: Match `\b\d{2,3}\s*MPG\b`. Require "EPA estimated" or equivalent within 50 chars. Else `block`.

#### OEM brand rules (per dealership brand)

Each rule's `applies()` checks the dealership's brand.

- `honda-logo-clearspace` (warn): Cannot verify visually here; warn if OCR detects "HONDA" adjacent to other text within 20 chars on the same line.
- `honda-tier3-restrictions` (warn): Honda dealers cannot use national tagline "The Power of Dreams" in Tier 3 ads. Match phrase, warn.
- `bmw-no-competitive-mentions` (block): BMW dealer captions cannot name competing brands (Audi, Mercedes, Lexus, etc.) in promotional context.
- `lexus-no-discount-language-on-lease` (warn): Lexus dealers should not use "discount" language on lease promotions per OEM guidelines.
- `acura-precision-crafted-trademark` (warn): If phrase "Precision Crafted Performance" appears, ensure trademark symbol present.
- `toyota-no-employee-pricing-without-event` (warn): Match "employee pricing" without a defined event window in same caption.

#### Asbury internal

- `phone-number-format` (warn): Require phone numbers to use the format `(555) 555-5555` or `555.555.5555`. Detect any phone-like sequence and flag if non-standard.
- `placeholder-tokens-unresolved` (block): If any `{{...}}` token remains after token resolution attempt, block. (Backstop for the upload-flow validator.)

### 4. Reviewer UI in /admin

- In submission detail, add a "Compliance" section above the existing caption.
- For each flag: pill colored by severity (red = block, amber = warn), rule_id, message, matched text quoted, and the suggested fix if present.
- A submission with any `block` flag shows a banner: "Cannot approve until compliance blocks are resolved." The Approve button is disabled.
- A submission with only `warn` flags can be approved; the reviewer must click an "Acknowledged" checkbox first.
- "Acknowledged" decisions are written to the audit log with the list of warnings acknowledged.

### 5. Rule administration

- Add `/admin/compliance-rules` page (Admin role only). Lists all rules with: id, severity, enabled toggle, last-modified, hit count last 30 days. Toggling enabled persists to a `compliance_rule_overrides` table; the engine checks overrides at runtime.
- Do NOT allow rule editing via UI in this command. Only enable/disable. Rule logic stays in code.

## Out of scope - do NOT

- Do NOT add user-defined rule creation via UI.
- Do NOT integrate any third-party legal-tech SaaS.
- Do NOT attempt to enforce visual brand guidelines (logo placement, color match) beyond what OCR can detect.
- Do NOT auto-rewrite captions to fix violations. Only flag and suggest.
- Do NOT translate rules to other languages here; Spanish rules ship in `/localization-spanish-hashtags`.
- Do NOT scan historical published posts retroactively in this command. Add a separate one-off script if needed later.

## Acceptance criteria

- Submitting a caption "0% APR financing available now!" with no disclosure produces a `block` flag with rule_id `apr-without-disclosure`.
- Submitting "Guaranteed approval on all credit types" produces a `block` flag.
- Submitting "Lowest prices in Atlanta!" produces a `warn` flag.
- A BMW dealer submission mentioning "better than Mercedes" produces a `block` flag from `bmw-no-competitive-mentions`.
- A Honda dealer submission containing "The Power of Dreams" produces a `warn` flag.
- OCR extracts text from an uploaded JPG with overlaid pricing text; the same rules apply to OCR text as to caption text.
- A submission with both a `block` flag and a `warn` flag cannot be approved until the block is resolved.
- Disabling the `lowest-price-superlative` rule in /admin/compliance-rules causes new submissions with that phrase to NOT flag.
- Every compliance evaluation persists to `submission.compliance_results` and is visible in /admin.

## Verification

- Write unit tests for each rule's regex/logic.
- Write an integration test that submits 10 captions covering each rule, asserts the correct flags.
- Run OCR on a test image with known overlaid text; assert extracted text matches expectations.
- Confirm the Approve button is disabled when block flags exist.
