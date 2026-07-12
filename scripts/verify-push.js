#!/usr/bin/env node
'use strict';

/**
 * verify-push.js
 *
 * Git pre-push quality gate.
 * Detects whether changed files belong to FE, BE, or both,
 * then runs only the relevant checks.
 *
 * Usage:
 *   node scripts/verify-push.js            # manual run (diffs HEAD vs upstream)
 *   node scripts/verify-push.js --hook     # called by .githooks/pre-push (reads Git stdin)
 *   node scripts/verify-push.js --all      # force-run every check regardless of diff
 *   node scripts/verify-push.js --fe-only  # force FE checks only
 *   node scripts/verify-push.js --be-only  # force BE checks only
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');

// ──────────────────────────────────────────────
// Flags
// ──────────────────────────────────────────────
const args     = process.argv.slice(2);
const isHook   = args.includes('--hook');
const runAll   = args.includes('--all');
const feOnly   = args.includes('--fe-only');
const beOnly   = args.includes('--be-only');

const ROOT = path.resolve(__dirname, '..');

// ──────────────────────────────────────────────
// Git helpers
// ──────────────────────────────────────────────
function git(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      cwd: ROOT,
    }).trim();
  } catch {
    return '';
  }
}

function diffFiles(base, head) {
  const out = git(`git diff --name-only ${base} ${head}`);
  return out ? out.split('\n').map(f => f.trim()).filter(Boolean) : [];
}

// ──────────────────────────────────────────────
// Read changed files
// ──────────────────────────────────────────────
function getChangedFiles() {
  const Z40 = '0'.repeat(40);

  // ── Mode 1: called by the pre-push hook ──────
  //    Git passes lines to stdin in the format:
  //      <local-ref> <local-sha> <remote-ref> <remote-sha>
  if (isHook) {
    let stdinData = '';
    try {
      // fd 0 = stdin; works on both Linux and Windows
      stdinData = require('fs').readFileSync(0, 'utf-8');
    } catch {
      stdinData = '';
    }

    const files = new Set();

    for (const line of stdinData.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;

      const [, localSha, , remoteSha] = parts;

      if (localSha === Z40) {
        // Branch deletion — nothing to check
        continue;
      }

      let base;
      if (remoteSha === Z40) {
        // Brand-new branch — diff against merge-base with main/master, or HEAD~1
        base =
          git('git merge-base HEAD origin/main') ||
          git('git merge-base HEAD origin/master') ||
          git('git rev-parse HEAD~1') ||
          '';
      } else {
        base = remoteSha;
      }

      if (base) {
        diffFiles(base, localSha).forEach(f => files.add(f));
      }
    }

    if (files.size > 0) {
      return Array.from(files);
    }

    // stdin was empty or yielded nothing — fall through to Mode 2
    console.warn('⚠️  pre-push stdin yielded no refs; falling back to local diff.');
  }

  // ── Mode 2: manual run or hook stdin fallback ─
  //    Diff HEAD against upstream tracking branch, or origin/main.
  //    Note: @{u} gives us the remote-tracking ref name (e.g. "origin/develop");
  //    we pass it directly to git diff which accepts branch names fine.
  const upstream =
    git('git rev-parse --abbrev-ref @{u}') ||          // e.g. "origin/develop"
    git('git merge-base HEAD origin/main') ||
    git('git merge-base HEAD origin/master') ||
    'HEAD~1';

  const files = diffFiles(upstream, 'HEAD');

  // Also include staged/unstaged changes (for manual developer runs)
  if (!isHook) {
    const staged   = git('git diff --name-only --cached');
    const unstaged = git('git diff --name-only');
    [staged, unstaged].forEach(out =>
      out.split('\n').forEach(f => { if (f.trim()) files.push(f.trim()); })
    );
  }

  return [...new Set(files)];
}

// ──────────────────────────────────────────────
// Classify files → FE / BE
// ──────────────────────────────────────────────

/**
 * Root-level config that belongs primarily to the Backend.
 *
 * WHY not shared:
 *   - root package.json / package-lock.json manage BE (NestJS, Prisma) deps.
 *     The web-app has its OWN package.json at apps/web-app/package.json,
 *     which is already caught by FE_PATTERNS.
 *   - root tsconfig.json is referenced by apps/backend-api/tsconfig.json.
 *   - root eslint.config.mjs lints only BE source (see the lint script).
 *   - .gitignore changes are unlikely to break either side's build.
 *
 * Adding a BE npm package updates root package.json + package-lock.json
 * → should NOT trigger FE checks.
 */
const BE_ROOT_PATTERNS = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^tsconfig\.json$/,
  /^eslint\.config\.mjs$/,
];

/**
 * Files that belong exclusively (or primarily) to the Frontend.
 */
const FE_PATTERNS = [
  /^apps\/web-app\//,
  // FE-specific workflow
  /^\.github\/workflows\/frontend-ci\.yml$/,
];

/**
 * Files that belong exclusively (or primarily) to the Backend.
 */
const BE_PATTERNS = [
  /^apps\/backend-api\//,
  /^prisma\//,
  /^Dockerfile$/,
  /^\.dockerignore$/,
  // BE-specific workflow
  /^\.github\/workflows\/ci\.yml$/,
];

/**
 * Files that are truly shared — changing them triggers BOTH FE and BE checks.
 * Keep this list small and intentional.
 */
const SHARED_PATTERNS = [
  // Hook scripts affect both pipelines
  /^\.githooks\//,
  // Any other workflow file not already matched above
  /^\.github\/workflows\//,
];

function classify(files) {
  const feFiles      = [];
  const beFiles      = [];
  const sharedFiles  = [];
  const otherFiles   = [];

  for (const f of files) {
    if (FE_PATTERNS.some(p => p.test(f))) {
      feFiles.push(f);
    } else if (BE_PATTERNS.some(p => p.test(f)) || BE_ROOT_PATTERNS.some(p => p.test(f))) {
      beFiles.push(f);
    } else if (SHARED_PATTERNS.some(p => p.test(f))) {
      sharedFiles.push(f);
    } else {
      otherFiles.push(f);
    }
  }

  const hasFE = feFiles.length > 0 || sharedFiles.length > 0;
  const hasBE = beFiles.length > 0 || sharedFiles.length > 0;

  return { feFiles, beFiles, sharedFiles, otherFiles, hasFE, hasBE };
}

// ──────────────────────────────────────────────
// Runner
// ──────────────────────────────────────────────
function runCheck(name, cmd, args, cwd) {
  const display = [cmd, ...args].join(' ');
  console.log(`\n  ▶  ${name}`);
  console.log(`     $ ${display}${cwd ? `  (in ${cwd})` : ''}`);

  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    cwd: cwd ? path.resolve(ROOT, cwd) : ROOT,
  });

  if (result.status !== 0) {
    console.error(`\n  ❌  FAILED: ${name}`);
    process.exit(result.status || 1);
  }

  console.log(`  ✔   PASSED: ${name}`);
}

function printSection(title) {
  const line = '─'.repeat(54);
  console.log(`\n┌${line}┐`);
  console.log(`│  ${title.padEnd(52)}│`);
  console.log(`└${line}┘`);
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
printSection('Git Push Verification Gate');

let activeFE, activeBE;

if (runAll) {
  console.log('\n  ℹ  --all flag: forcing every check.');
  activeFE = true;
  activeBE = true;
} else if (feOnly) {
  console.log('\n  ℹ  --fe-only flag: running FE checks only.');
  activeFE = true;
  activeBE = false;
} else if (beOnly) {
  console.log('\n  ℹ  --be-only flag: running BE checks only.');
  activeFE = false;
  activeBE = true;
} else {
  const changedFiles = getChangedFiles();
  const { feFiles, beFiles, sharedFiles, otherFiles, hasFE, hasBE } = classify(changedFiles);

  console.log(`\n  Changed files (${changedFiles.length} total):`);

  if (feFiles.length)     console.log(`    📦 FE-specific   : ${feFiles.slice(0, 5).join(', ')}${feFiles.length > 5 ? ` +${feFiles.length - 5} more` : ''}`);
  if (beFiles.length)     console.log(`    🔧 BE-specific   : ${beFiles.slice(0, 5).join(', ')}${beFiles.length > 5 ? ` +${beFiles.length - 5} more` : ''}`);
  if (sharedFiles.length) console.log(`    🔗 Shared (both) : ${sharedFiles.slice(0, 5).join(', ')}${sharedFiles.length > 5 ? ` +${sharedFiles.length - 5} more` : ''}`);
  if (otherFiles.length)  console.log(`    📄 Other/docs    : ${otherFiles.slice(0, 5).join(', ')}${otherFiles.length > 5 ? ` +${otherFiles.length - 5} more` : ''}`);

  if (changedFiles.length === 0) {
    console.log('    (no changes detected)');
  }

  console.log(`\n  ➔ FE checks : ${hasFE ? '✅  YES' : '⬜  NO (no FE files changed)'}`);
  console.log(`  ➔ BE checks : ${hasBE ? '✅  YES' : '⬜  NO (no BE files changed)'}`);

  activeFE = hasFE;
  activeBE = hasBE;
}

// ──────────────────────────────────────────────
// Frontend checks
// ──────────────────────────────────────────────
if (activeFE) {
  printSection('Frontend Checks');
  runCheck(
    'Prettier — code style',
    'npx', ['prettier', '--check', '.'],
    'apps/web-app',
  );
  runCheck(
    'ESLint — static analysis',
    'npm', ['run', 'lint'],
    'apps/web-app',
  );
  runCheck(
    'TypeScript — type checking',
    'npm', ['run', 'type-check'],
    'apps/web-app',
  );
}

// ──────────────────────────────────────────────
// Backend checks
// ──────────────────────────────────────────────
if (activeBE) {
  printSection('Backend Checks');
  runCheck(
    'ESLint — static analysis',
    'npm', ['run', 'lint'],
  );
  runCheck(
    'TypeScript — type checking',
    'npm', ['run', 'typecheck:api'],
  );
  runCheck(
    'Unit tests',
    'npm', ['run', 'test:api:unit'],
  );
}

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────
if (!activeFE && !activeBE) {
  printSection('No relevant changes detected');
  console.log('\n  ℹ  No FE or BE files were changed. Skipping all checks.');
}

printSection('✔  All checks passed!');
console.log();
process.exit(0);
