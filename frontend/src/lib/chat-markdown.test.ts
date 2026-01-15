import { describe, it, expect } from 'vitest';
import { normalizeAssistantMarkdownForRender } from './chat-markdown';

describe('normalizeAssistantMarkdownForRender', () => {
  it('inserts newline after code fence language', () => {
    const input = '```html<!DOCTYPE html>\n<body></body>\n```';
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toMatch(/^```html\s*\r?\n/);
    expect(out).toContain('<!DOCTYPE html>');
  });

  it('converts mermaidgraph to mermaid fenced block', () => {
    const input = [
      'mermaidgraph',
      '  A --> B',
      '``',
      '',
    ].join('\n');
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toContain('```mermaid');
    expect(out).toContain('A --> B');
    expect(out).toContain('```');
  });

  it('repairs inline mermaidgraph fence headers', () => {
    const input = '```mermaidgraph LR A-->B\n```';
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toContain('```mermaid');
    expect(out).toContain('graph LR');
  });

  it('ensures bullet points are always on new lines', () => {
    const input = 'Here are some items: - First item - Second item';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should split bullets onto separate lines
    expect(out).toContain('- First item');
    expect(out).toContain('- Second item');
    // Should have blank line before list (good formatting)
    expect(out).toMatch(/Here are some items:\s*\n\s*\n\s*-\s+First item/);
  });

  it('handles inline bullets with different markers', () => {
    const input = 'List: * item1 * item2 + item3';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should split all bullets onto separate lines
    expect(out).toContain('* item1');
    expect(out).toContain('* item2');
    expect(out).toContain('+ item3');
    // Should have blank line before list
    expect(out).toMatch(/List:\s*\n\s*\n\s*\*\s+item1/);
  });

  it('does not modify bullets inside code blocks', () => {
    const input = '```\ncode - with dash\n```';
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toContain('code - with dash');
    expect(out).not.toContain('code\n- with dash');
  });

  it('does not modify bullets in tables', () => {
    const input = '| Col1 | Col2 |\n| - item | value |';
    const out = normalizeAssistantMarkdownForRender(input);
    // Table rows with dashes should remain intact
    expect(out).toContain('| Col1 | Col2 |');
    expect(out).toContain('| - item | value |');
  });

  it('ensures tables have proper pipe delimiters', () => {
    const input = 'Col1 | Col2\n--- | ---\nval1 | val2';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should add pipes to table rows
    expect(out).toContain('| Col1 | Col2 |');
    expect(out).toContain('| --- | --- |');
    expect(out).toContain('| val1 | val2 |');
  });

  it('normalizes table dividers', () => {
    const input = '| Col1 | Col2 |\n|---|---|\n| val1 | val2 |';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should have proper spacing in divider
    const lines = out.split('\n');
    const dividerLine = lines.find((l) => l.includes('---'));
    expect(dividerLine).toBeTruthy();
    expect(dividerLine).toMatch(/\|\s*:?-{2,}:?\s*\|/);
  });

  it('adds blank lines before tables', () => {
    const input = 'Some text\n| Col1 | Col2 |\n| --- | --- |';
    const out = normalizeAssistantMarkdownForRender(input);
    const lines = out.split('\n');
    const tableStartIdx = lines.findIndex((l) => l.trim().startsWith('|'));
    expect(tableStartIdx).toBeGreaterThan(0);
    expect(lines[tableStartIdx - 1]).toBe('');
  });

  it('adds blank lines before lists', () => {
    const input = 'Some text\n- item1\n- item2';
    const out = normalizeAssistantMarkdownForRender(input);
    const lines = out.split('\n');
    const listStartIdx = lines.findIndex((l) => /^\s*-\s+/.test(l));
    expect(listStartIdx).toBeGreaterThan(0);
    expect(lines[listStartIdx - 1]).toBe('');
  });

  it('ensures hash headings are always on new lines', () => {
    const input = 'Some text### Heading\nMore text## Subheading';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should split headings onto separate lines (may have blank line before heading)
    expect(out).toMatch(/Some text\s*\n\s*\n\s*###\s+Heading/);
    expect(out).toMatch(/More text\s*\n\s*\n\s*##\s+Subheading/);
  });

  it('handles inline hash headings with different levels', () => {
    const input = 'Text# Heading1\nText#### Heading4';
    const out = normalizeAssistantMarkdownForRender(input);
    // Should split headings onto separate lines (may have blank line before heading)
    expect(out).toMatch(/Text\s*\n\s*\n\s*#\s+Heading1/);
    // Note: The heading should be split, even if there's a blank line
    const lines = out.split('\n');
    const heading1Idx = lines.findIndex(l => l.trim().startsWith('# Heading1'));
    const heading4Idx = lines.findIndex(l => l.trim().startsWith('#') && l.includes('Heading4'));
    expect(heading1Idx).toBeGreaterThan(0);
    expect(heading4Idx).toBeGreaterThan(0);
    // Ensure headings are on separate lines from the preceding text
    expect(lines[heading1Idx - 1]?.trim()).not.toContain('Text');
    expect(lines[heading4Idx - 1]?.trim()).not.toContain('Text');
  });

  it('does not modify hash headings inside code blocks', () => {
    const input = '```\ncode # comment\n```';
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toContain('code # comment');
    expect(out).not.toContain('code\n# comment');
  });

  it('does not modify hash headings in tables', () => {
    const input = '| Col1 | Col2 |\n| # header | value |';
    const out = normalizeAssistantMarkdownForRender(input);
    expect(out).toContain('| # header | value |');
  });
});
