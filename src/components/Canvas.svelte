<script lang="ts">
  import type { LayoutDoc } from '../lib/types';
  import FrameView from './FrameView.svelte';

  export let doc: LayoutDoc;
  export let selectedId: string | null;
  export let selectedIds: string[] = [];
  export let viewMode: 'frame' | 'content' = 'frame';

  // The artboard is a fixed landscape canvas at the native pixel ratio of the
  // screen we are designing for. It never changes size — frames are placed on
  // top of it. (3024 × 1964 native pixels.)
  const ARTBOARD_W = 3024;
  const ARTBOARD_H = 1964;

  // The viewport we have to fit the artboard into. We scale the whole artboard
  // down so it is fully visible, keeping its aspect ratio locked.
  let vpW = 0;
  let vpH = 0;

  const PAD = 32;
  $: scale =
    vpW > 0 && vpH > 0
      ? Math.min((vpW - PAD * 2) / ARTBOARD_W, (vpH - PAD * 2) / ARTBOARD_H)
      : 1;
</script>

<div class="canvas" bind:clientWidth={vpW} bind:clientHeight={vpH}>
  <!-- Scaled wrapper reserves the on-screen footprint so the flex centering is
       correct even though the artboard itself is transformed. -->
  <div
    class="viewport"
    style="width: {ARTBOARD_W * scale}px; height: {ARTBOARD_H * scale}px;"
  >
    <div
      class="artboard"
      style="width: {ARTBOARD_W}px; height: {ARTBOARD_H}px; transform: scale({scale});"
    >
      <!-- Frames live on top of the fixed landscape canvas. -->
      <div class="frames">
        <FrameView
          node={doc.root}
          parentDirection={null}
          {selectedId}
          {selectedIds}
          {viewMode}
        />
      </div>
    </div>
  </div>
</div>

<style>
  .canvas {
    flex: 1 1 0;
    min-width: 0;
    overflow: auto;
    background: var(--canvas-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 32px 64px;
  }

  .viewport {
    flex: 0 0 auto;
  }

  /* The fixed landscape artboard. Scaled from the top-left corner. */
  .artboard {
    position: relative;
    transform-origin: top left;
    background: #ffffff;
    /* box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18); */
  }

  /* Frames are placed on top of the artboard. The layer fills the whole
     artboard so a root frame set to Fill expands to the entire canvas. */
  .frames {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
