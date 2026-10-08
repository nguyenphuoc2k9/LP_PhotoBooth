import { THEMES, type ThemeId } from './config';

// Original vector frames; the same geometry appears in thumbnails and PNG exports.
export function paintFrame(ctx: CanvasRenderingContext2D, id: ThemeId, w: number, h: number) {
  const t = THEMES.find(t => t.id === id)!, u = w / 24;
  ctx.save(); ctx.fillStyle = t.accent; ctx.strokeStyle = t.accent; ctx.lineWidth = w / 500;
  const motif = (x: number, y: number, r: number) => {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    if (t.pattern === 'hearts') {
      ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 2, 0, -r, -r * 1.8, 0, -r * .5); ctx.bezierCurveTo(r, -r * 1.8, r * 2, 0, 0, r);
    } else if (t.pattern === 'bows') {
      ctx.moveTo(0, 0); ctx.bezierCurveTo(-r * 2, -r * 2, -r * 2, r * 2, 0, 0); ctx.bezierCurveTo(r * 2, -r * 2, r * 2, r * 2, 0, 0);
    } else if (t.pattern === 'flowers') {
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, r * .65, 0, Math.PI * 2); }
    } else {
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? r * .4 : r; ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); }
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  switch (t.pattern) {
    case 'clouds':
      for (let y = u; y < h; y += u * 3) for (const x of [u * .5, w - u * .5]) {
        ctx.beginPath(); ctx.ellipse(x, y, u * .65, u * .3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x - u * .15, y - u * .2, u * .3, 0, Math.PI * 2); ctx.fill();
      } break;
    case 'botanical':
      for (const x of [u * .5, w - u * .5]) {
        ctx.beginPath(); ctx.moveTo(x, u); ctx.lineTo(x, h - u); ctx.stroke();
        for (let y = u; y < h - u; y += u * 1.3) {
          ctx.beginPath(); ctx.ellipse(x - u * .17, y, u * .12, u * .4, -.6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + u * .17, y + u * .4, u * .12, u * .4, .6, 0, Math.PI * 2); ctx.fill();
        }
      } break;
    case 'celestial':
      for (let y = u; y < h - u; y += u * 3) for (const x of [u * .55, w - u * .55]) {
        ctx.beginPath(); ctx.arc(x, y, u * .3, .3, Math.PI * 1.8); ctx.quadraticCurveTo(x - u * .1, y, x + Math.cos(.3) * u * .3, y + Math.sin(.3) * u * .3); ctx.fill();
        motif(x, y + u * 1.4, u * .2);
      } break;
    case 'airmail':
      for (let y = 0; y < h; y += u * 1.4) for (const x of [0, w - u * .55]) {
        ctx.beginPath(); ctx.moveTo(x, y + u * .4); ctx.lineTo(x + u * .55, y); ctx.lineTo(x + u * .55, y + u * .7); ctx.lineTo(x, y + u * 1.1); ctx.fill();
      } ctx.setLineDash([u * .12, u * .12]); ctx.strokeRect(u * .8, u * .45, w - u * 1.6, h - u * .9); break;
    case 'plain': break;
    case 'film': for (let y = u; y < h - u; y += u * 3) { ctx.fillRect(u * .25, y, u * .45, u); ctx.fillRect(w - u * .7, y, u * .45, u); } break;
    case 'double': [u * .25, u * .55].forEach(p => ctx.strokeRect(p, p, w - p * 2, h - p * 2)); break;
    case 'ticket': ctx.setLineDash([u * .35, u * .2]); ctx.strokeRect(u * .5, u * .5, w - u, h - u); break;
    case 'checker': for (let y = 0; y < h; y += u) for (let x = 0; x < w; x += u) if ((Math.round(x / u) + Math.round(y / u)) % 2 === 0) ctx.fillRect(x, y, u, u); break;
    case 'dots': for (let y = u; y < h; y += u * 2) for (let x = u / 2; x < w; x += u * 2) { ctx.beginPath(); ctx.arc(x, y, u * .16, 0, Math.PI * 2); ctx.fill(); } break;
    case 'stripes': for (let x = 0; x < w; x += u) ctx.fillRect(x, 0, u * .3, h); break;
    case 'grid':
      for (let x = 0; x < w; x += u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } break;
    case 'waves': for (let y = 0; y < h; y += u * 1.5) { ctx.beginPath(); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(x / u) * u * .3); ctx.stroke(); } break;
    case 'lace': for (let y = u * .5; y < h; y += u) { ctx.beginPath(); ctx.arc(0, y, u * .7, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(w, y, u * .7, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); } break;
    case 'confetti': for (let i = 0; i < 110; i++) { ctx.save(); ctx.translate(((i * 137) % 997) / 997 * w, ((i * 251) % 991) / 991 * h); ctx.rotate(i * .7); ctx.fillStyle = [t.accent, '#9fcbbb', '#f0ba6b'][i % 3]; ctx.fillRect(0, 0, u * .2, u * .5); ctx.restore(); } break;
    default:
      for (let y = u; y < h; y += u * 3) { motif(u * .55, y, u * .32); motif(w - u * .55, y + u, u * .32); }
      motif(w * .15, h - w * .1, u * .65); motif(w * .85, h - w * .1, u * .65);
  }
  ctx.restore();
}
