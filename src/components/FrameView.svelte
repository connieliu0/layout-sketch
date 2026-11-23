<script lang="ts">
  import type { FrameNode, Direction } from '../lib/types';
  import { frameToCss } from '../lib/layout';
  import {
    select,
    toggleSelect,
    reparent,
    rename,
    setText,
    toggleHugFill,
    setFill,
    addChild,
    draggingId,
    draggingNew,
    canReparent,
  } from '../lib/store';
  import FrameView from './FrameView.svelte';

  export let node: FrameNode;
  export let parentDirection: Direction | null;
  export let selectedId: string | null;
  export let selectedIds: string[] = [];
  export let viewMode: 'frame' | 'content' = 'frame';
  export let parentIsSelected: boolean = false;

  $: style = frameToCss(node, parentDirection);
  $: isSelected = !isRoot && (selectedIds.includes(node.id) || node.id === selectedId);

  $: isRoot = parentDirection === null;
  $: hasChildren = node.children.length > 0;

  let editing = false;
  let editingText = false;
  let cancelling = false;
  let dragOver = false;

  $: canDrag = !isRoot && !editing;

  // --- selection ---
  function onClick(event: MouseEvent) {
    // Stop propagation so clicking a nested frame selects the innermost one.
    event.stopPropagation();
    // Shift-click extends the selection (for group / auto-layout on several
    // frames); a plain click replaces it.
    if (event.shiftKey) toggleSelect(node.id);
    else select(node.id);
  }

  // Double-click toggles the frame between filling and hugging both axes.
  function onDblClick(event: MouseEvent) {
    event.stopPropagation();
    select(node.id);
    toggleHugFill(node.id);
  }


  function onKeydown(event: KeyboardEvent) {
    if (editing || editingText) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      select(node.id);
      if (viewMode === 'content') {
        editingText = true;
      } else {
        editing = true;
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      select(node.id);
    }
  }

  // --- inline name editing ---
  function focusEdit(el: HTMLElement) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function onEditBlur(event: FocusEvent) {
    const el = event.currentTarget as HTMLElement;
    if (cancelling) {
      cancelling = false;
      editing = false;
      return;
    }
    const next = (el.textContent ?? '').trim();
    if (next) rename(node.id, next);
    editing = false;
  }

  function onEditKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelling = true;
      (event.currentTarget as HTMLElement).blur();
    }
  }

  // --- inline text editing ---
  function focusTextEdit(el: HTMLElement) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function onTextEditBlur(event: FocusEvent) {
    const el = event.currentTarget as HTMLElement;
    if (cancelling) {
      cancelling = false;
      editingText = false;
      return;
    }
    const next = (el.textContent ?? '').trim();
    setText(node.id, next);
    editingText = false;
  }

  function onTextEditKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelling = true;
      (event.currentTarget as HTMLElement).blur();
    }
  }

  // --- drag to nest ---
  function onDragStart(event: DragEvent) {
    event.stopPropagation();
    draggingId.set(node.id);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', node.id);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  function onDragEnd() {
    draggingId.set(null);
    dragOver = false;
  }

  function onDragOver(event: DragEvent) {
    event.stopPropagation();
    if ($draggingNew) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      dragOver = true;
      return;
    }
    if (!canReparent($draggingId, node.id)) {
      dragOver = false;
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dragOver = true;
  }

  function onDragLeave(event: DragEvent) {
    event.stopPropagation();
    dragOver = false;
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragOver = false;
    if ($draggingNew || event.dataTransfer?.getData('application/x-new-box')) {
      addChild(node.id);
      draggingNew.set(false);
      return;
    }
    const id = event.dataTransfer?.getData('text/plain') || $draggingId;
    if (id && canReparent(id, node.id)) {
      reparent(id, node.id);
      setFill(id);
      select(id);
    }
    draggingId.set(null);
  }
</script>

<div
  class="frame"
  class:selected={isSelected}
  class:drop-target={dragOver}
  class:leaf={!hasChildren}
  class:hug-title={viewMode === 'frame' && !hasChildren}
  style={style}
  data-frame-id={node.id}
  draggable={canDrag}
  on:click={onClick}
  on:dblclick={onDblClick}
  on:keydown={onKeydown}
  on:dragstart={onDragStart}
  on:dragend={onDragEnd}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
  role="button"
  tabindex="0"
  title={node.name}
>
  {#if editing}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span
      class="name editing"
      contenteditable="true"
      use:focusEdit
      on:blur={onEditBlur}
      on:keydown={onEditKeydown}
      on:click|stopPropagation
      on:dblclick|stopPropagation
    >{node.name}</span>
  {:else if viewMode === 'frame' && (!hasChildren || isSelected) && !parentIsSelected}
    <span class="name" class:corner={hasChildren} class:flow={!hasChildren}>{node.name}</span>
  {/if}

  {#if editingText}
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <span
      class="text editing"
      contenteditable="true"
      use:focusTextEdit
      on:blur={onTextEditBlur}
      on:keydown={onTextEditKeydown}
      on:click|stopPropagation
      on:dblclick|stopPropagation
    >{node.text ?? ''}</span>
  {:else if node.text}
    <span class="text" class:text-hidden={viewMode === 'frame'}>{node.text}</span>
  {/if}

  {#each node.children as child (child.id)}
    <FrameView
      node={child}
      parentDirection={node.direction}
      {selectedId}
      {selectedIds}
      {viewMode}
      parentIsSelected={isSelected}
    />
  {/each}
</div>

<style>
  .frame {
    position: relative;
    min-width: 24px;
    min-height: 24px;
    border: 1px solid var(--frame-border-container);
    background: var(--frame-bg);
    cursor: pointer;
  }

  .frame.leaf {
    border-color: var(--frame-border-leaf);
  }

  .frame:hover:not(:has(.frame:hover)) {
    background: var(--frame-bg-hover);
  }

  /* In frame mode a hug-sized leaf gets a min-content floor so its label stays
     readable without changing fill-sized structural frames in the default
     layout. */
  .frame.hug-title {
    min-width: max(24px, min-content);
    min-height: max(24px, min-content);
  }

  .frame.selected {
    outline: 2px solid var(--accent);
    outline-offset: -1px;
    z-index: 1;
  }

  .frame.selected > .name {
    color: #1c1e21;
  }

  .frame.drop-target {
    outline: 2px dashed var(--accent);
    outline-offset: -1px;
    background: var(--drop-bg);
  }

  .name {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90%;
    text-align: center;
    font-size: 48px;
    line-height: 1.2;
    color: var(--frame-label);
    pointer-events: none;
    user-select: none;
    overflow-wrap: anywhere;
    z-index: 2;
  }

  /* When a frame has children, show its name as a small corner tag so it does
     not overlap the content nested inside it. */
  .name.corner {
    top: 2px;
    left: 2px;
    transform: none;
    max-width: calc(100% - 4px);
    text-align: left;
  }

  /* Frame-mode leaf label sits in normal flow (centered via auto margins) so it
     contributes to the box's min-content size and the box hugs it. nowrap keeps
     the title on a single line rather than wrapping and spilling. */
  .name.flow {
    position: static;
    transform: none;
    margin: auto;
    max-width: none;
    white-space: nowrap;
  }

  .name.editing {
    pointer-events: auto;
    cursor: text;
    user-select: text;
    outline: 1px solid var(--accent);
    border-radius: 2px;
    padding: 0 2px;
    background: var(--frame-bg);
  }

  .text {
    font-size: 48px;
    color: var(--text);
    pointer-events: none;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .text.text-hidden {
    visibility: hidden;
  }

  .text.editing {
    pointer-events: auto;
    cursor: text;
    user-select: text;
    outline: 1px solid var(--accent);
    border-radius: 2px;
    padding: 0 2px;
    background: var(--frame-bg);
  }

</style>
