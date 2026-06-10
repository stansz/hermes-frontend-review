# Hermes Frontend Review

A [Hermes](https://github.com/NousResearch/hermes-agent) skill that reviews any frontend against **58 anti-pattern rules** covering design quality, accessibility, security, and AI-generated slop.

## Quick Start

One command:

```bash
git clone https://github.com/stansz/hermes-frontend-review.git ~/.hermes/skills/frontend-review
```

Restart Hermes (or reload skills). Done.

### Optional: Enable Full (browser) mode

Full mode needs a BrowserBase API key for live page auditing. Quick mode works without it.

1. Sign up at [browserbase.com](https://browserbase.com) (free tier: 1,000 calls/month)
2. Copy your API key from [browserbase.com/settings](https://browserbase.com/settings)
3. Add it to your Hermes `.env` file:

```bash
echo 'BROWSERBASE_API_KEY=your-key-here' >> ~/.hermes/.env
```

Without this, only Quick mode is available — still catches ~70% of issues.

## Usage

```
review this site https://ogsapps.cc
audit my frontend /path/to/project
check the design of https://example.com
```

## Modes

When you invoke the skill, Hermes asks which mode you want:

| Mode | What it does | Time | Cost |
|------|-------------|------|------|
| 🟢 **Quick** | Source scan + LLM pattern review | ~30s | Free (just this chat) |
| 🟣 **Full** | Quick + live browser audit with screenshots | ~2-3 min | Uses browser + vision tokens |

**Quick** catches ~70% of issues. **Full** catches everything, including computed contrast ratios, responsive breakpoints, and visual AI-slop patterns.

## What It Checks

58 rules across 8 categories:

| Category | Rules | Source |
|----------|-------|--------|
| Typography | 16 | impeccable, taste-skill |
| Color & Contrast | 5 | impeccable, taste-skill |
| Layout & Space | 8 | impeccable |
| Motion | 4 | impeccable |
| Visual Details | 6 | impeccable, taste-skill |
| Copy & Content | 4 | impeccable |
| Accessibility | 13 | axe-core, WCAG |
| Security | 1 | webhint |
| Quality | 1 | impeccable, WCAG |

### Example Findings

- 🔴 **Critical**: WCAG contrast failures, broken images, missing alt text, empty buttons/links, form inputs without labels, iframes without titles, `target="_blank"` without `noopener`
- 🟠 **Warning**: Skipped heading levels, gradient text, bounce easing, nested cards, cramped padding, `z-index: 9999`, Google Fonts links in production
- 🟡 **Advisory**: Overused fonts (Inter, Roboto), AI color palettes (purple gradients), cream/beige backgrounds, em-dash overuse, marketing buzzwords, icon tile stacks

Every finding includes the file, line number, severity, and a specific fix suggestion.

## AI-Slop Score

Each review includes a 0-10 AI-Slop Score measuring originality:

- **Color palette** (0-3): How distinctive and intentional are the colors?
- **Typography** (0-3): Unique fonts or the usual Inter/Roboto defaults?
- **Layout variety** (0-2): Varied or identical card grids everywhere?
- **Copy authenticity** (0-2): Specific language or enterprise-grade buzzwords?

10/10 = pristine, human-quality design. 0/10 = textbook AI-generated template.

## Keeping Rules Current

AI models evolve and so do their tells. To check for new patterns:

```
check for new review rules
update the frontend rules
```

This fetches the latest anti-pattern registry from [impeccable](https://github.com/pbakaus/impeccable) and reports any new rules to add.

## Structure

```
frontend-review/
├── SKILL.md                    # Main skill — workflow and instructions
├── references/
│   └── rules.md                # All 58 anti-pattern rules with detection methods
└── scripts/
    ├── check-source.mjs        # Deterministic source scanner
    └── check-updates.mjs       # Diffs against impeccable's latest rules
```

## Supported Targets

| Target | Mode | What happens |
|--------|------|-------------|
| Live URL (`https://...`) | Quick or Full | BrowserBase Fetch (+ browser in Full) |
| GitHub repo (`github.com/...`) | Quick or Full | Shallow clone → source scan (+ live URL in Full) |
| Local path (`/path/to/project`) | Quick only | Source files only |

## Requirements

- Hermes agent (any version)
- Node.js (for the source scanner script)
- For Full mode: BrowserBase API key (set `BROWSERBASE_API_KEY` in Hermes `.env`) and browser tool access

## How It Works

1. **Source scanner** (`check-source.mjs`) — Runs deterministic regex checks against HTML, CSS, JSX, TSX, Vue, Svelte, and Astro files. Catches mechanical patterns: heading hierarchy, banned CSS, empty elements, duplicate IDs, etc.

2. **LLM review** — The Hermes agent reads `references/rules.md` and scans for patterns the script can't catch: visual AI-slop, layout monotony, copy quality, design system misuse.

3. **Browser audit** (Full mode only) — Navigates to the live URL, computes WCAG contrast ratios, checks responsive breakpoints, takes screenshots for visual inspection.

## Attribution

This skill incorporates anti-pattern knowledge from the following open-source projects. We're grateful to their authors.

| Project | License | What we adapted |
|---------|---------|----------------|
| [impeccable](https://github.com/pbakaus/impeccable) by Paul Bakaus | Apache 2.0 | 41 deterministic anti-pattern rules for AI-generated frontend design |
| [taste-skill](https://github.com/Leonxlnx/taste-skill) by Leon Lin | MIT | 6 design curriculum rules for typography, aesthetics, and visual details |
| [axe-core](https://github.com/dequelabs/axe-core) by Deque Labs | MPL 2.0 | 10 accessibility rules based on WCAG standards |
| [webhint](https://github.com/webhintio/hint) by webhint.io | Apache 2.0 | 1 security rule (tabnabbing prevention) |
| [Understand Anything](https://github.com/Lum1104/Understand-Anything) by Lum1104 | MIT | Hermes skill integration patterns and agent skill conventions |

All adapted rules are re-expressed in our own format. This project does not include unmodified source code from any upstream project.

## License

This skill is licensed under the MIT License. See [LICENSE](LICENSE) for details.

The rules within `references/rules.md` are adapted from multiple sources as listed in Attribution above. The original projects retain their respective licenses.
