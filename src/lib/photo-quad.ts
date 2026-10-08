import type { PhotoQuad, Point } from './collected-frames';

// Map photos into the artwork's four measured corners without changing the JPEG.
export function drawPhotoQuad(ctx: CanvasRenderingContext2D, photo: HTMLCanvasElement, quad: PhotoQuad) {
  const [a, b, c, d] = quad, w = photo.width, h = photo.height;
  ctx.save(); ctx.beginPath();
  quad.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.clip();
  const triangle = (points: Point[], matrix: [number, number, number, number, number, number]) => {
    ctx.save(); ctx.beginPath();
    const cx = points.reduce((sum, p) => sum + p[0], 0) / 3;
    const cy = points.reduce((sum, p) => sum + p[1], 0) / 3;
    // Small overlap prevents a hairline seam on the shared diagonal.
    points.forEach(([x, y], i) => {
      const distance = Math.hypot(x - cx, y - cy);
      const px = x + (x - cx) / distance, py = y + (y - cy) / distance;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    });
    ctx.closePath(); ctx.clip(); ctx.transform(...matrix); ctx.drawImage(photo, 0, 0); ctx.restore();
  };
  triangle([a, b, d], [(b[0] - a[0]) / w, (b[1] - a[1]) / w, (d[0] - a[0]) / h, (d[1] - a[1]) / h, a[0], a[1]]);
  triangle([b, c, d], [(c[0] - d[0]) / w, (c[1] - d[1]) / w, (c[0] - b[0]) / h, (c[1] - b[1]) / h, b[0] - c[0] + d[0], b[1] - c[1] + d[1]]);
  ctx.restore();
}
