export interface BeautyOptions { smooth: number; glow: number }
export const NO_BEAUTY: BeautyOptions = { smooth: 0, glow: 0 };
// Adaptive local smoothing preserves high-variance edges; no face geometry is changed.
export function applyBeauty(photo: HTMLCanvasElement, settings: BeautyOptions) {
  const smooth = Math.max(0, Math.min(100, settings.smooth)) / 100, glow = Math.max(0, Math.min(100, settings.glow)) / 100;
  if (!smooth && !glow) return photo;
  const ctx = photo.getContext('2d', { willReadFrequently: true })!, w = photo.width, h = photo.height, stride = w + 1;
  const image = ctx.getImageData(0, 0, w, h), d = image.data;
  const sums = smooth ? Array.from({ length: 4 }, () => new Float64Array(stride * (h + 1))) : [];
  if (smooth) for (let y = 1; y <= h; y++) {
    const row = [0, 0, 0, 0];
    for (let x = 1; x <= w; x++) {
      const i = ((y - 1) * w + x - 1) * 4, lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      for (let k = 0; k < 4; k++) { row[k] += k === 3 ? lum * lum : d[i + k]; sums[k][y * stride + x] = sums[k][(y - 1) * stride + x] + row[k]; }
    }
  }
  const radius = Math.max(2, Math.round(w * .006)), mean = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let blend = 0;
    if (smooth) {
      const x0 = Math.max(0, x-radius), x1 = Math.min(w, x+radius+1), y0 = Math.max(0,y-radius), y1 = Math.min(h,y+radius+1), n = (x1-x0)*(y1-y0);
      for (let k=0;k<4;k++) { const s=sums[k]; mean[k]=(s[y1*stride+x1]-s[y0*stride+x1]-s[y1*stride+x0]+s[y0*stride+x0])/n; }
      const lum=(mean[0]+mean[1]+mean[2])/3; blend=smooth*.8/(1+Math.max(0,mean[3]-lum*lum)/110);
    }
    for (let k=0;k<3;k++) { const value=d[i+k]+(smooth?(mean[k]-d[i+k])*blend:0); d[i+k]=255*Math.pow(value/255,1-glow*.16); }
  }
  ctx.putImageData(image,0,0); return photo;
}

