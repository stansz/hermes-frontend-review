#!/usr/bin/env node

/**
 * check-updates.mjs — Fetches latest antipatterns.mjs from pbakaus/impeccable
 * and reports any rules not yet in our references/rules.md.
 *
 * Usage: node check-updates.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, '..', 'references', 'rules.md');
const IMPECCABLE_RAW = 'https://raw.githubusercontent.com/pbakaus/impeccable/main/cli/engine/registry/antipatterns.mjs';

async function main() {
  // Read our current rules
  let ourRules;
  try {
    ourRules = readFileSync(RULES_PATH, 'utf-8');
  } catch {
    console.error('ERROR: Could not read references/rules.md');
    process.exit(1);
  }

  // Fetch latest antipatterns from impeccable
  console.log('Fetching latest rules from pbakaus/impeccable...');
  let remote;
  try {
    const res = await fetch(IMPECCABLE_RAW);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    remote = await res.text();
  } catch (e) {
    console.error(`ERROR: Could not fetch impeccable antipatterns: ${e.message}`);
    process.exit(1);
  }

  // Extract rule IDs from remote source
  const remoteIds = new Set();
  const idRe = /id\s*:\s*'([^']+)'/g;
  let m;
  while ((m = idRe.exec(remote)) !== null) {
    remoteIds.add(m[1]);
  }

  // Extract rule names and descriptions from remote
  const remoteRules = [];
  const ruleBlockRe = /\{\s*\n\s*id:\s*'([^']+)',[\s\S]*?name:\s*'([^']+)',[\s\S]*?description:\s*'([^']*)'/g;
  while ((m = ruleBlockRe.exec(remote)) !== null) {
    remoteRules.push({ id: m[1], name: m[2], description: m[3].replace(/\\'/g, "'") });
  }

  // Check which remote IDs are in our rules.md
  const missing = [];
  for (const rule of remoteRules) {
    // Look for the rule ID as a heading or reference in our rules
    if (!ourRules.includes(`### ${rule.id}`) && !ourRules.includes(`#${rule.id}`)) {
      missing.push(rule);
    }
  }

  // Also check for rules we have that aren't in impeccable anymore
  const ourIds = new Set();
  const ourIdRe = /### (\S+)/g;
  while ((m = ourIdRe.exec(ourRules)) !== null) {
    if (m[1] !== 'Categories') ourIds.add(m[1]);
  }

  const removed = [...ourIds].filter(id => !remoteIds.has(id));

  // Report
  console.log(`\nImpeccable has ${remoteRules.length} rules. We have ${ourIds.size} rules.\n`);

  if (missing.length > 0) {
    console.log(`🆕 ${missing.length} new rule(s) in impeccable, NOT in our rules.md:\n`);
    for (const rule of missing) {
      console.log(`  [${rule.id}] ${rule.name}`);
      console.log(`  ${rule.description}\n`);
    }
    console.log('To add these: tell Hermes "update the frontend review rules" and the agent will add them.\n');
  }

  if (removed.length > 0) {
    console.log(`🗑️ ${removed.length} rule(s) in our rules.md, REMOVED from impeccable:\n`);
    for (const id of removed) {
      console.log(`  ${id}`);
    }
    console.log('\nConsider whether to keep or remove these.\n');
  }

  if (missing.length === 0 && removed.length === 0) {
    console.log('✅ Our rules are up to date with impeccable.\n');
  }

  // Output JSON for programmatic use
  console.log(JSON.stringify({
    ourCount: ourIds.size,
    remoteCount: remoteRules.length,
    newRules: missing,
    removedRules: removed,
    upToDate: missing.length === 0 && removed.length === 0
  }, null, 2));
}

main().catch(e => {
  console.error(`FATAL: ${e.message}`);
  process.exit(1);
});
