import { drawSticker } from './stickers';
import { sharedFrameImage, frameLayers } from './shared-frames';
import { applyBeauty, NO_BEAUTY, type BeautyOptions } from './beauty';
import { FILTERS, LAYOUTS, THEMES, type PrintOptions, type FilterId, type Decoration } from './config';
import { coverCrop, type Rect } from './coordinates';
import { paintFrame } from './frames';
import { applyPhotoEffects } from './effects';
import { COLLECTED_FRAMES, collectedImage } from './collected-frames';
import { drawPhotoQuad } from './photo-quad';

function canvas(width: number, height: number) {
  const c = document.createElement('canvas'); c.width = Math.round(width); c.height = Math.round(height); return c;
}
function context(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Image processing is unavailable in this browser.');
  return ctx;
}
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) throw new Error('Camera is not ready.');
  const c = canvas(video.videoWidth, video.videoHeight);
  context(c).drawImage(video, 0, 0); return c;
}
// Pixel transforms keep preview and export consistent, including browsers without Canvas filter support.
export function applyFilter(source: HTMLCanvasElement, id: FilterId, destination?: HTMLCanvasElement): HTMLCanvasElement {
  const c = destination ?? canvas(source.width, source.height);
  if (c.width !== source.width || c.height !== source.height) { c.width = source.width; c.height = source.height; }
  const ctx = context(c); ctx.drawImage(source, 0, 0);
  if (id === 'original') return c;
  const image = ctx.getImageData(0, 0, c.width, c.height); const d = image.data;
  const gray = (r: number, g: number, b: number) => .2126 * r + .7152 * g + .0722 * b;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const lum = gray(r, g, b);
    if (id === 'mono') r = g = b = (lum - 128) * 1.12 + 128;
    if (id === 'warm') { r = r * 1.08 + 8; g = g * 1.02 + 3; b *= .9; }
    if (id === 'cool') { r *= .92; g = g * 1.02 + 2; b = b * 1.08 + 8; }
    if (id === 'contrast') { r = (r - 128) * 1.4 + 128; g = (g - 128) * 1.4 + 128; b = (b - 128) * 1.4 + 128; }
    if (id === 'soft') { r = (r - 128) * .86 + 138; g = (g - 128) * .86 + 138; b = (b - 128) * .86 + 138; }
    if (id === 'rose') { r = r * .94 + 22; g = g * .88 + 10; b = b * .94 + 17; }
    if (id === 'peach') { r = r * 1.04 + 12; g = g * .96 + 9; b = b * .83 + 7; }
    if (id === 'mint') { r = r * .86 + 9; g = g * .96 + 17; b = b * .93 + 12; }
    if (id === 'lavender') { r = r * .93 + 12; g = g * .86 + 10; b = b * 1.02 + 17; }
    if (id === 'sepia' || id === 'vintage') {
      const s = id === 'sepia' ? .85 : .35;
      const sr = .393 * r + .769 * g + .189 * b, sg = .349 * r + .686 * g + .168 * b, sb = .272 * r + .534 * g + .131 * b;
      r += (sr - r) * s; g += (sg - g) * s; b += (sb - b) * s;
      if (id === 'vintage') { r = (r - 128) * .88 + 134; g = (g - 128) * .88 + 132; b = (b - 128) * .88 + 128; }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(image, 0, 0); return c;
}
export interface RegionEffect { rect: Rect; type: 'grayscale' | 'pixelate'; }
export function applyRegionEffect(source: HTMLCanvasElement, effect: RegionEffect): HTMLCanvasElement {
  const out = canvas(source.width, source.height); const ctx = context(out); ctx.drawImage(source, 0, 0);
  const x = Math.max(0, Math.round(effect.rect.x)), y = Math.max(0, Math.round(effect.rect.y));
  const w = Math.min(Math.round(effect.rect.width), out.width - x), h = Math.min(Math.round(effect.rect.height), out.height - y);
  if (w <= 0 || h <= 0) return out;
  const region = canvas(w, h); context(region).drawImage(source, x, y, w, h, 0, 0, w, h);
  if (effect.type === 'grayscale') ctx.drawImage(applyFilter(region, 'mono'), x, y);
  else {
    const tiny = canvas(Math.max(1, w / 18), Math.max(1, h / 18));
    context(tiny).drawImage(region, 0, 0, tiny.width, tiny.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tiny, x, y, w, h); ctx.imageSmoothingEnabled = true;
  }
  return out;
}
export function composePhoto(source: HTMLCanvasElement, width: number, height: number, filter: FilterId, regionEffects: RegionEffect[] = [], beauty: BeautyOptions = NO_BEAUTY) {
  const c = canvas(width, height); const ctx = context(c); const crop = coverCrop(source, { width, height });
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  return regionEffects.reduce((frame, effect) => applyRegionEffect(frame, effect), applyFilter(applyBeauty(c, beauty), filter));
}
function drawDecoration(ctx: CanvasRenderingContext2D, kind: Decoration, x: number, y: number, size: number) {
  if (kind === 'none') return;
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  if (kind === 'heart') {
    ctx.moveTo(0, size * .4); ctx.bezierCurveTo(-size, -size * .25, -size * .6, -size, 0, -size * .4);
    ctx.bezierCurveTo(size * .6, -size, size, -size * .25, 0, size * .4);
  } else {
    const points = kind === 'sparkle' ? 4 : 5;
    for (let i = 0; i < points * 2; i++) {
      const a = i * Math.PI / points - Math.PI / 2; const r = i % 2 ? size * .35 : size;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
export function generatePhotoStrip(photos: HTMLCanvasElement[], options: PrintOptions, scale = 1): HTMLCanvasElement {
  if (options.customFrame) {
    const frame=options.customFrame, img=sharedFrameImage(frame);
    if(!img||photos.length<frame.slots.length)throw new Error('Khung chưa sẵn sàng.');
    const out=canvas(frame.width*scale,frame.height*scale),ctx=context(out);ctx.scale(scale,scale);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,frame.width,frame.height);
    for(const layer of frameLayers(frame)){
      if(!layer.visible)continue;
      ctx.save();ctx.globalAlpha=layer.opacity;
      if(layer.id==='background')ctx.drawImage(img,0,0,frame.width,frame.height);
      else if(layer.id.startsWith('photo-')){
        const i=Number(layer.id.slice(6)),points=frame.slots[i];
        const quad=points.map(([x,y])=>[x*frame.width,y*frame.height]) as typeof points;
        const w=Math.hypot(quad[1][0]-quad[0][0],quad[1][1]-quad[0][1]),h=Math.hypot(quad[3][0]-quad[0][0],quad[3][1]-quad[0][1]);
        drawPhotoQuad(ctx,applyPhotoEffects(composePhoto(photos[i],Math.max(1,w*scale),Math.max(1,h*scale),options.filter,[],options.beauty),options.effects,options.timestamp),quad);
      } else {
        const sticker=frame.stickers?.find(s=>'sticker-'+s.key===layer.id);
        if(sticker)drawSticker(ctx,sticker,frame.width,frame.height);
      }
      ctx.restore();
    }
    if(frame.showCaption){ctx.fillStyle=options.border;ctx.textAlign='center';ctx.font=(frame.width*.035)+'px Arial';ctx.fillText(options.caption,frame.width/2,frame.height*.96,frame.width*.85);}
    return out;
  }

  const imported = COLLECTED_FRAMES[options.theme];
  if (imported) {
    const img = collectedImage(options.theme);
    if (!img || photos.length < 3) throw new Error('Frame is not ready.');
    const width = imported.width ?? 1800, height = imported.height ?? 1200;
    const out = canvas(width * scale, height * scale), ctx = context(out);
    ctx.scale(scale, scale); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    if (!imported.overlay) ctx.drawImage(img, 0, 0, width, height);
    imported.quads?.forEach((quad, i) => {
      const w = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
      const h = Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
      drawPhotoQuad(ctx, applyPhotoEffects(composePhoto(photos[i], w * scale, h * scale, options.filter, [], options.beauty), options.effects, options.timestamp), quad);
    });
    imported.cells.forEach(([x, y, w, h, rotation], i) => {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(applyPhotoEffects(composePhoto(photos[i], w * scale, h * scale, options.filter, [], options.beauty), options.effects, options.timestamp), -w / 2, -h / 2, w, h); ctx.restore();
    });
    if (imported.overlay) ctx.drawImage(img, 0, 0, width, height);
    const [x, y, maxWidth] = imported.caption;
    ctx.textAlign = 'center'; ctx.fillStyle = THEMES.find(t => t.id === options.theme)!.ink;
    const size = imported.captionSize ?? 38;
    ctx.save(); ctx.translate(x, y); ctx.rotate((imported.captionRotation ?? 0) * Math.PI / 180);
    ctx.font = `500 ${size}px Arial, sans-serif`; ctx.fillText(options.caption, 0, 0, maxWidth);
    if (options.showDate && options.date) { ctx.font = `${size * .63}px monospace`; ctx.fillText(options.date.split('-').reverse().join('.'), 0, size * 1.26, maxWidth); }
    drawDecoration(ctx, options.decoration, imported.quads ? maxWidth * .48 : 0, imported.quads ? 0 : 90, imported.quads ? 7 : 16);
    ctx.restore();
    return out;
  }
  const layout = LAYOUTS.find(l => l.id === options.layout)!;
  if (photos.length < layout.shots) throw new Error('Not enough photographs for this layout.');
  const { width, columns, padding, gap, cellHeight, footer } = layout;
  const rows = Math.ceil(layout.shots / columns);
  const height = padding * 2 + rows * cellHeight + (rows - 1) * gap + footer;
  const c = canvas(width * scale, height * scale); const ctx = context(c); ctx.scale(scale, scale);
  const theme = THEMES.find(t => t.id === options.theme)!;
  ctx.fillStyle = options.background; ctx.fillRect(0, 0, width, height);
  paintFrame(ctx, options.theme, width, height);
  const cellWidth = (width - padding * 2 - (columns - 1) * gap) / columns;
  for (let i = 0; i < layout.shots; i++) {
    const x = padding + (i % columns) * (cellWidth + gap), y = padding + Math.floor(i / columns) * (cellHeight + gap);
    ctx.drawImage(applyPhotoEffects(composePhoto(photos[i], cellWidth * scale, cellHeight * scale, options.filter, [], options.beauty), options.effects, options.timestamp), x, y, cellWidth, cellHeight);
    ctx.strokeStyle = options.border; ctx.lineWidth = 6; ctx.strokeRect(x, y, cellWidth, cellHeight);
  }
  // Theme marks are drawn into the print, never just its HTML presentation.
  if (options.theme === 'film') {
    ctx.fillStyle = '#f3ead7';
    for (let y = 32; y < height - footer; y += 90) { ctx.fillRect(10, y, 14, 27); ctx.fillRect(width - 24, y, 14, 27); }
  }
  if (options.theme === 'retro' || options.theme === 'camera') {
    ctx.strokeStyle = theme.ink; ctx.lineWidth = 2; ctx.strokeRect(15, 15, width - 30, height - 30);
  }
  if (options.theme === 'celebration' || options.theme === 'y2k' || options.theme === 'pastel') {
    ctx.fillStyle = theme.ink;
    drawDecoration(ctx, options.theme === 'pastel' ? 'heart' : 'sparkle', padding / 2, height - footer / 2, padding / 4);
    drawDecoration(ctx, 'star', width - padding / 2, height - footer / 2, padding / 4);
  }
  ctx.fillStyle = theme.ink; ctx.textAlign = 'center';
  const footerY = height - footer - padding;
  ctx.fillStyle = options.background; ctx.fillRect(width * .2, footerY + 8, width * .6, footer - 8);
  ctx.fillStyle = theme.ink;
  let fontSize = width * .045;
  ctx.font = `500 ${fontSize}px Arial, sans-serif`;
  while (ctx.measureText(options.caption).width > width - padding * 3 && fontSize > 16) { fontSize -= 1; ctx.font = `500 ${fontSize}px Arial, sans-serif`; }
  ctx.fillText(options.caption, width / 2, footerY + footer * .44);
  if (options.showDate && options.date) {
    ctx.font = `${width * .022}px monospace`;
    const [y, m, d] = options.date.split('-'); ctx.fillText(`${d}.${m}.${y}`, width / 2, footerY + footer * .7);
  }
  ctx.fillStyle = theme.ink; drawDecoration(ctx, options.decoration, width * .9, footerY + footer * .47, width * .026);
  return c;
}
export async function downloadPhoto(c: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error('Unable to create download.')), 'image/png'));
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `stillroom-${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function sampleFrame(): Promise<HTMLCanvasElement> {
  const img = new Image(); img.src = '/sample.jpg'; await img.decode();
  const c = canvas(img.naturalWidth, img.naturalHeight); context(c).drawImage(img, 0, 0); return c;
}
export function filterName(id: FilterId) { return FILTERS.find(f => f.id === id)!.name; }
