<script lang="ts">
  import type { LayoutDoc } from '../lib/types';
  import { toCompact, toExportJSON, COMPACT_SYNTAX } from '../lib/compact';

  export let doc: LayoutDoc;
  export let onClose: () => void;

  type Tab = 'compact' | 'json';
  let tab: Tab = 'compact';

  $: compact = toCompact(doc);
  $: json = toExportJSON(doc);
  $: current = tab === 'compact' ? compact : json;

  let copied = false;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(current);
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1200);
    } catch {
      copied = false;
    }
  }
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="overlay" on:click={onClose} role="presentation">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="dialog" on:click|stopPropagation role="dialog" aria-label="Export">
    <div class="dialog-header">
      <div class="tabs">
        <button class:active={tab === 'compact'} on:click={() => (tab = 'compact')}>
          Compact
        </button>
        <button class:active={tab === 'json'} on:click={() => (tab = 'json')}>
          JSON
        </button>
      </div>
      <div class="header-actions">
        <button class="copy" on:click={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button class="close" on:click={onClose} aria-label="Close">×</button>
      </div>
    </div>

    {#if tab === 'compact'}
      <pre class="syntax">{COMPACT_SYNTAX}</pre>
    {/if}

    <pre class="output">{current}</pre>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    width: min(720px, 92vw);
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--panel-border);
  }

  .tabs {
    display: flex;
    gap: 6px;
  }

  .tabs button {
    height: 28px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .tabs button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .header-actions {
    display: flex;
    gap: 6px;
  }

  .copy {
    height: 28px;
    padding: 0 12px;
    font-size: 13px;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .close {
    width: 28px;
    height: 28px;
    font-size: 18px;
    line-height: 1;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .syntax {
    margin: 0;
    padding: 10px 12px;
    font-size: 11px;
    color: var(--text-muted);
    background: var(--canvas-bg);
    border-bottom: 1px solid var(--panel-border);
    white-space: pre-wrap;
  }

  .output {
    margin: 0;
    padding: 12px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text);
    white-space: pre;
  }
</style>
