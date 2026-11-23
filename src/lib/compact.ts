import type { FrameNode, LayoutDoc, Size } from './types';

// ---------------------------------------------------------------------------
// Deterministic serialization of the layout tree. This is intentionally
// decoupled from the editor and the renderer so the notation can change later
// without touching the visual editor.
//
// Grammar (2-space indent = nesting depth):
//
//   <name> <row|col> w<...> h<...> [p<n>] [gap<n>] [justify-<...>] [align-<...>]
//
//   width/height token:  fixed -> w<value> / h<value>
//                        fill  -> wfill    / hfill
//                        hug   -> whug     / hhug
//   p<n>            padding, omitted when 0
//   gap<n>          gap, omitted when 0
//   justify-<...>   start | center | end | between, omitted when 'start' (default)
//   align-<...>     start | center | end | stretch, omitted when 'stretch' (default)
// ---------------------------------------------------------------------------

export const COMPACT_SYNTAX = `Compact layout notation
  Indentation (2 spaces) = nesting depth.
  Line: <name> <row|col> w<..> h<..> [p<n>] [gap<n>] [justify-<..>] [align-<..>]
  width/height: fixed -> w120 / h64   fill -> wfill / hfill   hug -> whug / hhug
  p<n>           padding on all sides, omitted when 0
  gap<n>         gap between children, omitted when 0
  justify-<..>   main-axis: start | center | end | between  (omitted when start)
  align-<..>     cross-axis: start | center | end | stretch (omitted when stretch)
  "text"         optional box text, quoted, last on the line (omitted when empty)`;

function sizeToken(prefix: 'w' | 'h', size: Size): string {
  switch (size.mode) {
    case 'fixed':
      return `${prefix}${size.value ?? 0}`;
    case 'fill':
      return `${prefix}fill`;
    case 'hug':
      return `${prefix}hug`;
  }
}

function frameLine(node: FrameNode, depth: number): string {
  const indent = '  '.repeat(depth);
  const parts: string[] = [node.name];
  parts.push(node.direction === 'column' ? 'col' : 'row');
  parts.push(sizeToken('w', node.width));
  parts.push(sizeToken('h', node.height));
  if (node.padding !== 0) parts.push(`p${node.padding}`);
  if (node.gap !== 0) parts.push(`gap${node.gap}`);
  if (node.justify !== 'start') parts.push(`justify-${node.justify}`);
  if (node.align !== 'stretch') parts.push(`align-${node.align}`);
  if (node.text) {
    // Keep text on one line and quote-safe; newlines -> spaces, quotes escaped.
    const clean = node.text.replace(/\s+/g, ' ').replace(/"/g, '\\"');
    parts.push(`"${clean}"`);
  }
  return indent + parts.join(' ');
}

function walk(node: FrameNode, depth: number, lines: string[]): void {
  lines.push(frameLine(node, depth));
  for (const child of node.children) {
    walk(child, depth + 1, lines);
  }
}

export function toCompact(doc: LayoutDoc): string {
  const lines: string[] = [];
  walk(doc.root, 0, lines);
  return lines.join('\n');
}

// Readable JSON of the document tree. Selection and other editor state are not
// part of the doc, so nothing extra needs stripping.
export function toExportJSON(doc: LayoutDoc): string {
  return JSON.stringify(doc, null, 2);
}
