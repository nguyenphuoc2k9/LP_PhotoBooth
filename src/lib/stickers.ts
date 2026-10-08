import { STICKER_CATALOG } from './sticker-catalog';
export interface PlacedSticker { key: string; asset: string; x: number; y: number; size: number; rotation: number }
const cache = new Map<string, HTMLImageElement>();
export async function loadStickerImages(stickers:PlacedSticker[]) {
  await Promise.all(stickers.map(async sticker=>{
    const asset=STICKER_CATALOG.find(s=>s.id===sticker.asset);
    if(!asset)throw new Error('Sticker không tồn tại.');
    if(cache.has(asset.id))return;
    const image=new Image();image.src=asset.src;await image.decode();cache.set(asset.id,image);
  }));
}
export function drawSticker(ctx:CanvasRenderingContext2D,sticker:PlacedSticker,width:number,height:number){
  const image=cache.get(sticker.asset);if(!image)throw new Error('Sticker chưa tải xong.');
  const size=sticker.size*width;
  ctx.save();ctx.translate(sticker.x*width,sticker.y*height);ctx.rotate(sticker.rotation*Math.PI/180);
  ctx.drawImage(image,-size/2,-size/2,size,size);ctx.restore();
}
export async function renderStickers(base: HTMLCanvasElement, stickers: PlacedSticker[]) {
  await loadStickerImages(stickers);
  const result=document.createElement('canvas');result.width=base.width;result.height=base.height;
  const ctx=result.getContext('2d')!;ctx.drawImage(base,0,0);
  for(const sticker of stickers)drawSticker(ctx,sticker,base.width,base.height);
  return result;
}
