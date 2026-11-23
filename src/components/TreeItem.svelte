<script lang="ts">
  import type { FrameNode } from '../lib/types';
  import { select, toggleSelect, addChild } from '../lib/store';
  import TreeItem from './TreeItem.svelte';

  export let node: FrameNode;
  export let selectedId: string | null;
  export let selectedIds: string[] = [];
  export let depth = 0;

  $: isSelected = selectedIds.includes(node.id) || node.id === selectedId;

  function onRowClick(event: MouseEvent) {
    // Shift-click extends the selection, mirroring the canvas behaviour.
    if (event.shiftKey) toggleSelect(node.id);
    else select(node.id);
  }

  function onAdd(event: MouseEvent) {
    event.stopPropagation();
    addChild(node.id);
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (event.shiftKey) toggleSelect(node.id);
      else select(node.id);
    }
  }
</script>

<div
  class="row"
  class:selected={isSelected}
  style={`padding-left: ${depth * 14 + 8}px`}
  on:click={onRowClick}
  on:keydown={onKeydown}
  role="button"
  tabindex="0"
>
  <span class="name">{node.name}</span>
  <button class="add" title="Add child frame" on:click={onAdd}>+</button>
</div>

{#each node.children as child (child.id)}
  <TreeItem node={child} {selectedId} {selectedIds} depth={depth + 1} />
{/each}

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    height: 26px;
    padding-right: 8px;
    font-size: 13px;
    cursor: pointer;
    border-left: 2px solid transparent;
  }

  .row:hover {
    background: var(--panel-hover);
  }

  .row.selected {
    background: var(--panel-selected);
    border-left-color: var(--accent);
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .add {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    line-height: 1;
    padding: 0;
    border: 1px solid var(--control-border);
    background: var(--control-bg);
    color: var(--text);
    border-radius: 3px;
    cursor: pointer;
    opacity: 0;
  }

  .row:hover .add,
  .row.selected .add {
    opacity: 1;
  }
</style>
