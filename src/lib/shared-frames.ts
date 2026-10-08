import { loadStickerImages } from './stickers';
import type { PlacedSticker } from './stickers';
import type { PhotoQuad } from './collected-frames';
export interface FrameLayer { id:string; visible:boolean; locked:boolean; opacity:number }
export interface SharedFrame { layers?:FrameLayer[]; stickers?:PlacedSticker[]; id: string; name: string; width: number; height: number; slots: PhotoQuad[]; overlay: boolean; showCaption: boolean; published: boolean; updatedAt: number; src: string }
const images = new Map<string, HTMLImageElement>();
export function sharedFrameImage(frame: SharedFrame) { return images.get(frame.src); }
export async function loadSharedFrame(frame: SharedFrame) {
  await loadStickerImages(frame.stickers??[]);
  if (images.has(frame.src)) return;
  const img = new Image(); img.src = frame.src;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([img.decode(), new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Không tải được ảnh khung.')),8000);})]); images.set(frame.src,img); }
  finally { clearTimeout(timer); }
}


export function frameLayers(frame: Pick<SharedFrame,'slots'|'overlay'|'stickers'|'layers'>):FrameLayer[] {
  const photos=frame.slots.map((_,i)=>'photo-'+i);
  const ids=[...(frame.overlay?[...photos,'background']:['background',...photos]),...(frame.stickers??[]).map(s=>'sticker-'+s.key)];
  const existing=(frame.layers??[]).filter(l=>ids.includes(l.id));
  return [...existing,...ids.filter(id=>!existing.some(l=>l.id===id)).map(id=>({id,visible:true,locked:false,opacity:1}))];
}
