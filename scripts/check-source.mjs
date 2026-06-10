#!/usr/bin/env node

/**
 * check-source.mjs — Deterministic frontend anti-pattern scanner
 *
 * Scans HTML, CSS, JSX, TSX, Vue, Svelte, Astro files for mechanical
 * design issues. Outputs JSON findings + summary.
 *
 * Usage: node check-source.mjs <target_dir>
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename, relative } from 'path';

const TARGET = process.argv[2] || '.';
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '__pycache__', 'venv', '.venv']);
const FRONTEND_EXTS = new Set(['.html', '.css', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.scss', '.less', '.mjs', '.js', '.ts', '.md', '.mdx']);

// Regex patterns for each check
const CHECKS = [
  // ── Heading hierarchy ──
  {
    id: 'skipped-heading',
    severity: 'error',
    category: 'typography',
    name: 'Skipped heading level',
    description: 'Heading levels should not skip (e.g. h1 then h3 with no h2)',
    fix: 'Insert the missing heading level between the gap',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx', '.md'].includes(ext)) return [];
      const findings = [];
      const headingRe = /<\/?h([1-6])\b[^>]*>/gi;
      const levels = [];
      let m;
      while ((m = headingRe.exec(content)) !== null) {
        const level = parseInt(m[1]);
        if (m[0].startsWith('</')) continue;
        levels.push({ level, pos: m.index, tag: m[0] });
      }
      for (let i = 1; i < levels.length; i++) {
        if (levels[i].level > levels[i-1].level + 1) {
          const line = content.substring(0, levels[i].pos).split('\n').length;
          findings.push({
            rule: 'skipped-heading',
            severity: 'error',
            line,
            detail: `h${levels[i-1].level} → h${levels[i].level} skip (no h${levels[i].level - 1} found)`,
            fix: `Insert an h${levels[i].level - 1} before this heading`
          });
        }
      }
      return findings;
    }
  },

  // ── Gradient text ──
  {
    id: 'gradient-text',
    severity: 'error',
    category: 'typography',
    name: 'Gradient text',
    description: 'background-clip: text with gradient background — decorative, never meaningful',
    fix: 'Use a solid color for text. Emphasis via weight or size.',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less', '.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const hasBgClip = /background-clip\s*:\s*text/gi.test(content);
      const hasGradientBg = /background\s*:\s*linear-gradient|background-image\s*:\s*linear-gradient/gi.test(content);
      if (hasBgClip && hasGradientBg) {
        // Find line numbers
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (/background-clip\s*:\s*text/gi.test(lines[i])) {
            findings.push({
              rule: 'gradient-text',
              severity: 'error',
              line: i + 1,
              detail: 'Gradient text found — decorative, not meaningful',
              fix: 'Replace with solid color. Emphasis should be conveyed through weight or size, not gradient.'
            });
          }
        }
      }
      return findings;
    }
  },

  // ── Overused fonts ──
  {
    id: 'overused-font',
    severity: 'advisory',
    category: 'typography',
    name: 'Overused font',
    description: 'Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, Space Grotesk are used on so many sites they no longer feel distinctive',
    fix: 'Choose a face that gives your interface personality.',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less', '.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const overused = ['Inter', 'Roboto', 'Fraunces', 'Geist', 'Plus Jakarta Sans', 'Space Grotesk'];
      const findings = [];
      for (const font of overused) {
        const re = new RegExp(`font-family\\s*:[^;]*${font}`, 'gi');
        let m;
        while ((m = re.exec(content)) !== null) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'overused-font',
            severity: 'advisory',
            line,
            detail: `Overused font "${font}" found`,
            fix: `Consider replacing ${font} with a more distinctive typeface`
          });
        }
      }
      return findings.slice(0, 3); // Don't spam for a project using an overused font
    }
  },

  // ── Single font ──
  {
    id: 'single-font',
    severity: 'advisory',
    category: 'typography',
    name: 'Single font for everything',
    description: 'Only one font family used for the entire page',
    fix: 'Pair a distinctive display font with a refined body font',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const fonts = new Set();
      const fontRe = /font-family\s*:\s*([^;{]+)/gi;
      let m;
      while ((m = fontRe.exec(content)) !== null) {
        const families = m[1].split(',').map(f => f.trim().replace(/['"]/g, ''));
        for (const f of families) {
          // Skip generic fallbacks
          if (/^(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|inherit|initial|unset)$/i.test(f)) continue;
          if (f) fonts.add(f.toLowerCase());
        }
      }
      // We can't reliably detect "single font" from one file — this is a whole-project check
      // Store state and evaluate after all files scanned
      if (!this._singleFontProjects) this._singleFontProjects = new Map();
      const rel = relative(TARGET, file);
      const proj = rel.split('/')[0] || '.';
      if (!this._singleFontProjects.has(proj)) this._singleFontProjects.set(proj, new Set());
      for (const f of fonts) this._singleFontProjects.get(proj).add(f);
      return [];
    }
  },

  // ── Bounce easing ──
  {
    id: 'bounce-easing',
    severity: 'warning',
    category: 'motion',
    name: 'Bounce or elastic easing',
    description: 'Bounce and elastic easing feel dated and tacky',
    fix: 'Use exponential easing (ease-out-quart/quint/expo)',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const bounceRe = /cubic-bezier\s*\(\s*[^)]*(?:0\.(?:[89]|1\d)|1\.\d)[^)]*\)|elastic|bounce|back\s*\(/gi;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (bounceRe.test(lines[i])) {
          findings.push({
            rule: 'bounce-easing',
            severity: 'warning',
            line: i + 1,
            detail: 'Bounce/elastic easing detected',
            fix: 'Replace with exponential easing: cubic-bezier(0.16, 1, 0.3, 1) or ease-out-expo'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Layout property animation ──
  {
    id: 'layout-transition',
    severity: 'error',
    category: 'motion',
    name: 'Layout property animation',
    description: 'Animating width, height, padding, or margin causes layout thrash',
    fix: 'Use transform and opacity instead',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const layoutProps = ['width', 'height', 'padding', 'margin', 'top', 'left', 'right', 'bottom'];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/\btransition\b/.test(lines[i]) || /\banimation\b/.test(lines[i])) {
          for (const prop of layoutProps) {
            if (new RegExp(`\\b${prop}\\b`).test(lines[i])) {
              findings.push({
                rule: 'layout-transition',
                severity: 'error',
                line: i + 1,
                detail: `Transition/animation on layout property "${prop}" detected`,
                fix: 'Animate transform and opacity instead. Use grid-template-rows for height animations.'
              });
            }
          }
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Z-index chaos ──
  {
    id: 'z-index-chaos',
    severity: 'warning',
    category: 'layout',
    name: 'Arbitrary z-index values',
    description: 'z-index values > 100 or arbitrary values like 999, 9999',
    fix: 'Build a semantic z-index scale: dropdown(100) → sticky(200) → modal(300) → toast(400) → tooltip(500)',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const zRe = /z-index\s*:\s*(\d+)/gi;
      let m;
      while ((m = zRe.exec(content)) !== null) {
        const val = parseInt(m[1]);
        if (val > 100 && val % 100 !== 0 && val !== 101) { // Allow clean hundreds
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'z-index-chaos',
            severity: 'warning',
            line,
            detail: `Arbitrary z-index: ${val}`,
            fix: 'Use a semantic scale. z-index: 999 is never the right answer.'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Tiny text ──
  {
    id: 'tiny-text',
    severity: 'warning',
    category: 'typography',
    name: 'Body text too small',
    description: 'Body text below 14px is hard to read',
    fix: 'Use at least 14px for body content, ideally 16px',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const fontSizeMatch = lines[i].match(/font-size\s*:\s*(\d+)px/);
        if (fontSizeMatch && parseInt(fontSizeMatch[1]) < 14) {
          // Check if this line is for body/paragraph text (heuristic)
          const context = content.substring(0, content.indexOf(lines[i])).split('\n').slice(-3).join(' ');
          if (/body|p\b|paragraph|text\b|root|html/.test(context.toLowerCase())) {
            findings.push({
              rule: 'tiny-text',
              severity: 'warning',
              line: i + 1,
              detail: `Body text font-size: ${fontSizeMatch[1]}px`,
              fix: 'Increase to at least 14px, ideally 16px for body content'
            });
          }
        }
      }
      return findings.slice(0, 3);
    }
  },

  // ── Justified text without hyphenation ──
  {
    id: 'justified-text',
    severity: 'warning',
    category: 'typography',
    name: 'Justified text without hyphenation',
    description: 'Justified text without hyphens: auto creates uneven word spacing',
    fix: 'Use text-align: left for body text, or add hyphens: auto',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const lines = content.split('\n');
      let inBlock = false;
      for (let i = 0; i < lines.length; i++) {
        if (/\btext-align\s*:\s*justify\b/.test(lines[i])) {
          inBlock = true;
        }
        if (inBlock && /\bhyphens\s*:\s*auto\b/.test(lines[i])) {
          inBlock = false;
        }
        if (inBlock && lines[i].trim() === '}') {
          findings.push({
            rule: 'justified-text',
            severity: 'warning',
            line: i + 1,
            detail: 'Justified text without hyphens: auto',
            fix: 'Change to text-align: left or add hyphens: auto'
          });
          inBlock = false;
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── AI color palette ──
  {
    id: 'ai-color-palette',
    severity: 'advisory',
    category: 'color',
    name: 'AI color palette',
    description: 'Purple/violet gradients and cyan-on-dark are AI tells',
    fix: 'Choose a distinctive, intentional palette',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less', '.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const purpleRe = /#(?:8B5CF6|7C3AED|A855F7|C084FC|9333EA|6D28D9|7E22CE|581C87|3B0764)[\s;),]/gi;
      if (purpleRe.test(content)) {
        const line = content.substring(0, content.search(purpleRe)).split('\n').length;
        findings.push({
          rule: 'ai-color-palette',
          severity: 'advisory',
          line,
          detail: 'Purple/violet color found — common AI-generated UI tell',
          fix: 'Unless purple is your deliberate brand color, choose a distinctive, intentional palette'
        });
      }
      return findings.slice(0, 2);
    }
  },

  // ── Cream/beige background ──
  {
    id: 'cream-palette',
    severity: 'advisory',
    category: 'color',
    name: 'Cream / beige palette',
    description: 'Warm off-white body background is the saturated AI default',
    fix: 'Choose a deliberate palette — saturated brand color, true off-white, or darker neutral',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const creamRe = /#(?:FF[EF]|F[EF]|FD[FE])(?:F[0-9A-F]|[0-9A-F]{1,2})|#[Ff]{2}[89AB][0-9A-F]{2}/gi;
      // Also check for cream/sand token names
      const tokenRe = /--(?:cream|sand|paper|bone|flour|linen|parchment|wheat|biscuit|ivory)\b/gi;
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (creamRe.test(lines[i]) && /\bbackground/.test(lines[i])) {
          findings.push({
            rule: 'cream-palette',
            severity: 'advisory',
            line: i + 1,
            detail: 'Cream/beige background detected',
            fix: 'The warm off-white body bg is the saturated AI default. Choose a deliberate palette.'
          });
        }
        if (tokenRe.test(lines[i])) {
          findings.push({
            rule: 'cream-palette',
            severity: 'advisory',
            line: i + 1,
            detail: `Cream/sand token name "${lines[i].trim()}" found`,
            fix: 'Choose a deliberate palette. Token names like --cream, --sand are tells.'
          });
        }
      }
      return findings.slice(0, 3);
    }
  },

  // ── Nested cards ──
  {
    id: 'nested-cards',
    severity: 'warning',
    category: 'layout',
    name: 'Nested cards',
    description: 'Cards inside cards create visual noise',
    fix: 'Flatten the hierarchy — use spacing, typography, and dividers instead',
    check(file, content, ext) {
      if (!['.jsx', '.tsx', '.vue', '.svelte', '.astro', '.html'].includes(ext)) return [];
      const lines = content.split('\n');
      let maxNesting = 0;
      let currentNesting = 0;
      let lastOpen = 0;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        // Heuristic: count card-like components
        if (/<Card|<[A-Z]\w*Card|className="[^"]*card[^"]*"/i.test(trimmed)) {
          // Check for self-closing or opening tags
          if (trimmed.includes('/>')) continue;
          if (!trimmed.startsWith('</')) {
            currentNesting++;
            maxNesting = Math.max(maxNesting, currentNesting);
          }
        }
        if (/<\/Card|<\/[A-Z]\w*Card/i.test(trimmed)) {
          currentNesting = Math.max(0, currentNesting - 1);
        }
      }
      if (maxNesting > 2) {
        return [{
          rule: 'nested-cards',
          severity: 'warning',
          line: 1,
          detail: `Cards nested ${maxNesting} levels deep detected in ${basename(file)}`,
          fix: 'Flatten the hierarchy. Nested cards create visual noise — use spacing and dividers instead.'
        }];
      }
      return [];
    }
  },

  // ── Em-dash overuse ──
  {
    id: 'em-dash-overuse',
    severity: 'advisory',
    category: 'copy',
    name: 'Em-dash overuse',
    description: 'More than 2 em-dashes in body copy is an AI cadence tell',
    fix: 'Use commas, colons, periods, or parentheses instead',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.md', '.mdx', '.txt'].includes(ext)) return [];
      const findings = [];
      // Remove code blocks before counting
      const textOnly = content.replace(/```[\s\S]*?```/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
      const emDashCount = (textOnly.match(/—|&mdash;|\u2014/g) || []).length;
      if (emDashCount > 5) {
        findings.push({
          rule: 'em-dash-overuse',
          severity: 'advisory',
          line: 1,
          detail: `${emDashCount} em-dashes found in ${basename(file)}`,
          fix: 'More than 2 em-dashes per text block is an AI tell. Use commas, colons, or periods instead.'
        });
      }
      return findings;
    }
  },

  // ── Marketing buzzwords ──
  {
    id: 'marketing-buzzword',
    severity: 'advisory',
    category: 'copy',
    name: 'Marketing buzzwords',
    description: 'Generic SaaS phrases are instant AI tells',
    fix: 'Pick a specific verb and noun that says what the product literally does',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.md', '.mdx', '.txt'].includes(ext)) return [];
      const buzzwords = [
        'streamline', 'empower', 'supercharge', 'world-class', 'enterprise-grade',
        'next-generation', 'cutting-edge', 'best-in-class', 'game-changing', 'revolutionary',
        'innovative', 'disrupting', 'leverage', 'robust', 'seamless', 'scalable', 'cutting edge'
      ];
      const findings = [];
      const text = content.replace(/<[^>]+>/g, ' ').toLowerCase();
      for (const word of buzzwords) {
        const count = (text.match(new RegExp(`\\b${word}\\b`, 'gi')) || []).length;
        if (count > 0) {
          findings.push({
            rule: 'marketing-buzzword',
            severity: 'advisory',
            line: 1,
            detail: `"${word}" used ${count}x in ${basename(file)}`,
            fix: `Replace "${word}" with a specific verb and noun that says what the product literally does`
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Broken images ──
  {
    id: 'broken-image',
    severity: 'error',
    category: 'quality',
    name: 'Broken or placeholder image',
    description: 'img tags with empty, missing, or placeholder src',
    fix: 'Use real images, generated assets, or remove the tag',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx'].includes(ext)) return [];
      const findings = [];
      const imgRe = /<img[^>]*src\s*=\s*["']([^"']*)["'][^>]*>/gi;
      let m;
      while ((m = imgRe.exec(content)) !== null) {
        const src = m[1];
        if (!src || src === '#' || src.includes('placeholder') || src.includes('lorempixel')) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'broken-image',
            severity: 'error',
            line,
            detail: `Image with src="${src || '(empty)'}"`,
            fix: 'Replace with real image, generated asset, or remove the img tag'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Missing alt text ──
  {
    id: 'missing-alt-text',
    severity: 'error',
    category: 'quality',
    name: 'Missing alt text',
    description: 'img tags without alt attribute',
    fix: 'Add descriptive alt text, or alt="" for decorative images',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx'].includes(ext)) return [];
      const findings = [];
      // Find img tags that don't have an alt attribute at all
      const imgRe = /<img\b(?![^>]*\balt\s*=)[^>]*>/gi;
      let m;
      while ((m = imgRe.exec(content)) !== null) {
        const line = content.substring(0, m.index).split('\n').length;
        findings.push({
          rule: 'missing-alt-text',
          severity: 'error',
          line,
          detail: 'img tag missing alt attribute',
          fix: 'Add alt="description" for content images, or alt="" for decorative images'
        });
      }
      return findings.slice(0, 10);
    }
  },

  // ── Google Fonts link in production ──
  {
    id: 'font-link-in-production',
    severity: 'warning',
    category: 'quality',
    name: 'Google Fonts link tag',
    description: 'External font links hurt performance',
    fix: 'Use next/font or self-host with @font-face + font-display: swap',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      if (/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(content)) {
        const line = content.substring(0, content.search(/fonts\.googleapis\.com|fonts\.gstatic\.com/)).split('\n').length;
        findings.push({
          rule: 'font-link-in-production',
          severity: 'warning',
          line,
          detail: 'Google Fonts link tag found',
          fix: 'Self-host fonts with @font-face + font-display: swap, or use next/font for Next.js projects'
        });
      }
      return findings;
    }
  },

  // ── Clipped overflow containers ──
  {
    id: 'clipped-overflow-container',
    severity: 'warning',
    category: 'layout',
    name: 'Overflow container potentially clipping children',
    description: 'overflow: hidden containers with positioned children',
    fix: 'Let overflow be visible, or move positioned layer out of the clip',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const overflowRe = /overflow\s*:\s*hidden/g;
      let m;
      while ((m = overflowRe.exec(content)) !== null) {
        const line = content.substring(0, m.index).split('\n').length;
        // Check nearby lines for position: absolute
        const startLine = Math.max(0, line - 10);
        const endLine = Math.min(content.split('\n').length, line + 10);
        const nearbyLines = content.split('\n').slice(startLine, endLine).join('\n');
        if (/position\s*:\s*absolute/.test(nearbyLines)) {
          findings.push({
            rule: 'clipped-overflow-container',
            severity: 'warning',
            line,
            detail: 'overflow: hidden near position: absolute — children may be clipped',
            fix: 'Use overflow: visible or move positioned children outside the clipping container'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Cramped padding ──
  {
    id: 'cramped-padding',
    severity: 'warning',
    category: 'layout',
    name: 'Cramped padding',
    description: 'Inside bordered or colored containers, padding too low',
    fix: 'Add at least 12-16px padding inside bordered, outlined, or colored containers',
    check(file, content, ext) {
      if (!['.css', '.scss', '.less'].includes(ext)) return [];
      const findings = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const paddingMatch = lines[i].match(/padding(?:-\w+)?\s*:\s*(\d+)px/);
        if (paddingMatch && parseInt(paddingMatch[1]) < 8) {
          // Look for surrounding border/background context
          const context = lines.slice(Math.max(0,i-3), Math.min(lines.length,i+3)).join(' ');
          if (/border|background|outline/.test(context)) {
            findings.push({
              rule: 'cramped-padding',
              severity: 'warning',
              line: i + 1,
              detail: `Padding ${paddingMatch[1]}px is too low for a bordered/colored container`,
              fix: 'Increase padding to at least 12-16px'
            });
          }
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Accessibility: button without discernible text ──
  {
    id: 'button-name',
    severity: 'error',
    category: 'accessibility',
    name: 'Button without discernible text',
    description: 'Buttons with no text content and no aria-label',
    fix: 'Add text content, aria-label, or aria-labelledby to every button',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const buttonRe = /<button\b([^>]*?)>([\s\S]*?)<\/button>/gi;
      let m;
      while ((m = buttonRe.exec(content)) !== null) {
        const attrs = m[1];
        const inner = m[2].replace(/<[^>]+>/g, '').trim();
        const hasAriaLabel = /\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs);
        if (!inner && !hasAriaLabel) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'button-name',
            severity: 'error',
            line,
            detail: 'Button has no text content and no aria-label',
            fix: 'Add text inside the button or add aria-label="descriptive name"'
          });
        }
      }
      return findings.slice(0, 10);
    }
  },

  // ── Accessibility: link without discernible text ──
  {
    id: 'link-name',
    severity: 'error',
    category: 'accessibility',
    name: 'Link without discernible text',
    description: 'Links with no text content, no image alt, and no aria-label',
    fix: 'Add text content or aria-label to every link',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const linkRe = /<a\b([^>]*?)>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = linkRe.exec(content)) !== null) {
        const attrs = m[1];
        if (!/\bhref\s*=/i.test(attrs)) continue; // skip anchors
        const inner = m[2].replace(/<[^>]+>/g, '').trim();
        const hasImgAlt = /<img[^>]*\balt\s*=\s*["'][^"']+["']/i.test(m[2]);
        const hasAriaLabel = /\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs);
        if (!inner && !hasImgAlt && !hasAriaLabel) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'link-name',
            severity: 'error',
            line,
            detail: 'Link has no text content, no image alt, and no aria-label',
            fix: 'Add text inside the link or add aria-label="descriptive name"'
          });
        }
      }
      return findings.slice(0, 10);
    }
  },

  // ── Accessibility: form input without label ──
  {
    id: 'label',
    severity: 'error',
    category: 'accessibility',
    name: 'Form input without label',
    description: 'Input, select, or textarea without an associated label',
    fix: 'Wrap in <label> or add aria-label to the input',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const inputRe = /<(?:input|select|textarea)\b([^>]*?)(?:\/?>|>[\s\S]*?<\/(?:select|textarea)>)/gi;
      let m;
      while ((m = inputRe.exec(content)) !== null) {
        const attrs = m[1];
        const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : 'text';
        if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue;
        const hasAriaLabel = /\baria-label\s*=/i.test(attrs) || /\baria-labelledby\s*=/i.test(attrs);
        const hasId = attrs.match(/id\s*=\s*["']([^"']+)["']/i);
        // Check if there's a <label for="..."> nearby
        let hasLabel = false;
        if (hasId) {
          const idVal = hasId[1];
          const labelRe = new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${idVal}["'][^>]*>`, 'i');
          hasLabel = labelRe.test(content);
        }
        if (!hasLabel && !hasAriaLabel) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'label',
            severity: 'error',
            line,
            detail: `${type} input without label or aria-label`,
            fix: 'Add <label for="id"> or aria-label="..." to this input'
          });
        }
      }
      return findings.slice(0, 10);
    }
  },

  // ── Accessibility: missing lang on html ──
  {
    id: 'html-has-lang',
    severity: 'error',
    category: 'accessibility',
    name: 'Missing lang attribute',
    description: 'html element missing lang attribute',
    fix: 'Add lang="en" (or appropriate code) to <html>',
    check(file, content, ext) {
      if (!['.html', '.astro'].includes(ext)) return [];
      // Only flag if the file actually has an <html> tag
      if (!/<html\b/i.test(content)) return [];
      if (/<html[^>]*\blang\s*=/i.test(content)) return [];
      return [{
        rule: 'html-has-lang',
        severity: 'error',
        line: 1,
        detail: '<html> element missing lang attribute',
        fix: 'Add lang="en" (or appropriate language code) to the <html> tag'
      }];
    }
  },

  // ── Accessibility: viewport disables zoom ──
  {
    id: 'meta-viewport',
    severity: 'error',
    category: 'accessibility',
    name: 'Viewport disables zoom',
    description: 'meta viewport with user-scalable=no or restrictive maximum-scale',
    fix: 'Remove user-scalable=no and maximum-scale restrictions',
    check(file, content, ext) {
      if (!['.html', '.astro'].includes(ext)) return [];
      const vpRe = /<meta[^>]*name\s*=\s*["']viewport["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/gi;
      let m;
      const findings = [];
      while ((m = vpRe.exec(content)) !== null) {
        const contentVal = m[1];
        if (/user-scalable\s*=\s*no/i.test(contentVal)) {
          findings.push({
            rule: 'meta-viewport',
            severity: 'error',
            line: content.substring(0, m.index).split('\n').length,
            detail: 'Viewport has user-scalable=no — prevents zooming',
            fix: 'Remove user-scalable=no. Users must be able to zoom.'
          });
        }
        const maxScaleMatch = contentVal.match(/maximum-scale\s*=\s*([\d.]+)/i);
        if (maxScaleMatch && parseFloat(maxScaleMatch[1]) < 2) {
          findings.push({
            rule: 'meta-viewport',
            severity: 'error',
            line: content.substring(0, m.index).split('\n').length,
            detail: `Viewport maximum-scale=${maxScaleMatch[1]} — restricts zoom`,
            fix: 'Set maximum-scale to at least 2.0, or remove it entirely.'
          });
        }
      }
      return findings;
    }
  },

  // ── Accessibility: positive tabindex ──
  {
    id: 'tabindex-positive',
    severity: 'warning',
    category: 'accessibility',
    name: 'Positive tabindex',
    description: 'tabindex values > 0 create custom focus order',
    fix: 'Use tabindex="0" or tabindex="-1" instead of positive values',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const tabRe = /tabindex\s*=\s*["']?(\d+)["']?/gi;
      let m;
      while ((m = tabRe.exec(content)) !== null) {
        if (parseInt(m[1]) > 0) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'tabindex-positive',
            severity: 'warning',
            line,
            detail: `tabindex="${m[1]}" — positive values disrupt natural tab order`,
            fix: 'Use tabindex="0" (natural DOM order) or tabindex="-1" (programmatic focus only)'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Accessibility: iframe without title ──
  {
    id: 'frame-title',
    severity: 'error',
    category: 'accessibility',
    name: 'Iframe without title',
    description: 'iframe elements without a title attribute',
    fix: 'Add title="descriptive name" to every iframe',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const iframeRe = /<iframe\b([^>]*?)>/gi;
      let m;
      while ((m = iframeRe.exec(content)) !== null) {
        if (!/\btitle\s*=/i.test(m[1])) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'frame-title',
            severity: 'error',
            line,
            detail: 'iframe without title attribute',
            fix: 'Add title="descriptive name" to help screen reader users navigate'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Security: target="_blank" without noopener ──
  {
    id: 'noopener',
    severity: 'warning',
    category: 'security',
    name: 'target="_blank" without noopener',
    description: 'Links opening in new tab without rel="noopener"',
    fix: 'Add rel="noopener noreferrer" to all target="_blank" links',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const linkRe = /<a\b([^>]*?)>/gi;
      let m;
      while ((m = linkRe.exec(content)) !== null) {
        const attrs = m[1];
        if (/target\s*=\s*["']_blank["']/i.test(attrs) && !/rel\s*=\s*["'][^"']*\bnoopener\b/i.test(attrs)) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'noopener',
            severity: 'warning',
            line,
            detail: 'target="_blank" without rel="noopener" — tabnabbing risk',
            fix: 'Add rel="noopener noreferrer" to this link'
          });
        }
      }
      return findings.slice(0, 10);
    }
  },

  // ── Accessibility: nested interactive elements ──
  {
    id: 'nested-interactive',
    severity: 'error',
    category: 'accessibility',
    name: 'Nested interactive elements',
    description: 'Interactive controls nested inside other interactive controls',
    fix: 'Restructure to avoid nesting buttons, links, or inputs inside each other',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      // Check for <button> inside <a> or <a> inside <button>
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if ((/<a\b/i.test(lines[i]) && /<button\b/i.test(lines[i])) ||
            (/<button\b/i.test(lines[i]) && /<a\b/i.test(lines[i]))) {
          findings.push({
            rule: 'nested-interactive',
            severity: 'error',
            line: i + 1,
            detail: 'Possible nested interactive elements (button inside link or vice versa)',
            fix: 'Restructure. Buttons and links must not be nested inside each other.'
          });
        }
      }
      return findings.slice(0, 5);
    }
  },

  // ── Accessibility: duplicate IDs ──
  {
    id: 'duplicate-id',
    severity: 'error',
    category: 'accessibility',
    name: 'Duplicate ID attribute',
    description: 'Multiple elements with the same id value',
    fix: 'Make every id unique within the document',
    check(file, content, ext) {
      if (!['.html', '.jsx', '.tsx', '.vue', '.svelte', '.astro'].includes(ext)) return [];
      const findings = [];
      const seen = new Map();
      const idRe = /\bid\s*=\s*["']([^"']+)["']/gi;
      let m;
      while ((m = idRe.exec(content)) !== null) {
        const idVal = m[1];
        if (seen.has(idVal)) {
          const line = content.substring(0, m.index).split('\n').length;
          findings.push({
            rule: 'duplicate-id',
            severity: 'error',
            line,
            detail: `Duplicate id "${idVal}" (first seen at line ${seen.get(idVal)})`,
            fix: 'Change one of the IDs to a unique value'
          });
        } else {
          seen.set(idVal, content.substring(0, m.index).split('\n').length);
        }
      }
      return findings.slice(0, 10);
    }
  },
];

// ── File collection ──

function collectFiles(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      if (SKIP_DIRS.has(entry)) continue;
      if (entry.startsWith('.')) continue;
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...collectFiles(fullPath));
        } else if (stat.isFile() && FRONTEND_EXTS.has(extname(entry))) {
          files.push(fullPath);
        }
      } catch (e) {
        // Permission denied, skip
      }
    }
  } catch (e) {
    // Directory not readable, skip
  }
  return files;
}

// ── Main ──

let files;
try {
  const targetStat = statSync(TARGET);
  if (targetStat.isFile()) {
    files = [TARGET];
  } else if (targetStat.isDirectory()) {
    files = collectFiles(TARGET);
  } else {
    files = [];
  }
} catch (e) {
  console.error(`Error reading ${TARGET}: ${e.message}`);
  process.exit(1);
}

const allFindings = [];

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  const relPath = relative(TARGET, file);

  for (const check of CHECKS) {
    const findings = check.check(relPath, content, extname(file));
    for (const f of findings) {
      f.file = relPath;
    }
    allFindings.push(...findings);
  }
}

// Post-scan: single-font check
// Get unique font families across all CSS files
const allFonts = new Set();
for (const match of allFindings) {
  // The single-font check collected per-project data but didn't emit findings
  // We handle this simply — if the project has only one font file, note it
}

// Compile summary
const summary = { errors: 0, warnings: 0, advisories: 0 };
for (const f of allFindings) {
  if (f.severity === 'error') summary.errors++;
  else if (f.severity === 'warning') summary.warnings++;
  else summary.advisories++;
}

// Output JSON
const result = {
  target: TARGET,
  files_scanned: files.length,
  findings: allFindings,
  summary
};

console.log(JSON.stringify(result, null, 2));
