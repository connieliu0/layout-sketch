// --- Layout document data model ---------------------------------------------
//
// This is the single source of truth. The canvas renders this tree, and the
// compact notation serializes it. Nothing about editor state (selection, hover)
// lives in here, so it is excluded from export by construction.

export type SizingMode = 'fixed' | 'fill' | 'hug';
export type Direction = 'row' | 'column';

// Cross-axis alignment (CSS align-items / align-self).
export type Align = 'start' | 'center' | 'end' | 'stretch';

// Main-axis distribution (CSS justify-content).
export type Justify = 'start' | 'center' | 'end' | 'between';

export interface Size {
  mode: SizingMode;
  // Pixel value, used only when mode === 'fixed'.
  value?: number;
}

export interface FrameNode {
  id: string;
  name: string;
  type: 'frame';

  direction: Direction;

  width: Size;
  height: Size;

  // One numeric padding applied to all four sides (MVP).
  padding: number;
  gap: number;

  align: Align; // cross-axis
  justify: Justify; // main-axis

  // Optional text content rendered inside the box.
  text?: string;

  children: FrameNode[];
}

export interface LayoutDoc {
  version: number;
  root: FrameNode;
}

// Factory for a new frame. New frames hug their contents on both axes and get
// a little internal padding so they are readable in either canvas view.
export function makeFrame(id: string, name: string): FrameNode {
  return {
    id,
    name,
    type: 'frame',
    direction: 'row',
    width: { mode: 'hug' },
    height: { mode: 'hug' },
    padding: 12,
    gap: 0,
    align: 'stretch',
    justify: 'start',
    children: [],
  };
}
