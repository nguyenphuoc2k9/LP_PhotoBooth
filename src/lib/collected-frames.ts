import type { ThemeId, LayoutId } from './config';
export type Point = [number, number];
export type PhotoQuad = [Point, Point, Point, Point];

type CollectedFrame = { src: string; overlay: boolean; cells: number[][]; caption: [number, number, number]; width?: number; height?: number; layout?: LayoutId; quads?: PhotoQuad[]; captionSize?: number; captionRotation?: number };
export const COLLECTED_FRAMES: Partial<Record<ThemeId, CollectedFrame>> = {
  'blue-scrapbook': {
    src: '/frames/blue-cat-scrapbook.jpg', overlay: false, cells: [],
    width: 736, height: 1308, layout: 'scrapbook',
    // Inner photo windows, clockwise from the top left; preserve the printed borders.
    quads: [
      [[143, 220], [406, 202], [423, 442], [158, 460]],
      [[367, 568], [617, 525], [660, 752], [407, 797]],
      [[176, 854], [418, 910], [369, 1131], [123, 1075]],
    ],
    caption: [292, 485, 235], captionSize: 15, captionRotation: -4,
  },
  'collected-gold': { src: '/frames/detanet-gold.png', overlay: true, cells: [[70, 132, 815, 542, -8], [985, 104, 746, 480, 0], [984, 642, 750, 490, 0]], caption: [495, 925, 580] },
  'collected-roses': { src: '/frames/detanet-roses.jpg', overlay: false, cells: [[238, 58, 640, 480, 0], [942, 59, 642, 478, 0], [940, 605, 635, 475, 0]], caption: [490, 975, 690] },
  'collected-wedding': { src: '/frames/detanet-wedding.png', overlay: true, cells: [[37, 27, 832, 584, 0], [35, 636, 836, 541, 0], [928, 457, 822, 589, 0]], caption: [1225, 222, 390] },
};
export function frameLayout(id: ThemeId): LayoutId | undefined {
  const frame = COLLECTED_FRAMES[id]; return frame ? frame.layout ?? 'event' : undefined;
}
export function isFrameLayout(id: LayoutId) { return id === 'event' || id === 'scrapbook'; }
const images = new Map<string, HTMLImageElement>();
export function collectedImage(id: ThemeId) { return images.get(id); }
const pending = new Map<string, Promise<void>>();
export async function loadCollectedFrame(id: ThemeId) {
  if (images.has(id)) return;
  const frame = COLLECTED_FRAMES[id];
  if (!frame) return;
  const active = pending.get(id);
  if (active) return active;
  const request = (async () => {
    const img = new Image(); img.src = frame.src;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([img.decode(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Frame timeout')), 8000); })]);
      images.set(id, img);
    } finally { clearTimeout(timer); }
  })();
  pending.set(id, request);
  try { await request; } finally { pending.delete(id); }
}
export async function loadCollectedFrames() {
  return Promise.allSettled(Object.keys(COLLECTED_FRAMES).map(id => loadCollectedFrame(id as ThemeId)));
}
