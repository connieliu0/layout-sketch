<script lang="ts">
  import {
    editor,
    reset,
    findNode,
    addChild,
    remove,
    duplicate,
    group,
    ungroup,
    undo,
    redo,
    openSizeInput,
    draggingNew,
  } from './lib/store';
  import Hierarchy from './components/Hierarchy.svelte';
  import Canvas from './components/Canvas.svelte';
  import Inspector from './components/Inspector.svelte';
  import ExportPanel from './components/ExportPanel.svelte';
  import StarterPanel from './components/StarterPanel.svelte';

  let showExport = false;
  let showStarters = false;

  // Canvas display mode: 'frame' shows div names only; 'content' hides the
  // names and shows each box's text content instead.
  let viewMode: 'frame' | 'content' = 'frame';

  $: state = $editor;
  $: selected = state.selectedId
    ? findNode(state.doc.root, state.selectedId)
    : null;

  // Add a box inside the selected frame (or the root if nothing is selected).
  function addBox() {
    addChild(selected ? selected.id : state.doc.root.id);
  }

  // Drag-to-add: when the user drags the add-box handle onto the canvas, we
  // create a new child in whichever frame receives the drop. The FrameView
  // drop handler already calls addChild/reparent — we set a special transfer
  // type so it knows to create rather than move.
  function onAddDragStart(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/x-new-box', 'true');
      event.dataTransfer.effectAllowed = 'copy';
    }
    draggingNew.set(true);
  }

  function onAddDragEnd() {
    draggingNew.set(false);
  }

  function isEditableTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      el.isContentEditable
    );
  }

  // Delete / Backspace removes the selected box, unless the user is typing in a
  // field or editing text inline, or the root is selected.
  function onWindowKeydown(event: KeyboardEvent) {
    if (isEditableTarget(event.target)) return;

    const meta = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    // Ctrl+W / Ctrl+H open a fixed-size input on the hovered frame (width /
    // height). Ctrl specifically, so Cmd+W still closes the tab as usual.
    if (event.ctrlKey && !event.metaKey) {
      const code = event.code?.toLowerCase();
      if (key === 'w' || key === 'h' || code === 'keyw' || code === 'keyh') {
        event.preventDefault();
        const isWidth = key === 'w' || code === 'keyw';
        openSizeInput(isWidth ? 'width' : 'height');
        return;
      }
    }

    // Cmd/Ctrl+Z undoes; Cmd/Ctrl+Shift+Z (or Cmd/Ctrl+Y) redoes.
    if (meta && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (meta && key === 'y') {
      event.preventDefault();
      redo();
      return;
    }

    // Cmd/Ctrl+D duplicates the selected box (overriding the browser default).
    if (meta && key === 'd') {
      event.preventDefault();
      if (selected && selected.id !== state.doc.root.id) {
        duplicate(selected.id);
      }
      return;
    }

    // Cmd/Ctrl+Shift+G ungroups the selected wrapper frame. Checked before the
    // plain Cmd+G so the Shift combo isn't swallowed by it.
    if (meta && event.shiftKey && key === 'g') {
      event.preventDefault();
      if (selected) ungroup(selected.id);
      return;
    }

    // Cmd/Ctrl+G or Shift+G groups the selected frames into a plain wrapper.
    if ((meta && key === 'g') || (event.shiftKey && !meta && key === 'g')) {
      event.preventDefault();
      if (state.selectedIds.length) group(state.selectedIds, false);
      return;
    }

    // Shift+A wraps the selected frames in an auto-layout parent.
    if (event.shiftKey && !meta && key === 'a') {
      event.preventDefault();
      if (state.selectedIds.length) group(state.selectedIds, true);
      return;
    }

    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (!selected || selected.id === state.doc.root.id) return;
    event.preventDefault();
    remove(selected.id);
  }
</script>

<svelte:window on:keydown={onWindowKeydown} />

<div class="app">
  <div class="workspace">
    <Hierarchy
      doc={state.doc}
      selectedId={state.selectedId}
      selectedIds={state.selectedIds}
    />
    <div class="canvas-area">
      <Canvas
        doc={state.doc}
        selectedId={state.selectedId}
        selectedIds={state.selectedIds}
        {viewMode}
      />
      <div class="floating-toolbars">
        <div class="floating-toolbar">
          <button on:click={() => (showStarters = true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5" />
              <rect x="2" y="9" width="12" height="5" rx="1" stroke="currentColor" stroke-width="1.5" />
            </svg>
            Section
          </button>
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <button
            class="add-box"
            draggable="true"
            on:click={addBox}
            on:dragstart={onAddDragStart}
            on:dragend={onAddDragEnd}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            Div
          </button>
        </div>
        <div class="floating-toolbar">
          <button
            class:active={viewMode === 'frame'}
            on:click={() => (viewMode = 'frame')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5" />
              <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" stroke-width="1.5" />
            </svg>
            Frame
          </button>
          <button
            class:active={viewMode === 'content'}
            on:click={() => (viewMode = 'content')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <line x1="3" y1="4" x2="13" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="3" y1="8" x2="10" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              <line x1="3" y1="12" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            Content
          </button>
        </div>
      </div>
    </div>
    <Inspector
      node={selected}
      doc={state.doc}
      onExport={() => (showExport = true)}
      onReset={reset}
    />
  </div>
</div>

{#if showStarters}
  <StarterPanel
    targetId={selected ? selected.id : state.doc.root.id}
    targetName={selected ? selected.name : state.doc.root.name}
    onClose={() => (showStarters = false)}
  />
{/if}

{#if showExport}
  <ExportPanel doc={state.doc} onClose={() => (showExport = false)} />
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .workspace {
    flex: 1 1 0;
    display: flex;
    min-height: 0;
  }

  .canvas-area {
    flex: 1 1 0;
    position: relative;
    min-width: 0;
    display: flex;
  }

  .floating-toolbars {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    z-index: 10;
  }

  .floating-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    /* border-radius: 10px; */
    /* box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12); */
  }

  .floating-toolbar button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--text-muted);
    background: none;
    border: none;
    /* border-radius: 6px; */
    cursor: pointer;
    white-space: nowrap;
  }

  .floating-toolbar button:hover {
    color: var(--text);
    background: var(--panel-hover);
  }

  .floating-toolbar button.active {
    background: var(--accent);
    color: #ffffff;
  }

  .add-box {
    cursor: grab;
  }

  .add-box:active {
    cursor: grabbing;
  }
</style>
