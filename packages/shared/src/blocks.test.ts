import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { flattenBlocksToMarkdown, parseBlock } from './blocks';

const validWidget = {
  type: 'widget',
  title: 'Box-model playground',
  html: '<!doctype html><style>body{color:#000}</style><h1>hi</h1>',
  brief: 'Drag the padding slider and watch the box grow.',
  fallbackMarkdown: 'The box model: padding sits inside the border, margin outside it.',
};

describe('parseBlock · widget (PRD-06)', () => {
  it('accepts a complete widget and defaults reviewed to false', () => {
    const parsed = parseBlock(validWidget);
    assert.ok(parsed);
    assert.equal(parsed.type, 'widget');
    if (parsed.type !== 'widget') return;
    assert.equal(parsed.reviewed, false);
    assert.equal(parsed.title, 'Box-model playground');
  });

  it('keeps an admin-set reviewed=true', () => {
    const parsed = parseBlock({ ...validWidget, reviewed: true });
    assert.ok(parsed && parsed.type === 'widget');
    assert.equal(parsed.reviewed, true);
  });

  it('rejects a widget without brief / fallbackMarkdown', () => {
    assert.equal(parseBlock({ type: 'widget', title: 'x', html: '<p>y</p>' }), null);
    assert.equal(parseBlock({ ...validWidget, brief: undefined, reviewed: true }), null);
    assert.equal(parseBlock({ ...validWidget, fallbackMarkdown: '' }), null);
  });

  it('rejects oversized html (>200k chars)', () => {
    const big = '<!-- ' + 'x'.repeat(200_001) + ' -->';
    assert.equal(parseBlock({ ...validWidget, html: big }), null);
  });
});

describe('flattenBlocksToMarkdown · widget section', () => {
  it('renders title + brief + fallback markdown, not raw html', () => {
    const md = flattenBlocksToMarkdown([
      parseBlock(validWidget) as NonNullable<ReturnType<typeof parseBlock>>,
    ]);
    assert.ok(md.includes('### Box-model playground'));
    assert.ok(md.includes('Drag the padding slider'));
    assert.ok(md.includes('The box model: padding'));
    assert.ok(!md.includes('<!doctype'));
    assert.ok(md.includes('hands-on interactive section'));
  });
});
