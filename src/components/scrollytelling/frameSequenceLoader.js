import { useEffect, useSyncExternalStore } from 'react';

export const TOTAL_FRAMES = 931;
const MAX_CONCURRENT_FRAME_LOADS = 6;

const images = new Array(TOTAL_FRAMES);
const settledFrames = new Set();
const requestedFrames = new Set();
const listeners = new Set();

let started = false;
let queueStarted = false;
let completedCount = 0;
let activeLoads = 0;
let nextFrameIndex = 1;
let initialFrameReady = false;

function getFramePath(index) {
  const num = String(index + 1).padStart(4, '0');
  return `/frames/frame_${num}.webp`;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function settleFrame(index, img) {
  if (settledFrames.has(index)) return;

  settledFrames.add(index);
  completedCount += 1;

  if (img) {
    images[index] = img;
  }

  if (index === 0 && img) {
    initialFrameReady = true;
  }

  notify();
}

function loadFrame(frameIndex) {
  activeLoads += 1;

  const frameImage = new Image();
  frameImage.decoding = 'async';
  frameImage.src = getFramePath(frameIndex);
  frameImage.onload = () => {
    activeLoads -= 1;
    settleFrame(frameIndex, frameImage);
    pumpQueue();
  };
  frameImage.onerror = () => {
    activeLoads -= 1;
    settleFrame(frameIndex, null);
    pumpQueue();
  };
}

function pumpQueue() {
  if (!queueStarted) return;

  while (activeLoads < MAX_CONCURRENT_FRAME_LOADS && nextFrameIndex < TOTAL_FRAMES) {
    const frameIndex = nextFrameIndex;
    nextFrameIndex += 1;

    if (requestedFrames.has(frameIndex) || settledFrames.has(frameIndex)) {
      continue;
    }

    requestedFrames.add(frameIndex);
    loadFrame(frameIndex);
  }
}

function startQueue() {
  if (queueStarted) return;
  queueStarted = true;
  pumpQueue();
}

function requestFirstFrame() {
  if (started) return;
  started = true;

  if (requestedFrames.has(0) || settledFrames.has(0)) {
    return;
  }

  requestedFrames.add(0);

  const firstFrame = new Image();
  firstFrame.decoding = 'async';
  firstFrame.src = getFramePath(0);
  firstFrame.onload = () => {
    settleFrame(0, firstFrame);
    startQueue();
  };
  firstFrame.onerror = () => {
    settleFrame(0, null);
    startQueue();
  };
}

export function startFrameSequenceLoader() {
  requestFirstFrame();
}

export function subscribeFrameSequenceLoader(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFrameSequenceLoader() {
  const snapshot = useSyncExternalStore(
    subscribeFrameSequenceLoader,
    () => ({
      completedCount,
      initialFrameReady,
    }),
    () => ({
      completedCount: 0,
      initialFrameReady: false,
    })
  );

  useEffect(() => {
    requestFirstFrame();
  }, []);

  return {
    completedCount: snapshot.completedCount,
    initialFrameReady: snapshot.initialFrameReady,
    progress: Math.min(100, Math.round((snapshot.completedCount / TOTAL_FRAMES) * 100)),
    totalFrames: TOTAL_FRAMES,
  };
}

export function getLoadedFrameImage(index) {
  return images[index] || null;
}

export function findNearestLoadedFrame(targetIdx) {
  const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(targetIdx)));

  if (images[clamped] && images[clamped].complete && images[clamped].naturalWidth > 0) {
    return images[clamped];
  }

  for (let offset = 1; offset < TOTAL_FRAMES; offset += 1) {
    const down = images[clamped - offset];
    if (down && down.complete && down.naturalWidth > 0) return down;

    const up = images[clamped + offset];
    if (up && up.complete && up.naturalWidth > 0) return up;
  }

  return null;
}
