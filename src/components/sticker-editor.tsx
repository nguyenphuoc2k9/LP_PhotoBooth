import { useRef, useState, type PointerEvent } from 'react';
import { STICKER_CATALOG } from '@/lib/sticker-catalog';
import type { PlacedSticker } from '@/lib/stickers';
const clamp = (n: number, low = 0, high = 1) => Math.round(Math.max(low, Math.min(high, n)) * 10000) / 10000;
type StickerProps={items:PlacedSticker[];selected:string|null;onSelect:(key:string)=>void;onChange:(items:PlacedSticker[])=>void;states?:Record<string,{visible:boolean;locked:boolean;opacity:number;order:number}>;disabled?:boolean};
export function StickerLayer({items,selected,onSelect,onChange,states,disabled=false}:StickerProps){
  const layer=useRef<HTMLDivElement>(null);
  const drag=useRef<{key:string;pointer:number;mode:'move'|'rotate'|'resize';x:number;y:number;start:PlacedSticker;angle:number;distance:number}|null>(null);
  function begin(e:PointerEvent<HTMLButtonElement>,s:PlacedSticker,mode:'move'|'rotate'|'resize'){
    if(disabled||states?.[s.key]?.locked)return;
    e.preventDefault();e.stopPropagation();onSelect(s.key);
    const box=layer.current!.getBoundingClientRect(),cx=box.left+s.x*box.width,cy=box.top+s.y*box.height;
    drag.current={key:s.key,pointer:e.pointerId,mode,x:e.clientX,y:e.clientY,start:{...s},angle:Math.atan2(e.clientY-cy,e.clientX-cx),distance:Math.max(1,Math.hypot(e.clientX-cx,e.clientY-cy))};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e:PointerEvent<HTMLButtonElement>){
    const d=drag.current,box=layer.current?.getBoundingClientRect();if(!d||d.pointer!==e.pointerId||!box||disabled)return;
    const s=d.start;let values:Partial<PlacedSticker>;
    if(d.mode==='move')values={x:clamp(s.x+(e.clientX-d.x)/box.width),y:clamp(s.y+(e.clientY-d.y)/box.height)};
    else {
      const dx=e.clientX-box.left-s.x*box.width,dy=e.clientY-box.top-s.y*box.height;
      if(d.mode==='resize')values={size:clamp(s.size*Math.hypot(dx,dy)/d.distance,.08,.6)};
      else {let angle=s.rotation+(Math.atan2(dy,dx)-d.angle)*180/Math.PI;if(e.shiftKey)angle=Math.round(angle/15)*15;values={rotation:Math.round(((angle+180)%360+360)%360-180)};}
    }
    onChange(items.map(item=>item.key===d.key?{...item,...values}:item));
  }
  const events={onPointerMove:move,onPointerUp:(e:PointerEvent<HTMLButtonElement>)=>{move(e);drag.current=null;},onPointerCancel:()=>{drag.current=null;},onLostPointerCapture:()=>{drag.current=null;}};
  return <div ref={layer} className="sticker-layer" aria-label="Sticker trên ảnh">{items.map(s=>{
    const asset=STICKER_CATALOG.find(a=>a.id===s.asset)!;const state=states?.[s.key],locked=disabled||state?.locked;
    if(state&&!state.visible)return null;
    const change=(v:Partial<PlacedSticker>)=>onChange(items.map(item=>item.key===s.key?{...item,...v}:item));
    return <div key={s.key} className={'placed-sticker '+(selected===s.key&&!locked?'selected':'')} style={{left:s.x*100+'%',top:s.y*100+'%',width:s.size*100+'%',transform:'translate(-50%,-50%) rotate('+s.rotation+'deg)',zIndex:state?.order,opacity:state?.opacity,pointerEvents:locked?'none':undefined}}>
      <button type="button" className="sticker-body" disabled={locked} aria-label={'Di chuyển sticker '+asset.name} aria-pressed={selected===s.key} onClick={()=>onSelect(s.key)} onPointerDown={e=>begin(e,s,'move')} {...events}
        onKeyDown={e=>{const step=e.shiftKey?.05:.01;const delta:Record<string,number[]>={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(delta[e.key]){e.preventDefault();change({x:clamp(s.x+delta[e.key][0]),y:clamp(s.y+delta[e.key][1])});}}}>
        <img src={asset.src} alt="" draggable={false}/>
      </button>
      {selected===s.key&&!locked&&<>
        <button type="button" className="sticker-handle rotate-handle" aria-label="Xoay sticker" title="Kéo để xoay · Shift: từng 15°" onPointerDown={e=>begin(e,s,'rotate')} {...events} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change({rotation:((s.rotation+(e.key==='ArrowLeft'?-5:5)+540)%360)-180});}}}>↻</button>
        <button type="button" className="sticker-handle resize-handle" aria-label="Kích thước sticker" title="Kéo để đổi kích thước" onPointerDown={e=>begin(e,s,'resize')} {...events} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change({size:clamp(s.size+(e.key==='ArrowLeft'?-.01:.01),.08,.6)});}}}>↘</button>
      </>}
    </div>;
  })}</div>;
}
export function StickerPicker({ items, selected, onSelect, onChange, locked=false }: { locked?:boolean; items: PlacedSticker[]; selected: string | null; onSelect: (key: string | null) => void; onChange: (items: PlacedSticker[]) => void }) {
  const [category,setCategory]=useState('Tất cả'), [search,setSearch]=useState('');
  const current=items.find(s=>s.key===selected);
  const categories=['Tất cả',...new Set(STICKER_CATALOG.map(s=>s.category))];
  const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
  const visible=STICKER_CATALOG.filter(s=>(category==='Tất cả'||s.category===category)&&normalize(s.name).includes(normalize(search)));
  return <section className="sticker-panel" aria-label="Chỉnh sticker"><details><summary>Gắn sticker <span>100 mẫu · {items.length}/20</span></summary>
    <p>Chọn mẫu, rồi kéo sticker trên ảnh. Có thể dùng phím mũi tên để chỉnh vị trí.</p>
    <input type="search" aria-label="Tìm sticker" placeholder="Tìm mèo, trái tim, hoa…" value={search} onChange={e=>setSearch(e.target.value)} />
    <select aria-label="Nhóm sticker" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select>
    <div className="sticker-grid">{visible.map(asset=><button type="button" key={asset.id} aria-label={'Thêm sticker '+asset.name} title={asset.name} disabled={items.length>=20} onClick={()=>{
      const key=crypto.randomUUID(); onChange([...items,{key,asset:asset.id,x:.5,y:.5,size:.23,rotation:0}]);onSelect(key);
    }}><img src={asset.src} alt="" /></button>)}</div>
    {!visible.length&&<p>Không có sticker phù hợp.</p>}
    <p className="sticker-credit">Sticker: <a href="https://openmoji.org/" target="_blank" rel="noopener noreferrer">OpenMoji</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>
  </details>
  {current&&<div className="sticker-adjust"><strong>{locked?'Lớp sticker đang khóa':'Sticker đang chọn'}</strong>
    <p>Kéo sticker để di chuyển. Kéo nút ↻ để xoay, nút ↘ để phóng to hoặc thu nhỏ ngay trên ảnh. Các nút cũng hỗ trợ phím mũi tên.</p>
    <button type="button" className="quiet-button" disabled={locked} onClick={()=>{onChange(items.filter(s=>s.key!==selected));onSelect(null);}}>Xóa sticker đang chọn</button>
  </div>}
  </section>;
}

