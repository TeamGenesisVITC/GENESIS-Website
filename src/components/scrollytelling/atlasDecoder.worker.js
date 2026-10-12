// Decodes one frame atlas and slices it into one bitmap per frame, off the main thread.
//
// Drawing frames straight out of a decoded atlas (3840x3780, ~58 MB) made the GPU upload the
// whole atlas the first time any of its frames was drawn: a 40-100 ms stall on an Intel iGPU,
// i.e. 6-15 dropped frames at 165 Hz, once per atlas while scrolling through the sequence.
// Per-frame bitmaps (~2 MB each) are uploaded one at a time as they are first drawn, the way an
// image-per-frame sequence behaves, so the cost is spread thinly over the scroll.
//
// Message in:  { id, blob, rects: [[sx, sy, sw, sh], ...] }
// Message out: { id, frames: ImageBitmap[] } (transferred, zero-copy) or { id, error }
self.onmessage = async (event) => {
  const { id, blob, rects } = event.data;
  let atlas = null;
  const frames = [];
  try {
    atlas = await createImageBitmap(blob);
    for (const [sx, sy, sw, sh] of rects) {
      frames.push(await createImageBitmap(atlas, sx, sy, sw, sh));
    }
    self.postMessage({ id, frames }, frames);
  } catch (error) {
    frames.forEach((frame) => frame.close());
    self.postMessage({ id, error: String((error && error.message) || error) });
  } finally {
    if (atlas) atlas.close();
  }
};
