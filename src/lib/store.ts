import { writable, get } from 'svelte/store';
import type { FrameNode, LayoutDoc } from './types';
import { makeFrame } from './types';
import { sampleDoc } from './sample';
import { loadDoc, saveDoc } from './persistence';

export interface EditorState {
  doc: LayoutDoc;
  // Primary selection — drives the Inspector (a single node).
  selectedId: string | null;
  // Full selection set, in click order. Used by group / auto-layout, which act
  // on multiple sibling frames at once. selectedId is always the last of these
  // (or null when the set is empty).
  selectedIds: string[];
}

// --- tree helpers -----------------------------------------------------------

export function findNode(root: FrameNode, id: string): FrameNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(
  root: FrameNode,
  id: string,
): FrameNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

// True if `maybeAncestor` is `id` itself or an ancestor path contains it — used
// to block reparenting a node into its own subtree.
function isSelfOrDescendant(node: FrameNode, targetId: string): boolean {
  if (node.id === targetId) return true;
  return node.children.some((c) => isSelfOrDescendant(c, targetId));
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `f${Date.now().toString(36)}_${idCounter}`;
}

// --- store ------------------------------------------------------------------

function createInitialState(): EditorState {
  const doc = loadDoc() ?? sampleDoc();
  return { doc, selectedId: doc.root.id, selectedIds: [doc.root.id] };
}

const store = writable<EditorState>(createInitialState());

// Persist on every change (writes are cheap and debouncing is unnecessary here).
store.subscribe((state) => saveDoc(state.doc));

export const editor = store;

// --- undo / redo history ----------------------------------------------------
//
// Every action that changes the document returns a NEW `doc` object (via
// commit() or store.set), whereas selection-only changes keep the same `doc`
// reference. We watch for doc-reference changes and snapshot the *previous*
// document so Cmd/Ctrl+Z can restore it. Snapshots are deep clones that
// preserve ids (unlike cloneSubtree, which re-ids).

const HISTORY_LIMIT = 100;

function cloneNodeExact(n: FrameNode): FrameNode {
  return {
    ...n,
    width: { ...n.width },
    height: { ...n.height },
    children: n.children.map(cloneNodeExact),
  };
}

function cloneDoc(d: LayoutDoc): LayoutDoc {
  return { ...d, root: cloneNodeExact(d.root) };
}

const undoStack: LayoutDoc[] = [];
const redoStack: LayoutDoc[] = [];

let trackedDoc = get(store).doc;
// A deep snapshot of the last-seen document, pushed onto the undo stack the
// moment the document changes again.
let snapshot = cloneDoc(trackedDoc);
// Set while applying an undo/redo so the subscriber doesn't record it as a new
// user edit (which would clobber the redo stack).
let applyingHistory = false;

store.subscribe((state) => {
  if (state.doc === trackedDoc) return; // selection-only change
  trackedDoc = state.doc;
  if (applyingHistory) {
    snapshot = cloneDoc(state.doc);
    return;
  }
  undoStack.push(snapshot);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  snapshot = cloneDoc(state.doc);
});

// Drop ids that no longer exist in `doc`, falling back to the root.
function reconcileSelection(doc: LayoutDoc, prevIds: string[]): {
  selectedId: string | null;
  selectedIds: string[];
} {
  const kept = prevIds.filter((id) => findNode(doc.root, id));
  const selectedIds = kept.length ? kept : [doc.root.id];
  return { selectedIds, selectedId: selectedIds[selectedIds.length - 1] };
}

export function undo(): void {
  if (undoStack.length === 0) return;
  const prev = undoStack.pop() as LayoutDoc;
  redoStack.push(snapshot);
  applyingHistory = true;
  store.update((s) => {
    const doc = cloneDoc(prev);
    return { doc, ...reconcileSelection(doc, s.selectedIds) };
  });
  applyingHistory = false;
}

export function redo(): void {
  if (redoStack.length === 0) return;
  const next = redoStack.pop() as LayoutDoc;
  undoStack.push(snapshot);
  applyingHistory = true;
  store.update((s) => {
    const doc = cloneDoc(next);
    return { doc, ...reconcileSelection(doc, s.selectedIds) };
  });
  applyingHistory = false;
}

// Re-trigger reactivity after an in-place tree mutation.
function commit(state: EditorState): EditorState {
  return { ...state, doc: { ...state.doc } };
}

// --- actions ----------------------------------------------------------------

export function select(id: string | null): void {
  store.update((s) => ({
    ...s,
    selectedId: id,
    selectedIds: id ? [id] : [],
  }));
}

// Add or remove a frame from the selection set (Shift-click on the canvas).
// The toggled id becomes the primary selection when added; when removed, the
// new primary is whatever remains last in the set.
export function toggleSelect(id: string): void {
  store.update((s) => {
    const has = s.selectedIds.includes(id);
    const selectedIds = has
      ? s.selectedIds.filter((x) => x !== id)
      : [...s.selectedIds, id];
    const selectedId = has
      ? (selectedIds[selectedIds.length - 1] ?? null)
      : id;
    return { ...s, selectedIds, selectedId };
  });
}

export function addChild(parentId: string): void {
  store.update((s) => {
    const parent = findNode(s.doc.root, parentId);
    if (!parent) return s;
    const child = makeFrame(nextId(), `div-${parent.children.length + 1}`);
    parent.children.push(child);
    return { ...commit(s), selectedId: child.id, selectedIds: [child.id] };
  });
}

export function remove(id: string): void {
  store.update((s) => {
    if (id === s.doc.root.id) return s; // root cannot be deleted
    const parent = findParent(s.doc.root, id);
    if (!parent) return s;
    const idx = parent.children.findIndex((c) => c.id === id);
    if (idx === -1) return s;
    parent.children.splice(idx, 1);
    const selectedIds = s.selectedIds.filter((x) => x !== id);
    if (selectedIds.length === 0) selectedIds.push(parent.id);
    const selectedId = selectedIds[selectedIds.length - 1] ?? parent.id;
    return { ...commit(s), selectedId, selectedIds };
  });
}

export function rename(id: string, name: string): void {
  store.update((s) => {
    const node = findNode(s.doc.root, id);
    if (!node) return s;
    node.name = name;
    return commit(s);
  });
}

export function setText(id: string, text: string): void {
  store.update((s) => {
    const node = findNode(s.doc.root, id);
    if (!node) return s;
    // Store undefined (not empty string) when cleared, so exports stay clean.
    node.text = text.length > 0 ? text : undefined;
    return commit(s);
  });
}

export function patch(id: string, props: Partial<FrameNode>): void {
  store.update((s) => {
    const node = findNode(s.doc.root, id);
    if (!node) return s;
    Object.assign(node, props);
    return commit(s);
  });
}

function move(id: string, delta: number): void {
  store.update((s) => {
    const parent = findParent(s.doc.root, id);
    if (!parent) return s;
    const idx = parent.children.findIndex((c) => c.id === id);
    const next = idx + delta;
    if (idx === -1 || next < 0 || next >= parent.children.length) return s;
    const [item] = parent.children.splice(idx, 1);
    parent.children.splice(next, 0, item);
    return commit(s);
  });
}

export function moveUp(id: string): void {
  move(id, -1);
}

export function moveDown(id: string): void {
  move(id, 1);
}

// Deep-clone a subtree, assigning a fresh id to every node.
function cloneSubtree(node: FrameNode): FrameNode {
  return {
    ...node,
    id: nextId(),
    width: { ...node.width },
    height: { ...node.height },
    children: node.children.map(cloneSubtree),
  };
}

// Duplicate a frame (with its whole subtree) as the next sibling of the
// original, and select the copy. Root cannot be duplicated (it has no parent).
export function duplicate(id: string): void {
  store.update((s) => {
    if (id === s.doc.root.id) return s;
    const parent = findParent(s.doc.root, id);
    if (!parent) return s;
    const idx = parent.children.findIndex((c) => c.id === id);
    if (idx === -1) return s;
    const copy = cloneSubtree(parent.children[idx]);
    copy.name = `${parent.children[idx].name} copy`;
    parent.children.splice(idx + 1, 0, copy);
    return { ...commit(s), selectedId: copy.id, selectedIds: [copy.id] };
  });
}

// Insert a starter-layout subtree into `parentId` (fresh ids throughout) and
// select it. With `replace`, the parent's existing children are removed first.
export function insertTemplate(
  parentId: string,
  template: FrameNode,
  replace = false,
): void {
  store.update((s) => {
    const parent = findNode(s.doc.root, parentId);
    if (!parent) return s;
    const node = cloneSubtree(template);
    if (replace) parent.children = [];
    parent.children.push(node);
    return { ...commit(s), selectedId: node.id, selectedIds: [node.id] };
  });
}

export function reparent(id: string, newParentId: string): void {
  store.update((s) => {
    if (id === s.doc.root.id) return s; // root can't be reparented
    if (id === newParentId) return s;
    const node = findNode(s.doc.root, id);
    const newParent = findNode(s.doc.root, newParentId);
    if (!node || !newParent) return s;
    // Block moving a node into its own subtree.
    if (isSelfOrDescendant(node, newParentId)) return s;
    const oldParent = findParent(s.doc.root, id);
    if (!oldParent) return s;
    if (oldParent.id === newParentId) return s; // no-op
    const idx = oldParent.children.findIndex((c) => c.id === id);
    oldParent.children.splice(idx, 1);
    newParent.children.push(node);
    return commit(s);
  });
}

export function reset(): void {
  const doc = sampleDoc();
  store.set({ doc, selectedId: doc.root.id, selectedIds: [doc.root.id] });
}

// --- sizing shortcuts -------------------------------------------------------

// Toggle a frame between "fill both axes" and "hug both axes" (double-click on
// the canvas). If it is not already filling both axes, switch to fill; from
// full-fill, switch to hug. Fixed values are discarded by the switch.
export function toggleHugFill(id: string): void {
  store.update((s) => {
    const node = findNode(s.doc.root, id);
    if (!node) return s;
    const filling = node.width.mode === 'fill' && node.height.mode === 'fill';
    const mode = filling ? 'hug' : 'fill';
    node.width = { mode };
    node.height = { mode };
    return commit(s);
  });
}

// Make a frame fill both dimensions of its parent (used when a frame is dropped
// onto another frame).
export function setFill(id: string): void {
  patch(id, { width: { mode: 'fill' }, height: { mode: 'fill' } });
}

// Set one axis of a frame to a fixed pixel value (Ctrl+W / Ctrl+H entry).
export function setFixedSize(
  id: string,
  axis: 'width' | 'height',
  value: number,
): void {
  patch(id, {
    [axis]: { mode: 'fixed', value: Math.max(0, value) },
  } as Partial<FrameNode>);
}

// --- grouping ---------------------------------------------------------------

// Wrap the given sibling frames in a new parent frame, inserted where the first
// member was. `autoLayout` controls whether the wrapper gets auto-layout
// spacing (gap + padding) or is a bare group. Only ids that share a common
// parent are grouped; the rest are ignored. The wrapper hugs its content.
export function group(ids: string[], autoLayout: boolean): void {
  store.update((s) => {
    if (ids.length === 0) return s;
    // Group within the primary member's parent; the root can't be grouped.
    const parent = findParent(s.doc.root, ids[0]);
    if (!parent) return s;
    const idSet = new Set(ids);
    const members = parent.children.filter((c) => idSet.has(c.id));
    if (members.length === 0) return s;
    const firstIdx = parent.children.findIndex((c) => c.id === members[0].id);
    const memberSet = new Set(members);
    parent.children = parent.children.filter((c) => !memberSet.has(c));

    const g = makeFrame(nextId(), autoLayout ? 'auto-layout' : 'group');
    g.width = { mode: 'hug' };
    g.height = { mode: 'hug' };
    g.direction = parent.direction;
    if (autoLayout) {
      g.gap = 16;
      g.padding = 16;
    }
    g.children = members;
    parent.children.splice(firstIdx, 0, g);
    return { ...commit(s), selectedId: g.id, selectedIds: [g.id] };
  });
}

// Dissolve a wrapper frame, promoting its children into its parent at the
// wrapper's position (Cmd/Ctrl+Shift+G). The root cannot be ungrouped.
export function ungroup(id: string): void {
  store.update((s) => {
    if (id === s.doc.root.id) return s;
    const parent = findParent(s.doc.root, id);
    if (!parent) return s;
    const idx = parent.children.findIndex((c) => c.id === id);
    if (idx === -1) return s;
    const grp = parent.children[idx];
    const kids = grp.children;
    parent.children.splice(idx, 1, ...kids);
    const selectedIds = kids.length ? kids.map((c) => c.id) : [parent.id];
    const selectedId = selectedIds[selectedIds.length - 1];
    return { ...commit(s), selectedId, selectedIds };
  });
}

// --- drag-and-drop state ----------------------------------------------------
// The id of the frame currently being dragged on the canvas (null when idle).
// Shared so drop targets can decide whether to highlight during dragover,
// where the DataTransfer payload is not readable.
export const draggingId = writable<string | null>(null);

// True while the user is dragging the "new box" handle from the toolbar.
export const draggingNew = writable<boolean>(false);

// Which frame is showing a quick fixed-size input, and for which axis. Null
// when no input is open. Opened by Ctrl+W / Ctrl+H on the selected frame;
// cleared on commit (Enter), cancel (Esc) or blur.
export interface SizeInput {
  id: string;
  axis: 'width' | 'height';
  prevMode: import('./types').SizingMode;
  prevValue: number | undefined;
}
export const sizeInput = writable<SizeInput | null>(null);

export function openSizeInput(axis: 'width' | 'height'): void {
  const s = get(store);
  const id = s.selectedId;
  if (!id) return;
  const node = findNode(s.doc.root, id);
  if (!node) return;
  const dim = node[axis];
  const prevMode = dim.mode;
  const prevValue = dim.value;
  if (dim.mode !== 'fixed') {
    const el = document.querySelector<HTMLElement>(`[data-frame-id="${id}"]`);
    const measured = el
      ? axis === 'width' ? el.offsetWidth : el.offsetHeight
      : 100;
    store.update((state) => {
      const n = findNode(state.doc.root, id);
      if (n) n[axis] = { mode: 'fixed', value: Math.round(measured) };
      return commit(state);
    });
  }
  sizeInput.set({ id, axis, prevMode, prevValue });
}

export function cancelSizeInput(): void {
  const si = get(sizeInput);
  if (!si) return;
  store.update((state) => {
    const n = findNode(state.doc.root, si.id);
    if (n) n[si.axis] = { mode: si.prevMode, value: si.prevValue };
    return commit(state);
  });
  sizeInput.set(null);
}

export function confirmSizeInput(): void {
  sizeInput.set(null);
}

// Can `dragId` be dropped INTO `targetId` (becoming its child)? Blocks dropping
// a node into itself, into its own subtree, or back into its current parent.
export function canReparent(
  dragId: string | null,
  targetId: string,
): boolean {
  if (!dragId || dragId === targetId) return false;
  const s = get(store);
  if (dragId === s.doc.root.id) return false; // root can't move
  const dragNode = findNode(s.doc.root, dragId);
  if (!dragNode) return false;
  if (isSelfOrDescendant(dragNode, targetId)) return false; // no cycles
  const currentParent = findParent(s.doc.root, dragId);
  if (currentParent && currentParent.id === targetId) return false; // no-op
  return true;
}

// Convenience for actions triggered without the current state in hand.
export function selectedNode(): FrameNode | null {
  const s = get(store);
  return s.selectedId ? findNode(s.doc.root, s.selectedId) : null;
}
