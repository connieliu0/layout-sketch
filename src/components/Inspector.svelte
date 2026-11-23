<script lang="ts">
  import { tick } from 'svelte';
  import type {
    FrameNode,
    LayoutDoc,
    SizingMode,
    Direction,
    Align,
    Justify,
  } from '../lib/types';
  import {
    rename,
    patch,
    moveUp,
    moveDown,
    reparent,
    duplicate,
    sizeInput,
    cancelSizeInput,
    confirmSizeInput,
  } from '../lib/store';

  export let node: FrameNode | null;
  export let doc: LayoutDoc;
  export let onExport: () => void;
  export let onReset: () => void;

  const DIRECTIONS: Direction[] = ['row', 'column'];
  const MODES: SizingMode[] = ['fixed', 'fill', 'hug'];
  const ALIGNS: Align[] = ['start', 'center', 'end', 'stretch'];
  const JUSTIFIES: Justify[] = ['start', 'center', 'end', 'between'];

  $: isRoot = !!node && node.id === doc.root.id;

  // --- reparent targets: every frame except the node itself and its subtree ---
  function collectTargets(
    current: FrameNode,
    excludeId: string,
    out: FrameNode[],
    excluded: boolean,
  ): void {
    const isExcluded = excluded || current.id === excludeId;
    if (!isExcluded) out.push(current);
    for (const child of current.children) {
      collectTargets(child, excludeId, out, isExcluded);
    }
  }

  let targets: FrameNode[] = [];
  let currentParentId = '';
  $: {
    if (node && !isRoot) {
      const out: FrameNode[] = [];
      collectTargets(doc.root, node.id, out, false);
      targets = out;
      currentParentId = findParentId(doc.root, node.id) ?? '';
    } else {
      targets = [];
      currentParentId = '';
    }
  }

  function findParentId(root: FrameNode, id: string): string | null {
    for (const child of root.children) {
      if (child.id === id) return root.id;
      const found = findParentId(child, id);
      if (found) return found;
    }
    return null;
  }

  // --- control handlers ---
  function onName(e: Event) {
    if (!node) return;
    rename(node.id, (e.target as HTMLInputElement).value);
  }

  function setMode(axis: 'width' | 'height', mode: SizingMode) {
    if (!node) return;
    const prev = node[axis];
    const value = mode === 'fixed' ? (prev.value ?? 100) : undefined;
    patch(node.id, { [axis]: { mode, value } } as Partial<FrameNode>);
  }

  function setFixedValue(axis: 'width' | 'height', raw: string) {
    if (!node) return;
    const value = Math.max(0, Number(raw) || 0);
    patch(node.id, { [axis]: { mode: 'fixed', value } } as Partial<FrameNode>);
  }

  function setNumber(key: 'padding' | 'gap', raw: string) {
    if (!node) return;
    patch(node.id, { [key]: Math.max(0, Number(raw) || 0) });
  }

  function onReparent(e: Event) {
    if (!node) return;
    const id = (e.target as HTMLSelectElement).value;
    if (id) reparent(node.id, id);
  }

  function onDirection(e: Event) {
    if (!node) return;
    patch(node.id, {
      direction: (e.currentTarget as HTMLSelectElement).value as Direction,
    });
  }

  function onAlign(e: Event) {
    if (!node) return;
    patch(node.id, {
      align: (e.currentTarget as HTMLSelectElement).value as Align,
    });
  }

  function onJustify(e: Event) {
    if (!node) return;
    patch(node.id, {
      justify: (e.currentTarget as HTMLSelectElement).value as Justify,
    });
  }

  function onFixedInput(axis: 'width' | 'height', e: Event) {
    setFixedValue(axis, (e.currentTarget as HTMLInputElement).value);
  }

  function onNumberInput(key: 'padding' | 'gap', e: Event) {
    setNumber(key, (e.currentTarget as HTMLInputElement).value);
  }

  let widthFixedInput: HTMLInputElement | null = null;
  let heightFixedInput: HTMLInputElement | null = null;
  let focusedQuickSizeInput: string | null = null;

  function focusSizeInput(axis: 'width' | 'height') {
    tick().then(() => {
      tick().then(() => {
        const el = axis === 'width' ? widthFixedInput : heightFixedInput;
        if (el) {
          el.scrollIntoView({ block: 'nearest' });
          el.focus();
          el.select();
        }
      });
    });
  }

  // The size input updates the selected node on every keystroke. Only focus
  // and select it once when the Ctrl+W/Ctrl+H shortcut opens it; otherwise the
  // selection would be reset after each digit and replace the previous value.
  $: {
    const quickSizeKey = $sizeInput
      ? `${$sizeInput.id}:${$sizeInput.axis}`
      : null;
    if (
      quickSizeKey &&
      node &&
      $sizeInput?.id === node.id &&
      node[$sizeInput.axis].mode === 'fixed' &&
      focusedQuickSizeInput !== quickSizeKey
    ) {
      focusedQuickSizeInput = quickSizeKey;
      focusSizeInput($sizeInput.axis);
    } else if (!quickSizeKey) {
      focusedQuickSizeInput = null;
    }
  }

  function onSizeInputKeydown(axis: 'width' | 'height', e: KeyboardEvent) {
    if (e.key === 'Escape' && $sizeInput?.axis === axis) {
      e.preventDefault();
      cancelSizeInput();
    } else if (e.key === 'Enter' && $sizeInput?.axis === axis) {
      e.preventDefault();
      confirmSizeInput();
      (e.currentTarget as HTMLInputElement).blur();
    }
  }

  function onSizeInputBlur(axis: 'width' | 'height') {
    if ($sizeInput?.axis === axis) {
      cancelSizeInput();
    }
  }
</script>

<aside class="inspector">
  {#if !node}
    <div class="empty">Select a frame to edit its properties.</div>
    <div class="body">
      <div class="panel-actions">
        <button on:click={onExport}>Export</button>
        <button on:click={onReset}>Reset</button>
      </div>
    </div>
  {:else}
    <div class="body">
      <label class="field">
        <span>Name</span>
        <input type="text" value={node.name} on:input={onName} />
      </label>

      <label class="field">
        <span>Direction</span>
        <select value={node.direction} on:change={onDirection}>
          {#each DIRECTIONS as d}
            <option value={d}>{d === 'row' ? 'Horizontal (row)' : 'Vertical (column)'}</option>
          {/each}
        </select>
      </label>

      <div class="field">
        <span>Width</span>
        <div class="segmented">
          {#each MODES as m}
            <button
              class:active={node.width.mode === m}
              on:click={() => setMode('width', m)}
            >{m}</button>
          {/each}
        </div>
        {#if node.width.mode === 'fixed'}
          <input
            bind:this={widthFixedInput}
            class="num"
            type="number"
            min="0"
            value={node.width.value ?? 0}
            on:input={(e) => onFixedInput('width', e)}
            on:keydown={(e) => onSizeInputKeydown('width', e)}
            on:blur={() => onSizeInputBlur('width')}
          />
        {/if}
      </div>

      <div class="field">
        <span>Height</span>
        <div class="segmented">
          {#each MODES as m}
            <button
              class:active={node.height.mode === m}
              on:click={() => setMode('height', m)}
            >{m}</button>
          {/each}
        </div>
        {#if node.height.mode === 'fixed'}
          <input
            bind:this={heightFixedInput}
            class="num"
            type="number"
            min="0"
            value={node.height.value ?? 0}
            on:input={(e) => onFixedInput('height', e)}
            on:keydown={(e) => onSizeInputKeydown('height', e)}
            on:blur={() => onSizeInputBlur('height')}
          />
        {/if}
      </div>

      <div class="row2">
        <label class="field">
          <span>Padding</span>
          <input
            class="num"
            type="number"
            min="0"
            value={node.padding}
            on:input={(e) => onNumberInput('padding', e)}
          />
        </label>
        <label class="field">
          <span>Gap</span>
          <input
            class="num"
            type="number"
            min="0"
            value={node.gap}
            on:input={(e) => onNumberInput('gap', e)}
          />
        </label>
      </div>

      <label class="field">
        <span>Align (cross-axis)</span>
        <select value={node.align} on:change={onAlign}>
          {#each ALIGNS as a}
            <option value={a}>{a}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Justify (main-axis)</span>
        <select value={node.justify} on:change={onJustify}>
          {#each JUSTIFIES as j}
            <option value={j}>{j}</option>
          {/each}
        </select>
      </label>

      {#if !isRoot}
        <label class="field">
          <span>Parent</span>
          <select value={currentParentId} on:change={onReparent}>
            {#each targets as t}
              <option value={t.id}>{t.name}</option>
            {/each}
          </select>
        </label>

        <div class="actions">
          <button on:click={() => moveUp(node.id)}>Move up</button>
          <button on:click={() => moveDown(node.id)}>Move down</button>
          <button on:click={() => duplicate(node.id)}>Duplicate</button>
        </div>
      {/if}

      <div class="panel-actions">
        <button on:click={onExport}>Export</button>
        <button on:click={onReset}>Reset</button>
      </div>
    </div>
  {/if}
</aside>

<style>
  .inspector {
    flex: 0 0 260px;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--panel-border);
    background: var(--panel-bg);
    overflow: hidden;
  }

  .body {
    flex: 1 1 0;
    overflow: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .empty {
    padding: 12px;
    font-size: 12px;
    color: var(--text-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field > span {
    font-size: 11px;
    color: var(--text-muted);
  }

  .row2 {
    display: flex;
    gap: 10px;
  }

  .row2 .field {
    flex: 1 1 0;
  }

  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    box-sizing: border-box;
    height: 28px;
    padding: 0 6px;
    font-size: 13px;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
  }

  .num {
    max-width: 100%;
  }

  .segmented {
    display: flex;
    gap: 4px;
  }

  .segmented button {
    flex: 1 1 0;
    height: 28px;
    font-size: 12px;
    text-transform: capitalize;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .segmented button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .actions button {
    flex: 1 1 auto;
    height: 28px;
    font-size: 12px;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .panel-actions {
    display: flex;
    gap: 6px;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
  }

  .panel-actions button {
    flex: 1 1 0;
    height: 28px;
    font-size: 12px;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }
</style>
