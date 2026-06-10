---
name: frontend-review
description: Review a frontend — any website, landing page, web app, or repo. Audit design quality, catch AI-generated slop, check accessibility, review CSS/HTML, find broken patterns. Trigger on: "review this site", "audit my frontend", "check the design", "frontend review", "review this page", "check for AI slop", "is this accessible", "audit the homepage", "design QA", "check my CSS", "review the landing page"
argument-hint: "<url or path>"
---

# Frontend Review

Review any frontend against 40+ anti-pattern rules adapted from impeccable and taste-skill. Catches mechanical failures (contrast, hierarchy, overflow) and AI-slop tells (gradient text, nested cards, cream backgrounds, em-dash overuse).

## Entry Points

```
/review-frontend https://mysite.com          → prompt: quick or full?
/review-frontend https://github.com/user/repo → clone + prompt: quick or full?
/review-frontend /path/to/local/dir           → source checks only (no live URL to hit)
```

If no URL is provided, ask what to review.

## Phase 0 — Ask: Quick or Full?

**Before doing any work, ask the user which mode they want.** Don't assume. Don't default. Present the choice clearly:

> "I can review this two ways:
> 
> **🟢 Quick** — Source scan + LLM pattern review (~30s, no token cost beyond this chat). Catches ~70% of issues: heading hierarchy, banned CSS patterns, buzzwords, broken images, font issues.
> 
> **🟣 Full** — Everything in Quick + live browser audit with screenshots (~2-3 min, uses browser + vision tokens). Catches 100%: computed contrast ratios, responsive breakpoints, visual AI-slop, layout integrity.
> 
> Quick or full?"

Wait for the user's answer before proceeding.

**Skip the prompt** if:
- The target is a local path with no live URL → auto-select Quick
- The user already said "full review" or "quick review" in their message

## Phase 1 — Source Checks (Both Modes)

Run against HTML, CSS, JSX, TSX, Vue, Svelte, and Astro files. Skip `node_modules/`, `.git/`, `dist/`, `build/`, `.next/`, `coverage/`.

### 1A — Deterministic Checks (terminal)

Run `node ~/.hermes/skills/frontend-review/scripts/check-source.mjs <target_dir>` for mechanical checks. This script returns JSON:

```json
{
  "findings": [
    {
      "rule": "skipped-heading",
      "severity": "error",
      "file": "src/pages/pricing.astro",
      "line": 45,
      "detail": "h1 → h3 skip (no h2 found)",
      "fix": "Change <h3> to <h2> or insert an h2 before line 45"
    }
  ],
  "summary": {"errors": 3, "warnings": 7, "advisories": 4}
}
}
```

### 1B — LLM Pattern Review

After deterministic checks, read the rules reference at `~/.hermes/skills/frontend-review/references/rules.md` and scan the source for patterns the script can't catch:

- AI-slop layout patterns (identical card grids, centered hero over dark mesh, icon tile above every heading, hero eyebrow/pill chip)
- Copy quality (em-dash count > 2 in body, marketing buzzwords, aphoristic cadence)
- Design system misuse (mixing icon libraries, overused fonts, single-font everything)
- Color palette tells (purple gradients, cyan-on-dark, cream/sand/beige backgrounds)

For each pattern found, note the file, line, severity, and a fix suggestion. Use the severity tiers from `references/rules.md`.

## Phase 2 — Browser Checks 🟣 Full Mode Only

**Skip this entire phase if the user chose Quick mode.** Only run in Full mode or if target is a live URL and user explicitly asked for visual checks.

### 2A — Browserbase Fetch

Fetch the page HTML to verify what the framework actually outputs:

```bash
curl -s -X POST "https://api.browserbase.com/v1/fetch" \
  -H "Content-Type: application/json" \
  -H "X-BB-API-Key: $BROWSERBASE_API_KEY" \
  -d "{\"url\": \"$TARGET_URL\", \"proxies\": true}" \
  -o /tmp/frontend-review-fetch.json
```

Parse the content and re-run Phase 1 checks against the rendered HTML. This catches what server-side frameworks output vs what's in source files.

### 2B — Browser Session

Use `browser_navigate` to load the page, then:

1. **Contrast audit**: Run JS in browser_console to compute WCAG contrast ratios:
```javascript
function getContrastRatio(rgb1, rgb2) {
  const lum = (c) => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4 }); return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2] };
  const l1 = lum(rgb1), l2 = lum(rgb2);
  return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
}
// Check all text elements against their computed background
```

2. **Responsive checks**: Resize viewport to 375px (mobile), 768px (tablet), 1280px (desktop). Check for:
   - Horizontal scrollbars at any breakpoint
   - Text overflowing containers
   - Touch targets < 44px

3. **Layout integrity**: Check for:
   - z-index values > 100 or arbitrary values (999, 9999)
   - Fixed positioning at mobile breakpoints
   - Overflow: hidden containers with positioned children

### 2C — Visual Audit

Use `browser_vision` to take screenshots at each breakpoint. Inspect for:

- **AI-slop tells**: Purple/violet gradients, centered hero over dark mesh, three identical feature cards, gradient text on headings, nested card city, cream/beige page background, dark mode with glowing accents, side-tab accent borders, icon tiles above every heading
- **Layout problems**: Monotonous spacing, cards where they shouldn't be, cramped sections
- **Typography issues**: Oversized hero headlines, italic serif display hero, flat type hierarchy
- **Motion problems**: (if animated) bounce/elastic easing

For each visual finding, include the screenshot path so the user can see it. Use `vision_analyze` with specific questions: "Does this page have a centered hero over a dark mesh background? Are there three identical feature cards? Is this using a purple-to-blue gradient?"

## Phase 3 — Report

Compile all findings from Phases 1 and 2 into a structured report.

### Report Format

```markdown
# Frontend Review: <target>

**Reviewed**: <url or path>
**Mode**: <Quick | Full>
**Date**: <timestamp>

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟠 Warning | X |
| 🟡 Advisory | X |

## Findings

### 🔴 Critical (must fix)

| # | Rule | Location | Issue | Fix |
|---|------|----------|-------|-----|
| 1 | ... | file:line | ... | ... |

### 🟠 Warnings (should fix)

...

### 🟡 Advisories (consider fixing)

...

## Visual Evidence

[Screenshot references from browser_vision, if any]

## AI-Slop Score: X/10

10 = pristine, human-quality design. 0 = textbook AI-generated template.

Criteria:
- Color palette originality (0-3)
- Typography distinctiveness (0-3)
- Layout variety (0-2)
- Copy authenticity (0-2)
```

## Severity Tiers

| Tier | Label | Criteria | User should... |
|------|-------|----------|----------------|
| error | 🔴 Critical | WCAG fails, broken layout, missing content | Fix before deploy |
| warning | 🟠 Warning | Poor UX, accessibility concerns, slop tells | Fix in next iteration |
| advisory | 🟡 Advisory | Style preferences, minor improvements | Consider, not urgent |

## Notes

- **Never fabricate findings.** If a check can't be verified (e.g., contrast ratio in Quick mode), note it as unverified rather than guessing.
- **Context matters.** Some rules are conditional — "single font everywhere" may be intentional. When uncertain, flag as advisory and explain.
- **Quick mode is fast and free.** No browser, no Fetch API calls, no screenshots. Just source scan + LLM review.
- **Full mode uses resources.** BrowserBase Fetch (free tier: 1,000 calls), browser sessions (token cost), and vision analysis. Worth it for comprehensive audit of a live page.
- **Every finding must have a fix suggestion.** "The heading is wrong" is useless. "Change h3 to h2 at src/pages/pricing.astro:45" is useful.

## Installation

This skill is available as a standalone repo for any Hermes user:

```bash
git clone https://github.com/stansz/hermes-frontend-review.git ~/.hermes/skills/frontend-review
```

### Full Mode Setup (Optional)

Full mode (browser audit with screenshots) requires a BrowserBase API key. Quick mode works without it.

1. Sign up at [browserbase.com](https://browserbase.com) (free tier: 1,000 calls/month)
2. Get your API key from Settings → [browserbase.com/settings](https://browserbase.com/settings)
3. Add to `~/.hermes/.env`:

```
BROWSERBASE_API_KEY=your-key-here
```

Without this, Hermes will only offer Quick mode — still 70% coverage.

## Keeping Rules Current

AI models evolve and so do their tells. Impeccable's antipattern registry is actively maintained. To check for new rules:

```bash
node ~/.hermes/skills/frontend-review/scripts/check-updates.mjs
```

This fetches the latest `antipatterns.mjs` from `pbakaus/impeccable` and reports any rules not yet in our `references/rules.md`. If new rules are found, the agent should offer to add them.

**When to check:** The user says "check for new review rules", "update the frontend rules", "any new AI patterns?", or periodically (every 2-4 weeks).
