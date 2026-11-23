import type { FrameNode, Direction, Align, Justify, Size } from './types';

// ---------------------------------------------------------------------------
// The ONE place that maps frame properties to native CSS Flexbox.
//
// Every frame is simultaneously:
//   * a flex CONTAINER for its children (direction / gap / padding / align / justify)
//   * a flex ITEM inside its parent (how its width/height sizing mode behaves)
//
// A size's meaning depends on whether its axis is the parent's MAIN axis
// (= parent.direction) or its CROSS axis:
//
//   Fixed  -> explicit px. On the main axis also flex-shrink:0 so siblings
//             can't squeeze it below the fixed size.
//   Hug    -> fit-content + flex:0 0 auto. fit-content (not auto) is respected
//             even under align-items:stretch, so a hug frame reliably sizes to
//             its content and is still positioned by the parent's align.
//   Fill   -> main axis: flex:1 1 0 + min-*:0 (share the main axis; min:0 keeps
//                        nested fills from overflowing their parent).
//             cross axis: align-self:stretch (fill the cross axis).
//
// Known limitations (pragmatic, by design):
//   * fill inside hug is contradictory; hug wins (the parent won't grow).
//   * an empty hug frame collapses to ~padding; the canvas gives every frame a
//     small min-size + border so empties stay visible and selectable.
//   * Figma Auto Layout nuances (fill-with-max, baseline, wrap) are out of scope.
// ---------------------------------------------------------------------------

const JUSTIFY_CSS: Record<Justify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

const ALIGN_CSS: Record<Align, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

type Axis = 'width' | 'height';

// Append the item-side declarations for one axis to `out`.
function itemAxis(
  out: string[],
  axis: Axis,
  size: Size,
  isMain: boolean,
): void {
  const minProp = axis === 'width' ? 'min-width' : 'min-height';
  switch (size.mode) {
    case 'fixed': {
      const v = size.value ?? 0;
      out.push(`${axis}: ${v}px`);
      if (isMain) out.push('flex-shrink: 0');
      break;
    }
    case 'hug': {
      out.push(`${axis}: fit-content`);
      if (isMain) {
        out.push('flex-grow: 0');
        out.push('flex-shrink: 0');
      }
      break;
    }
    case 'fill': {
      if (isMain) {
        out.push('flex-grow: 1');
        out.push('flex-shrink: 1');
        out.push('flex-basis: 0');
        out.push(`${minProp}: 0`);
      } else {
        out.push('align-self: stretch');
      }
      break;
    }
  }
}

// Root has no parent; honor its size modes directly with sensible fallbacks so
// the canvas always has a concrete box to render into.
function rootAxis(out: string[], axis: Axis, size: Size): void {
  if (size.mode === 'fixed') {
    out.push(`${axis}: ${size.value ?? 0}px`);
  } else if (size.mode === 'hug') {
    out.push(`${axis}: fit-content`);
  } else {
    // fill at the root -> fill the available canvas space.
    out.push(`${axis}: 100%`);
  }
}

// Returns an inline CSS string for a frame. `parentDirection` is null for root.
export function frameToCss(
  node: FrameNode,
  parentDirection: Direction | null,
): string {
  const out: string[] = [];

  // --- container side (always) ---
  out.push('display: flex');
  out.push(`flex-direction: ${node.direction}`);
  out.push(`padding: ${node.padding}px`);
  out.push(`gap: ${node.gap}px`);
  out.push(`justify-content: ${JUSTIFY_CSS[node.justify]}`);
  out.push(`align-items: ${ALIGN_CSS[node.align]}`);
  out.push('box-sizing: border-box');
  // Clip overflow only on container frames (ones with children) so nested
  // content stays within bounds. Leaf frames show a name label that must be
  // allowed to size the box via the .hug-title min-width rule.
  if (node.children.length > 0) {
    out.push('overflow: hidden');
  }

  // --- item side ---
  if (parentDirection === null) {
    rootAxis(out, 'width', node.width);
    rootAxis(out, 'height', node.height);
  } else {
    itemAxis(out, 'width', node.width, parentDirection === 'row');
    itemAxis(out, 'height', node.height, parentDirection === 'column');
  }

  return out.join('; ') + ';';
}
