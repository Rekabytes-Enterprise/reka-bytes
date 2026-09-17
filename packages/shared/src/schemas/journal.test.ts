import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseJournalFile,
  rewriteJournalAssetPaths,
  rewriteCoverPath,
  isJournalAssetUrl,
  parseWidgetFence,
  computeReadMinutes,
} from './journal';

const VALID_FM = `---
slug: shipping-v0-1-0
title: Shipping v0.1.0
excerpt: >
  Docker, GHCR, and the migrations story.
publishedAt: 2026-09-15
featured: true
tags: [shipping, docker]
coverImage: ./docker-compose-diagram.png
status: published
---
`;

test('valid file parses with defaults', () => {
  const result = parseJournalFile('2026-09-15-shipping-v0-1-0.md', `${VALID_FM}\n# Hello\n\nBody.`);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.post.meta.slug, 'shipping-v0-1-0');
  assert.equal(result.post.meta.featured, true);
  assert.deepEqual(result.post.meta.tags, ['shipping', 'docker']);
  assert.equal(result.post.meta.publishedAt, '2026-09-15');
  assert.equal(result.post.folder, '2026-09-15-shipping-v0-1-0');
  assert.equal(result.post.body.trim(), '# Hello\n\nBody.'.trim());
});

test('missing frontmatter → soft skip', () => {
  const r = parseJournalFile('2026-09-15-foo.md', '# Just a body');
  assert.equal(r.ok, false);
});

test('filename/slug mismatch is rejected', () => {
  const r = parseJournalFile('2026-09-15-other-name.md', `${VALID_FM}\nBody.`);
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.error, /does not match filename slug/);
});

test('bad filename format is rejected', () => {
  const r = parseJournalFile('notes.md', `${VALID_FM}\nBody.`);
  assert.equal(r.ok, false);
});

test('status defaults to draft (typos fail loudly via strict)', () => {
  const fm = `---
slug: foo
title: Foo
excerpt: Short.
publishedAt: 2026-09-15
---
`;
  const ok = parseJournalFile('2026-09-15-foo.md', `${fm}\nBody.`);
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.post.meta.status, 'draft');

  const typo = fm.replace('publishedAt:', 'Status: draft\npublishedAt:');
  const bad = parseJournalFile('2026-09-15-foo.md', `${typo}\nBody.`);
  assert.equal(bad.ok, false);
});

test('publishedAt earlier than filename date is rejected', () => {
  const fm = VALID_FM.replace('publishedAt: 2026-09-15', 'publishedAt: 2026-01-01');
  const r = parseJournalFile('2026-09-15-shipping-v0-1-0.md', `${fm}\nBody.`);
  assert.equal(r.ok, false);
});

// ── Path rewriting ─────────────────────────────────────────────

test('inline relative images are rewritten to the asset route', () => {
  const body =
    'See this: ![Architecture](./diagram.png) done.\n\nAnd with title: ![x](./y.png "t")';
  const out = rewriteJournalAssetPaths(body, '2026-09-15-foo');
  assert.match(
    out,
    /!\[Architecture\]\(\/api\/public\/journal-assets\/2026-09-15-foo\/diagram\.png\)/,
  );
  assert.match(out, /\/2026-09-15-foo\/y\.png "t"\)/);
  assert.ok(!out.includes('(./'));
});

test('absolute URLs are left alone', () => {
  const body = '![x](https://example.com/a.png)';
  assert.equal(rewriteJournalAssetPaths(body, 'f'), body);
});

test('widget fence src is rewritten, other fields untouched', () => {
  const body = [
    'text',
    '',
    '```widget',
    'src: ./widgets/migration-flow.html',
    'title: Watch it',
    'brief: Click run',
    'fallback: |',
    '  Static words.',
    '```',
    '',
    'more text',
  ].join('\n');
  const out = rewriteJournalAssetPaths(body, '2026-09-15-foo');
  assert.match(
    out,
    /src: \/api\/public\/journal-assets\/2026-09-15-foo\/widgets\/migration-flow\.html/,
  );
  assert.match(out, /title: Watch it/);
});

test('widget src validation blocks traversal and off-route URLs', () => {
  assert.equal(
    isJournalAssetUrl('/api/public/journal-assets/2026-09-15-foo/w/a.html', '2026-09-15-foo'),
    true,
  );
  assert.equal(
    isJournalAssetUrl('/api/public/journal-assets/other/w/a.html', '2026-09-15-foo'),
    false,
  );
  assert.equal(
    isJournalAssetUrl('/api/public/journal-assets/2026-09-15-foo/../../.env', '2026-09-15-foo'),
    false,
  );
  assert.equal(isJournalAssetUrl('https://evil.com/a.html', '2026-09-15-foo'), false);
  assert.equal(
    isJournalAssetUrl('/api/public/journal-assets/2026-09-15-foo/x.js', '2026-09-15-foo'),
    false,
  );
});

test('coverImage rewrite', () => {
  assert.equal(
    rewriteCoverPath('./cover.png', '2026-09-15-foo'),
    '/api/public/journal-assets/2026-09-15-foo/cover.png',
  );
  assert.equal(rewriteCoverPath(undefined, '2026-09-15-foo'), null);
});

// ── Widget fence parsing ───────────────────────────────────────

test('valid widget fence parses', () => {
  const f = parseWidgetFence('src: /a/b.html\ntitle: T\nbrief: B\nfallback: |\n  words\n');
  assert.ok(f);
  assert.equal(f.src, '/a/b.html');
  assert.equal(f.fallback.trim(), 'words');
});

test('invalid widget fence returns null (degrade, never crash)', () => {
  assert.equal(parseWidgetFence('title: missing rest'), null);
  assert.equal(
    parseWidgetFence('src: /a.html\ntitle: T\nbrief: B\nfallback: F\nextra: nope'),
    null,
  );
  assert.equal(parseWidgetFence('not: [yaml: at: all:'), null);
});

// ── Read time ──────────────────────────────────────────────────

test('read time ≈ words / 220, code fences ignored', () => {
  const words = Array(300).fill('word').join(' ');
  assert.equal(computeReadMinutes(words), 2);
  const withCode = `${words}\n\n\`\`\`bash\n${Array(2000).fill('echo hi there friend now').join(' ')}\n\`\`\``;
  assert.equal(computeReadMinutes(withCode), 2);
  assert.equal(computeReadMinutes(''), 1);
});
