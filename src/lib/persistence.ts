import type { LayoutDoc } from './types';
import { DOC_VERSION } from './sample';

const STORAGE_KEY = 'layout-sketch:doc';

export function saveDoc(doc: LayoutDoc): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Ignore storage failures (private mode, quota, disabled storage).
  }
}

export function loadDoc(): LayoutDoc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LayoutDoc;
    // Minimal validation + version gate; fall back to the sample on mismatch.
    if (
      !parsed ||
      parsed.version !== DOC_VERSION ||
      !parsed.root ||
      parsed.root.type !== 'frame'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDoc(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
