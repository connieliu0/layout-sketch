<script lang="ts">
  import { TEMPLATE_CATEGORIES, type Template } from '../lib/templates';
  import { insertTemplate } from '../lib/store';
  import TemplatePreview from './TemplatePreview.svelte';

  // Frame the starter layout is inserted into, and its display name.
  export let targetId: string;
  export let targetName: string;
  export let onClose: () => void;

  let category = TEMPLATE_CATEGORIES[0].name;
  let replace = false;

  $: templates =
    TEMPLATE_CATEGORIES.find((c) => c.name === category)?.templates ?? [];

  function choose(t: Template) {
    insertTemplate(targetId, t.build(), replace);
    onClose();
  }
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="overlay" on:click={onClose} role="presentation">
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="dialog" on:click|stopPropagation role="dialog" aria-label="Starter layouts">
    <div class="dialog-header">
      <div class="title">Starter layouts</div>
      <button class="close" on:click={onClose} aria-label="Close">×</button>
    </div>

    <div class="body">
      <nav class="categories">
        {#each TEMPLATE_CATEGORIES as c}
          <button
            class:active={c.name === category}
            on:click={() => (category = c.name)}>{c.name}</button>
        {/each}
      </nav>

      <div class="grid">
        {#each templates as t (t.id)}
          <button class="card" on:click={() => choose(t)}>
            <div class="thumb">
              <div class="stage">
                <TemplatePreview node={t.build()} parentDirection="column" />
              </div>
            </div>
            <div class="name">{t.name}</div>
            <div class="desc">{t.description}</div>
          </button>
        {/each}
      </div>
    </div>

    <div class="dialog-footer">
      <span>Inserts into <strong>{targetName}</strong></span>
      <label>
        <input type="checkbox" bind:checked={replace} />
        Replace its current contents
      </label>
    </div>
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
    width: min(880px, 94vw);
    height: min(620px, 88vh);
    display: flex;
    flex-direction: column;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    overflow: hidden;
  }

  .dialog-header,
  .dialog-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .dialog-header {
    border-bottom: 1px solid var(--panel-border);
  }

  .dialog-footer {
    border-top: 1px solid var(--panel-border);
    color: var(--text-muted);
  }

  .dialog-footer label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text);
    cursor: pointer;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
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

  .body {
    flex: 1 1 0;
    display: flex;
    min-height: 0;
  }

  .categories {
    width: 160px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-right: 1px solid var(--panel-border);
  }

  .categories button {
    padding: 8px 10px;
    font-size: 13px;
    text-align: left;
    color: var(--text);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .categories button:hover {
    background: var(--panel-hover);
  }

  .categories button.active {
    background: var(--panel-selected);
    font-weight: 600;
  }

  .grid {
    flex: 1 1 0;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 12px;
    padding: 12px;
    overflow-y: auto;
  }

  .card {
    width: 204px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    text-align: left;
    color: var(--text);
    background: var(--control-bg);
    border: 1px solid var(--control-border);
    border-radius: 6px;
    cursor: pointer;
  }

  .card:hover {
    border-color: var(--accent);
  }

  /* The preview is laid out at 1200 x 780 and scaled down to fit 186 x 121. */
  .thumb {
    width: 186px;
    height: 121px;
    overflow: hidden;
    background: var(--canvas-bg);
    border-radius: 4px;
    pointer-events: none;
  }

  .stage {
    width: 1200px;
    height: 780px;
    display: flex;
    flex-direction: column;
    padding: 24px;
    transform: scale(0.155);
    transform-origin: top left;
  }

  .name {
    margin-top: 4px;
    font-size: 13px;
    font-weight: 600;
  }

  .desc {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
