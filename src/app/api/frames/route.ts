import { STICKER_CATALOG } from '@/lib/sticker-catalog';
import { frameLayers } from '@/lib/shared-frames';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { authenticated,db,frameRecord,json,limitedJson,originAllowed } from '@/lib/server-store';
import type { PhotoQuad } from '@/lib/collected-frames';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request){
  const admin=new URL(req.url).searchParams.get('admin')==='1';
  if(admin&&!authenticated(req))return json({error:'Vui lòng đăng nhập.'},401);
  const rows=db().prepare('SELECT id,name,width,height,slots,overlay,caption,published,updated,design FROM frames'+(admin?'':' WHERE published=1')+' ORDER BY updated DESC').all();
  return json({frames:rows.map(frameRecord)});
}
function validSlots(slots:unknown):slots is PhotoQuad[]{
  if(!Array.isArray(slots)||slots.length<1||slots.length>4)return false;
  return slots.every(q=>{
    if(!Array.isArray(q)||q.length!==4||q.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1)))return false;
    let area=0;
    for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];if((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<=.00001)return false;area+=a[0]*b[1]-b[0]*a[1];}
    return area/2>=.002;
  });
}
export async function POST(req:Request){
  if(!originAllowed(req))return json({error:'Yêu cầu không hợp lệ.'},403);
  if(!authenticated(req))return json({error:'Vui lòng đăng nhập.'},401);
  try{
    const body=await limitedJson(req),name=String(body.name||'').trim();
    if(!name||name.length>60||!validSlots(body.slots)||typeof body.overlay!=='boolean'||typeof body.showCaption!=='boolean'||typeof body.published!=='boolean')return json({error:'Kiểm tra tên khung và các ô ảnh. Mỗi ô cần bốn góc theo chiều kim đồng hồ, không giao nhau.'},400);
    const id=body.id?String(body.id):randomUUID();if(!/^[a-zA-Z0-9-]{1,64}$/.test(id))return json({error:'Mã khung không hợp lệ.'},400);
    const old=db().prepare('SELECT * FROM frames WHERE id=?').get(id);
    if(body.id&&!old)return json({error:'Khung không còn tồn tại.'},404);
    const previous=JSON.parse(String(old?.design||'{}'));
    const stickers=body.stickers??previous.stickers??[];
    const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
    if(!Array.isArray(stickers)||stickers.length>20||stickers.some(s=>!s||typeof s.key!=='string'||!/^[a-zA-Z0-9-]{1,64}$/.test(s.key)||!STICKER_CATALOG.some(a=>a.id===s.asset)||!finite(s.x,0,1)||!finite(s.y,0,1)||!finite(s.size,.08,.6)||!finite(s.rotation,-180,180))||new Set(stickers.map(s=>s.key)).size!==stickers.length)return json({error:'Dữ liệu sticker không hợp lệ.'},400);
    const defaults=frameLayers({slots:body.slots,overlay:body.overlay,stickers});
    const layers=body.layers??defaults;
    if(!Array.isArray(layers)||layers.length!==defaults.length||new Set(layers.map(l=>l?.id)).size!==defaults.length||layers.some(l=>!l||!defaults.some(d=>d.id===l.id)||typeof l.visible!=='boolean'||typeof l.locked!=='boolean'||!finite(l.opacity,0,1)))return json({error:'Danh sách lớp không hợp lệ.'},400);
    const design=JSON.stringify({stickers:stickers.map(({key,asset,x,y,size,rotation})=>({key,asset,x,y,size,rotation})),layers:layers.map(({id,visible,locked,opacity})=>({id,visible,locked,opacity}))});
    let image=old?.image as Uint8Array|undefined,width=Number(old?.width),height=Number(old?.height);
    if(body.image){
      if(typeof body.image!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image))return json({error:'Chỉ nhận ảnh PNG, JPG hoặc WebP.'},400);
      const input=Buffer.from(body.image.split(',')[1],'base64');if(input.length>7*1024*1024)return json({error:'Ảnh tối đa 7 MB.'},400);
      const result=await sharp(input,{limitInputPixels:12000000}).rotate().png().toBuffer({resolveWithObject:true});
      width=result.info.width;height=result.info.height;if(width<100||height<100||width>4096||height>4096)return json({error:'Ảnh cần có chiều rộng/cao từ 100 đến 4096 px.'},400);
      image=result.data;
    }
    if(!image)return json({error:'Hãy tải ảnh nền khung lên.'},400);
    const updated=Date.now();
    db().prepare('INSERT INTO frames(id,name,width,height,slots,overlay,caption,published,updated,image,design) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,width=excluded.width,height=excluded.height,slots=excluded.slots,overlay=excluded.overlay,caption=excluded.caption,published=excluded.published,updated=excluded.updated,image=excluded.image,design=excluded.design')
      .run(id,name,width,height,JSON.stringify(body.slots),Number(body.overlay),Number(body.showCaption),Number(body.published),updated,image,design);
    return json({frame:frameRecord(db().prepare('SELECT * FROM frames WHERE id=?').get(id)!)},old?200:201);
  }catch{return json({error:'Không đọc được dữ liệu hoặc ảnh khung. Hãy chọn ảnh khác và thử lại.'},400);}
}

