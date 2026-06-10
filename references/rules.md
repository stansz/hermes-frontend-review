# Frontend Anti-Pattern Rules

Adapted from impeccable (41 deterministic rules) and taste-skill (design curriculum). Each rule includes detection method, severity, and fix guidance.

## Typography

### skipped-heading
**Severity:** error  
**Detection:** Parse HTML/JSX for heading tags. Flag sequences where level increases by >1 (e.g., h1→h3, h2→h4).  
**Fix:** Insert missing heading level or restructure content hierarchy.  
**Source:** impeccable #skipped-heading

### flat-type-hierarchy
**Severity:** warning  
**Detection:** Compare font-size declarations across headings. Flag if ratio between h1 and body < 2.0, or if any two adjacent heading sizes differ by < 1.15x.  
**Fix:** Use fewer sizes with more contrast. Aim for ≥ 1.25 ratio between steps.  
**Source:** impeccable #flat-type-hierarchy

### overused-font
**Severity:** advisory  
**Detection:** Grep font-family for Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk.  
**Fix:** These fonts appear on so many sites they no longer feel distinctive. Choose a face that gives personality. Exception: if the project already uses one consistently and the brand is established, this is acceptable.  
**Source:** impeccable #overused-font

### single-font
**Severity:** advisory  
**Detection:** Count unique font-family declarations. Flag if only 1 family (excluding monospace/system-ui fallbacks).  
**Fix:** Pair a distinctive display font with a refined body font for typographic hierarchy.  
**Source:** impeccable #single-font

### gradient-text
**Severity:** error  
**Detection:** Grep for `background-clip:\s*text` combined with `background:\s*linear-gradient` or `background-image:\s*linear-gradient`.  
**Fix:** Gradient text is decorative, never meaningful. Use solid color. Emphasis via weight or size.  
**Source:** impeccable #gradient-text, taste-skill

### tiny-text
**Severity:** warning  
**Detection:** Parse CSS font-size rules. Flag body/paragraph text < 14px (not applicable to captions, footnotes, or legal text where small size is conventional).  
**Fix:** Use ≥ 16px for body content. 14px minimum for secondary text.  
**Source:** impeccable #tiny-text

### all-caps-body
**Severity:** warning  
**Detection:** Find text-transform: uppercase on elements containing > 50 characters of text.  
**Fix:** Reserve uppercase for short labels and headings. Long passages in uppercase are hard to read.  
**Source:** impeccable #all-caps-body

### wide-tracking-body
**Severity:** advisory  
**Detection:** Parse CSS letter-spacing. Flag values > 0.05em on elements containing > 30 characters.  
**Fix:** Reserve wide tracking for short uppercase labels only. Body text should use default tracking.  
**Source:** impeccable #wide-tracking

### tight-leading
**Severity:** warning  
**Detection:** Parse CSS line-height. Flag values < 1.3 (unitless) on paragraph text.  
**Fix:** Use 1.5-1.7 for body text. 1.3 is the floor.  
**Source:** impeccable #tight-leading

### line-length
**Severity:** warning  
**Detection:** Flag text containers with width > 80ch equivalent (approximately > 720px at 16px).  
**Fix:** Cap at 65-75ch. Add max-width to text containers.  
**Source:** impeccable #line-length

### oversized-h1
**Severity:** advisory  
**Detection:** Find h1 elements with font-size > 6rem (~96px).  
**Fix:** Cap display headings at 6rem. A long headline at display size dominates the viewport.  
**Source:** impeccable #oversized-h1

### extreme-negative-tracking
**Severity:** warning  
**Detection:** Parse CSS letter-spacing. Flag values < -0.04em on any element.  
**Fix:** Characters touch below -0.04em. Tighten optically, not destructively.  
**Source:** impeccable #extreme-negative-tracking

### italic-serif-display-hero
**Severity:** advisory  
**Detection:** LLM review — is the primary hero headline an oversized italic serif (Fraunces, Recoleta, Playfair, Newsreader-italic)?  
**Fix:** Set roman, or move to a non-serif display face. This is the universal AI-startup landing page hero. Exception: editorial/magazine context may legitimately want this.  
**Source:** impeccable #italic-serif-display

### hero-eyebrow-chip
**Severity:** advisory  
**Detection:** LLM review — is there a tiny uppercase letter-spaced label above the hero headline, or a pill chip serving the same function?  
**Fix:** Drop the eyebrow, integrate the kicker into the headline, or run it as navigation breadcrumb instead.  
**Source:** impeccable #hero-eyebrow-chip

### repeated-section-kickers
**Severity:** advisory  
**Detection:** LLM review — do 3+ sections have tiny uppercase tracked labels above their headings?  
**Fix:** Replace with stronger structure, artifacts, imagery, or a deliberate brand system.  
**Source:** impeccable #repeated-section-kickers

### numbered-section-markers
**Severity:** advisory  
**Detection:** LLM review — do sections use "01 / 02 / 03" markers as default scaffolding?  
**Fix:** Numbers earn their place when the section actually IS a sequence. Otherwise, choose a different cadence.  
**Source:** impeccable #numbered-section-markers

### justified-text
**Severity:** warning  
**Detection:** Grep for `text-align:\s*justify` without `hyphens:\s*auto`.  
**Fix:** Use text-align: left for body text, or enable hyphens: auto if you must justify.  
**Source:** impeccable #justified-text

## Color & Contrast

### gray-on-color
**Severity:** error  
**Detection:** Parse CSS — text color with saturation < 5% on a background with saturation > 20% or lightness < 80%.  
**Fix:** Use a darker shade of the background hue, or white/near-white for contrast.  
**Source:** impeccable #gray-on-color

### low-contrast
**Severity:** error  
**Detection:** Browser mode: compute WCAG contrast. Source mode: flag suspicious combos (light gray text on near-white, etc.) with a note to verify visually.  
**Fix:** Body text must hit ≥ 4.5:1, large text ≥ 3:1.  
**Source:** impeccable #low-contrast

### ai-color-palette
**Severity:** advisory  
**Detection:** Grep for purple/violet hex values (#8B5CF6, #7C3AED, #A855F7, #C084FC) or cyan-on-dark combos.  
**Fix:** Purple gradients and cyan-on-dark are the most recognizable tells of AI-generated UIs. Choose a distinctive, intentional palette.  
**Source:** impeccable #ai-color-palette

### cream-palette
**Severity:** advisory  
**Detection:** Grep for warm near-white backgrounds: hex #FFF8F0 through #FFF5E6, #FEF9F0, #FFFAF5, #FDFBF7, or OKLCH L 0.84-0.97 C < 0.06 hue 40-100. Also flag token names like `--cream`, `--sand`, `--paper`, `--bone`, `--flour`, `--linen`, `--parchment`, `--wheat`, `--biscuit`, `--ivory`.  
**Fix:** The warm off-white body bg is the saturated AI default of 2026. Choose a deliberate palette — saturated brand color, true off-white (chroma 0), or darker mid-tone neutral.  
**Source:** impeccable #cream-palette, taste-skill

### dark-glow
**Severity:** advisory  
**Detection:** Grep for dark backgrounds (#0a0a0a, #111, #000) combined with colored box-shadow with blur > 10px.  
**Fix:** Dark backgrounds with colored glows are the default "cool" AI look. Use subtle, purposeful lighting or skip dark theme entirely.  
**Source:** impeccable #dark-glow

## Layout & Space

### nested-cards
**Severity:** warning  
**Detection:** Parse JSX/HTML — find elements with card-like classes (card, .card, [class*="card"]) nested > 2 levels deep in containers that also have card-like styling.  
**Fix:** Cards inside cards create visual noise. Flatten the hierarchy — use spacing, typography, dividers.  
**Source:** impeccable #nested-cards, taste-skill

### monotonous-spacing
**Severity:** advisory  
**Detection:** Count unique padding/margin values. Flag if > 80% of spacing values are identical.  
**Fix:** Vary spacing for rhythm. Tight groupings for related items, generous separations between sections.  
**Source:** impeccable #monotonous-spacing

### cramped-padding
**Severity:** warning  
**Detection:** Parse CSS — find elements with border/outline/background AND padding < 8px.  
**Fix:** Add at least 12-16px padding inside bordered or colored containers.  
**Source:** impeccable #cramped-padding

### body-text-viewport-edge
**Severity:** warning  
**Detection:** Parse HTML — find text content in containers without horizontal padding at root level.  
**Fix:** Wrap content in container with ≥ 16px horizontal padding, or apply max-width with mx-auto.  
**Source:** impeccable #body-text-viewport-edge

### text-overflow
**Severity:** error  
**Detection:** Browser mode: check for horizontal scrollbars or content exceeding container width. Source mode: flag long unbroken strings in narrow containers.  
**Fix:** Let text wrap, constrain widths, or give deliberate scroll affordance.  
**Source:** impeccable #text-overflow

### clipped-overflow-container
**Severity:** warning  
**Detection:** Parse CSS — find overflow: hidden on containers that have absolutely-positioned children.  
**Fix:** Let overflow be visible, or move positioned layer out of the clip. Native `<dialog>`/popover API preferred.  
**Source:** impeccable #clipped-overflow-container

### body-text-viewport-edge
**Severity:** warning  
**Detection:** Browser mode: check computed padding on root content container at mobile viewport.  
**Fix:** Add ≥ 16px horizontal padding. Content touching viewport edge feels broken.  
**Source:** impeccable #body-text-viewport-edge

### z-index-chaos
**Severity:** warning  
**Detection:** Grep for z-index values > 100 or arbitrary values like 999, 9999, 99999.  
**Fix:** Build semantic scale: dropdown(100) → sticky(200) → modal-backdrop(300) → modal(400) → toast(500) → tooltip(600).  
**Source:** impeccable SKILL.md semantic z-index rule

## Motion

### bounce-easing
**Severity:** warning  
**Detection:** Grep for `cubic-bezier` with values that produce bounce/elastic curves, or keywords like `ease-in-out` on elements that suggest animation (transform, animate, @keyframes). Also flag GSAP `elastic`, `bounce`, `back` ease types.  
**Fix:** Use exponential easing (ease-out-quart/quint/expo). Real objects decelerate smoothly.  
**Source:** impeccable #bounce-easing

### layout-transition
**Severity:** error  
**Detection:** Grep for `transition` or `animation` on width, height, padding, margin, top, left, right, bottom properties.  
**Fix:** Animate transform and opacity instead. Use grid-template-rows for height animations. Layout property animation causes thrash.  
**Source:** impeccable #layout-transition

### image-hover-transform
**Severity:** advisory  
**Detection:** Grep for `:hover` combined with `transform:\s*scale` or `transform:\s*rotate` on img elements.  
**Fix:** Let imagery sit still, or use subtler, purposeful interaction.  
**Source:** impeccable #image-hover-transform (Gemini-gated)

### reduced-motion-missing
**Severity:** error  
**Detection:** Check for `@media (prefers-reduced-motion: reduce)` if animations/transitions are present.  
**Fix:** Every animation needs a reduced-motion alternative (crossfade or instant transition). Not optional.  
**Source:** impeccable SKILL.md motion rules

## Visual Details

### side-tab-border
**Severity:** advisory  
**Detection:** Grep for `border-left` or `border-right` with width > 1px AND color that differs from surrounding borders.  
**Fix:** The most recognizable tell of AI-generated UIs. Use full borders, background tints, or nothing.  
**Source:** impeccable #side-tab

### border-accent-on-rounded
**Severity:** advisory  
**Detection:** Parse CSS — find elements with border-radius > 4px AND thick colored border (>2px).  
**Fix:** The border clashes with rounded corners. Remove one or the other.  
**Source:** impeccable #border-accent-on-rounded

### icon-tile-stack
**Severity:** advisory  
**Detection:** LLM review — are there small rounded-square icon containers above headings throughout the page?  
**Fix:** Try side-by-side icon and heading, or let icon sit in flow without its own container. This is the universal AI feature-card template.  
**Source:** impeccable #icon-tile-stack

### identical-card-grids
**Severity:** advisory  
**Detection:** LLM review — are there 3+ cards in a grid with identical structure (icon + heading + text)?  
**Fix:** Vary card layouts or use a different content presentation. Same-sized identical cards are the AI default.  
**Source:** impeccable, taste-skill "Anti-Default Discipline"

### gpt-thin-border-wide-shadow
**Severity:** advisory  
**Detection:** Parse CSS — find elements with border-width: 1px (or hairline) AND box-shadow with blur-radius > 10px.  
**Fix:** Commit to one — defined edge or soft elevation — not both.  
**Source:** impeccable #gpt-thin-border-wide-shadow (GPT-gated)

### repeating-stripes-gradient
**Severity:** advisory  
**Detection:** Grep for `repeating-linear-gradient` or `repeating-radial-gradient` used as surface decoration.  
**Fix:** Reach for deliberate texture or leave surface plain.  
**Source:** impeccable #repeating-stripes-gradient (GPT-gated)

## Copy & Content

### em-dash-overuse
**Severity:** advisory  
**Detection:** Count em-dashes (—, `&mdash;`, `\u2014`) in body copy. Flag if > 2 in any single text block.  
**Fix:** Use commas, colons, periods, or parentheses instead. Em-dash cadence is an AI tell.  
**Source:** impeccable #em-dash-overuse, taste-skill em-dash ban

### marketing-buzzword
**Severity:** advisory  
**Detection:** Grep for: streamline, empower, supercharge, world-class, enterprise-grade, next-generation, cutting-edge, best-in-class, game-changing, revolutionary, innovative, disrupting, leverage, robust, seamless, scalable, cutting edge.  
**Fix:** Pick a specific verb and noun that says what the product literally does.  
**Source:** impeccable #marketing-buzzword

### aphoristic-cadence
**Severity:** advisory  
**Detection:** LLM review — do 3+ sections end with a short rebuttal sentence ("X. No Y." / "X. Just Y.") or manufactured-contrast aphorism ("Not a feature. A platform.")?  
**Fix:** Once is fine. The pattern is the tell.  
**Source:** impeccable #aphoristic-cadence

### theater-slop-phrase
**Severity:** advisory  
**Detection:** Grep for "theater" used dismissively in copy.  
**Fix:** Say plainly what the thing does or does not do.  
**Source:** impeccable #theater-slop-phrase (GPT-gated)

## Quality

### broken-image
**Severity:** error  
**Detection:** Grep for `<img` tags with empty src, missing src, src="#", src="/placeholder", or src containing "placeholder".  
**Fix:** Use real images, generated assets, or remove the tag.  
**Source:** impeccable #broken-image

### missing-alt-text
**Severity:** error  
**Detection:** Find `<img` tags without alt attribute (not alt=""). alt="" is valid for decorative images. Missing alt entirely is not.  
**Fix:** Add descriptive alt text, or alt="" for decorative images.  
**Source:** Web standard / WCAG

### font-link-in-production
**Severity:** warning  
**Detection:** Grep for `<link` tags pointing to fonts.googleapis.com or fonts.gstatic.com.  
**Fix:** Use next/font (Next.js) or self-host with @font-face + font-display: swap. External font links hurt performance.  
**Source:** taste-skill font rule

### deprecated-icon-lucide
**Severity:** advisory  
**Detection:** Detect lucide-react in imports.  
**Fix:** Consider @phosphor-icons/react, hugeicons-react, @radix-ui/react-icons, or @tabler/icons-react instead. Only flag if the project doesn't already depend on it.  
**Source:** taste-skill icon policy

## Accessibility

### button-name
**Severity:** error  
**Detection:** Grep for `<button` tags that contain no text content (only icons, empty, or just whitespace) and no `aria-label` or `aria-labelledby`.  
**Fix:** Every button must have discernible text — via text content, aria-label, or aria-labelledby. Screen readers announce nothing otherwise.  
**Source:** axe-core #button-name (WCAG 4.1.2)

### link-name
**Severity:** error  
**Detection:** Find `<a>` tags with `href` that contain no text (just an icon/img without alt, or empty). Check for `aria-label` or `aria-labelledby` as valid alternatives.  
**Fix:** Every link must have discernible text. Icons-only links need aria-label.  
**Source:** axe-core #link-name (WCAG 2.4.4, 4.1.2)

### label
**Severity:** error  
**Detection:** Find `<input>`, `<select>`, `<textarea>` elements without an associated `<label>` (via `for`/`id` or wrapping). Check for `aria-label` or `aria-labelledby` as alternatives.  
**Fix:** Every form control needs an accessible name. Wrap in `<label>` or use `aria-label`.  
**Source:** axe-core #label (WCAG 4.1.2)

### html-has-lang
**Severity:** error  
**Detection:** Check if `<html>` element has a `lang` attribute.  
**Fix:** Add `lang="en"` (or appropriate language code) to the html element. Required for screen reader pronunciation.  
**Source:** axe-core #html-has-lang (WCAG 3.1.1)

### html-lang-valid
**Severity:** warning  
**Detection:** Verify the lang attribute on `<html>` is a valid BCP 47 language tag (e.g., "en", "fr", "zh-CN").  
**Fix:** Use a valid language code. "en-US" is valid; "english" is not.  
**Source:** axe-core #html-lang-valid (WCAG 3.1.1)

### meta-viewport
**Severity:** error  
**Detection:** Check `<meta name="viewport">` for `user-scalable=no`, `maximum-scale=1.0`, or `maximum-scale` less than 2.  
**Fix:** Remove user-scalable=no and maximum-scale restrictions. Users must be able to zoom.  
**Source:** axe-core #meta-viewport (WCAG 1.4.4)

### list-structure
**Severity:** warning  
**Detection:** Find `<li>` elements that are not direct children of `<ul>` or `<ol>`. Also flag `<ul>`/`<ol>` containing non-`<li>` children.  
**Fix:** All list items must be direct children of a list. Lists must only contain list items.  
**Source:** axe-core #list, #listitem (WCAG 1.3.1)

### tabindex-positive
**Severity:** warning  
**Detection:** Grep for `tabindex` values > 0.  
**Fix:** Positive tabindex creates a custom tab order that diverges from DOM order, confusing keyboard users. Use tabindex="0" (natural order) or tabindex="-1" (programmatic focus only).  
**Source:** axe-core #tabindex (WCAG 2.4.3)

### frame-title
**Severity:** error  
**Detection:** Find `<iframe>` elements without a `title` attribute.  
**Fix:** Every iframe needs a title describing its content (e.g., title="YouTube video player"). Screen readers use it for navigation.  
**Source:** axe-core #frame-title (WCAG 4.1.2)

### nested-interactive
**Severity:** error  
**Detection:** Find interactive elements nested inside other interactive elements (e.g., `<button>` inside `<a>`, `<a>` inside `<button>`).  
**Fix:** Never nest interactive controls. Screen readers can't reliably announce the nested state.  
**Source:** axe-core #nested-interactive (WCAG 4.1.2)

### duplicate-id
**Severity:** error  
**Detection:** Check for duplicate `id` attribute values across the document.  
**Fix:** Every id must be unique. Duplicates break label associations, ARIA references, and anchor links.  
**Source:** axe-core #duplicate-id-aria (WCAG 4.1.2)

## Security

### noopener
**Severity:** warning  
**Detection:** Find `<a target="_blank">` without `rel="noopener noreferrer"`.  
**Fix:** Always add `rel="noopener noreferrer"` to `target="_blank"` links. Without it, the opened page can access `window.opener` and potentially redirect your page (tabnabbing).  
**Source:** webhint #disown-opener
