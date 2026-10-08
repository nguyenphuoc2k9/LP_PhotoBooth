import type { EffectId } from './config';

// Runs only on captured/uploaded photos, never inside the camera animation loop.
// Fixed noise seeds keep every re-render and downloaded PNG reproducible.
export function applyPhotoEffects(photo: HTMLCanvasElement, effects: readonly EffectId[], timestamp: string) {
  if (!effects.length) return photo;
  const ctx = photo.getContext('2d', { willReadFrequently: true })!;
  const w = photo.width, h = photo.height;
  if (effects.includes('chromatic') || effects.includes('grain')) {
    const pixels = ctx.getImageData(0, 0, w, h), d = pixels.data;
    const original = effects.includes('chromatic') ? new Uint8ClampedArray(d) : null;
    const shift = Math.max(1, Math.round(w * .006));
    let seed = 48271;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (original) {
        d[i] = original[(y * w + Math.max(0, x - shift)) * 4];
        d[i + 2] = original[(y * w + Math.min(w - 1, x + shift)) * 4 + 2];
      }
      if (effects.includes('grain')) {
        seed = Math.imul(seed, 1664525) + 1013904223 | 0;
        const noise = ((seed >>> 24) / 255 - .5) * 34;
        d[i] += noise; d[i + 1] += noise; d[i + 2] += noise;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  }
  ctx.save();
  if (effects.includes('lightLeak')) {
    ctx.globalCompositeOperation = 'screen';
    const glow = ctx.createRadialGradient(0, h * .25, 0, 0, h * .25, w * .85);
    glow.addColorStop(0, 'rgba(255,140,65,.8)');
    glow.addColorStop(.4, 'rgba(235,55,75,.28)');
    glow.addColorStop(1, 'rgba(255,90,50,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (effects.includes('vignette')) {
    ctx.save(); ctx.scale(w, h);
    const shade = ctx.createRadialGradient(.5, .5, .22, .5, .5, .72);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(5,12,28,.7)');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, 1, 1); ctx.restore();
  }
  if (effects.includes('timestamp') && timestamp) {
    const size = Math.max(9, Math.round(w * .035));
    ctx.font = `600 ${size}px monospace`; ctx.textAlign = 'right';
    ctx.shadowColor = '#1b1820'; ctx.shadowBlur = size * .12;
    ctx.shadowOffsetY = size * .07; ctx.fillStyle = '#ffba72';
    ctx.fillText(timestamp, w * .95, h * .93, w * .9);
  }
  ctx.restore();
  return photo;
}

export function sessionTimestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
