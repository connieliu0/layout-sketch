<script lang="ts">
  import type { LayoutDoc } from '../lib/types';
  import TreeItem from './TreeItem.svelte';

  export let doc: LayoutDoc;
  export let selectedId: string | null;
  export let selectedIds: string[] = [];
</script>

<aside class="hierarchy">
  <div class="tree">
    <TreeItem node={doc.root} {selectedId} {selectedIds} />
  </div>
</aside>

<style>
  .hierarchy {
    flex: 0 0 220px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--panel-border);
    background: var(--panel-bg);
    overflow: hidden;
  }

  .tree {
    flex: 1 1 0;
    overflow: auto;
    padding: 4px 0;
  }
</style>
