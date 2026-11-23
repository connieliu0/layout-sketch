<script lang="ts">
  import type { FrameNode, Direction } from '../lib/types';
  import { frameToCss } from '../lib/layout';

  export let node: FrameNode;
  export let parentDirection: Direction;
</script>

<!-- Miniature, non-interactive render of a template using the real layout CSS. -->
<div class="mini" style={frameToCss(node, parentDirection)}>
  {#each node.children as child (child.id)}
    <svelte:self node={child} parentDirection={node.direction} />
  {/each}
</div>

<style>
  .mini {
    min-width: 8px;
    min-height: 8px;
    background: var(--frame-bg);
    border: 3px solid var(--frame-border);
  }
</style>
