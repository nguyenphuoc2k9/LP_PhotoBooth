'use client';
import { useEffect,useRef,useState,type FormEvent,type ChangeEvent,type PointerEvent } from 'react';
import { cutPhotoWindow } from '@/lib/frame-cutout';
import { DEFAULT_OPTIONS } from '@/lib/config';
import { generatePhotoStrip,sampleFrame } from '@/lib/imaging';
import { loadSharedFrame,frameLayers,type SharedFrame,type FrameLayer } from '@/lib/shared-frames';
import { StickerLayer,StickerPicker } from './sticker-editor';
import { STICKER_CATALOG } from '@/lib/sticker-catalog';
import type { PhotoQuad } from '@/lib/collected-frames';

const fresh=():SharedFrame=>({id:'',name:'',width:720,height:1080,slots:[],overlay:false,showCaption:false,published:false,updatedAt:0,src:''});
export function FrameAdmin(){
  const [session,setSession]=useState<{authenticated:boolean;setupRequired:boolean;localSetup:boolean}|null>(null);
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[setupToken,setSetupToken]=useState('');
  const [frames,setFrames]=useState<SharedFrame[]>([]),[draft,setDraft]=useState<SharedFrame>(fresh);
  const [imageData,setImageData]=useState(''),[selected,setSelected]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[preview,setPreview]=useState('');
  const [cutting,setCutting]=useState(false),[tolerance,setTolerance]=useState(5);
  const [cutHistory,setCutHistory]=useState<{frame:SharedFrame;image:string}[]>([]);
  const [activeLayer,setActiveLayer]=useState('background');
  const stage=useRef<HTMLDivElement>(null),drag=useRef<{slot:number;corner:number;pointer:number}|null>(null);
  const revision=useRef(0);
  const update=(values:Partial<SharedFrame>)=>{revision.current++;setDraft(d=>{const next={...d,...values};return {...next,layers:frameLayers(next)};});setPreview('');};
  const layers=frameLayers(draft);
  const layerState=(id:string)=>layers.find(l=>l.id===id)!;
  const changeLayer=(id:string,values:Partial<FrameLayer>)=>update({layers:layers.map(l=>l.id===id?{...l,...values}:l)});
  function selectLayer(id:string){setActiveLayer(id);if(id.startsWith('photo-'))setSelected(Number(id.slice(6)));}
  function reorder(id:string,step:number){const next=[...layers],i=next.findIndex(l=>l.id===id),j=i+step;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];update({layers:next});}
  function removeSlot(){const id='photo-'+selected;if(layerState(id)?.locked)return;update({slots:draft.slots.filter((_,i)=>i!==selected),layers:layers.filter(l=>l.id!==id).map(l=>l.id.startsWith('photo-')&&Number(l.id.slice(6))>selected?{...l,id:'photo-'+(Number(l.id.slice(6))-1)}:l)});setSelected(0);setActiveLayer('background');}
  async function readSession(){const r=await fetch('/api/admin/session/',{cache:'no-store'});if(!r.ok)throw new Error('Không kết nối được máy chủ.');const data=await r.json();setSession(data);return data;}
  async function listFrames(){const r=await fetch('/api/frames/?admin=1',{cache:'no-store'});const data=await r.json();if(!r.ok){if(r.status===401)setSession(s=>s?{...s,authenticated:false}:s);throw new Error(data.error);}setFrames(data.frames);}
  useEffect(()=>{void readSession().then(s=>{if(s.authenticated)return listFrames();}).catch(e=>setMessage(e.message));},[]);
  async function login(e:FormEvent){
    e.preventDefault();setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/admin/session/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:session?.setupRequired?'setup':'login',email,password,setupToken})});
      const data=await r.json();if(!r.ok)throw new Error(data.error);setPassword('');setSetupToken('');await readSession();await listFrames();
    }catch(e){setMessage(e instanceof Error?e.message:'Không thể đăng nhập.');}finally{setBusy(false);}
  }
  async function logout(){
    const r=await fetch('/api/admin/session/',{method:'DELETE'});
    if(r.ok){setFrames([]);setCutHistory([]);setCutting(false);setDraft(fresh());setImageData('');setPreview('');await readSession();}else setMessage('Không thể đăng xuất. Hãy thử lại.');
  }
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    setBusy(true);setMessage('');
    try{
      if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Chọn ảnh PNG, JPG hoặc WebP dưới 20 MB.');
      const bitmap=await createImageBitmap(file);const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      if(canvas.width<100||canvas.height<100){bitmap.close();throw new Error('Khung cần có kích thước tối thiểu 100 × 100 px.');}
      canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Không đọc được ảnh.')),'image/png'));
      if(blob.size>7*1024*1024)throw new Error('Ảnh khung quá lớn sau khi xử lý. Hãy dùng ảnh nhỏ hơn.');
      const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(blob);});
      setCutHistory([]);setCutting(false);setImageData(data);update({src:data,width:canvas.width,height:canvas.height,name:draft.name||file.name.replace(/\.[^.]+$/,'').slice(0,60),slots:[],layers:undefined,stickers:[]});setSelected(0);setActiveLayer('background');
    }catch(e){setMessage(e instanceof Error?e.message:'Không đọc được ảnh khung.');}finally{setBusy(false);}
  }
  async function cutAt(clientX:number,clientY:number){
    if(busy||!stage.current||draft.slots.length>=4||layerState('background')?.locked)return;
    const rect=stage.current.getBoundingClientRect();
    const x=(clientX-rect.left)/rect.width*draft.width,y=(clientY-rect.top)/rect.height*draft.height;
    setBusy(true);setMessage('');
    try{
      const img=new Image();img.src=draft.src;await img.decode();
      const c=document.createElement('canvas');c.width=draft.width;c.height=draft.height;
      const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0,c.width,c.height);
      const result=cutPhotoWindow(ctx.getImageData(0,0,c.width,c.height),x,y,tolerance);
      ctx.putImageData(result.image,0,0);const src=c.toDataURL('image/png');
      if(src.length>9.7*1024*1024)throw new Error('Ảnh khung quá lớn để lưu. Hãy dùng ảnh nhỏ hơn.');
      setCutHistory(h=>[...h.slice(-7),{frame:draft,image:imageData}]);
      const next={...draft,src,overlay:true,slots:[...draft.slots,result.slot]};
      const nextLayers=frameLayers(next),bg=nextLayers.find(l=>l.id==='background')!;
      next.layers=[...nextLayers.filter(l=>l.id.startsWith('photo-')),{...bg,visible:true,opacity:1},...nextLayers.filter(l=>l.id.startsWith('sticker-'))];
      setImageData(src);update(next);setSelected(draft.slots.length);setActiveLayer('background');
      if(next.slots.length===4)setCutting(false);
      setMessage('Đã khoét ô '+next.slots.length+'. Khung ở trên, ảnh chụp ở dưới. Bấm Xem thử để kiểm tra mép trang trí.');
    }catch(e){setMessage(e instanceof Error?e.message:'Không khoét được vùng ảnh.');}
    finally{setBusy(false);}
  }
  function undoCut(){const previous=cutHistory.at(-1);if(!previous)return;setImageData(previous.image);update({src:previous.frame.src,slots:previous.frame.slots,layers:previous.frame.layers,overlay:previous.frame.overlay});setCutHistory(h=>h.slice(0,-1));setSelected(0);setActiveLayer('background');setMessage('Đã hoàn tác lần khoét gần nhất.');}
  function addSlot(){
    if(draft.slots.length>=4)return;const y=.08+draft.slots.length*.16;
    const slot:PhotoQuad=[[.15,y],[.85,y],[.85,y+.23],[.15,y+.23]];
    update({slots:[...draft.slots,slot]});setSelected(draft.slots.length);setActiveLayer('photo-'+draft.slots.length);
  }
  function move(e:PointerEvent<SVGSVGElement>){
    const active=drag.current;if(busy||!active||active.pointer!==e.pointerId||!stage.current)return;
    const rect=stage.current.getBoundingClientRect(),x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
    const slots=draft.slots.map(q=>q.map(p=>[...p]) as PhotoQuad);slots[active.slot][active.corner]=[x,y];update({slots});
  }
  function edit(frame:SharedFrame){setCutHistory([]);setCutting(false);revision.current++;setDraft(frame);setActiveLayer('background');setImageData('');setSelected(0);setPreview('');setMessage('');window.scrollTo({top:0,behavior:'instant'});}
  async function save(published:boolean){
    setBusy(true);setMessage('');
    try{
      const r=await fetch('/api/frames/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,id:draft.id||undefined,image:imageData||undefined,published})});
      const data=await r.json();if(!r.ok){if(r.status===401)setSession(s=>s?{...s,authenticated:false}:s);throw new Error(data.error);}
      setCutHistory([]);setCutting(false);setDraft(data.frame);setImageData('');await listFrames();setMessage(published?'Đã công bố. Mọi người có thể chọn khung này trong mục Khung admin.':'Đã lưu bản nháp. Chỉ admin xem được.');
    }catch(e){setMessage(e instanceof Error?e.message:'Không lưu được khung.');}finally{setBusy(false);}
  }
  async function remove(frame:SharedFrame){
    if(!window.confirm('Xóa khung “'+frame.name+'”?'))return;
    setBusy(true);
    try{const r=await fetch('/api/frames/'+frame.id+'/',{method:'DELETE'});const data=await r.json();if(!r.ok)throw new Error(data.error);if(draft.id===frame.id){setCutHistory([]);setCutting(false);setDraft(fresh());setImageData('');setPreview('');}await listFrames();setMessage('Đã xóa khung.');}
    catch(e){setMessage(e instanceof Error?e.message:'Không xóa được khung.');}finally{setBusy(false);}
  }
  async function tryPreview(){
    setBusy(true);setMessage('');const ticket=revision.current;
    try{await loadSharedFrame(draft);const sample=await sampleFrame();const result=generatePhotoStrip([sample,sample,sample,sample],{...DEFAULT_OPTIONS,customFrame:draft,caption:'Một chút kỷ niệm',border:'#365c87'},Math.min(1,900/draft.height));if(ticket===revision.current)setPreview(result.toDataURL());}
    catch{setMessage('Không tạo được ảnh thử. Kiểm tra ảnh nền và các ô ảnh.');}finally{setBusy(false);}
  }
  const selectedQuad=draft.slots[selected];
  return <main className="admin-page"><header className="admin-header"><a href="/">← Về photobooth</a><h1>Quản trị khung ảnh</h1>{session?.authenticated&&<button className="button secondary" disabled={busy} onClick={()=>void logout()}>Đăng xuất</button>}</header>
    {message&&<p role="status" className="admin-message">{message}</p>}
    {!session?<p>Đang kết nối máy chủ…</p>:!session.authenticated?<form className="admin-login" onSubmit={login}>
      <h2>{session.setupRequired?'Tạo tài khoản quản trị đầu tiên':'Đăng nhập admin'}</h2>
      <p>{session.setupRequired?'Tài khoản này dùng để tạo và công bố khung cho mọi người.':'Đăng nhập để quản lý thư viện khung dùng chung.'}</p>
      <label>Email quản trị<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Mật khẩu<input type="password" required minLength={12} maxLength={128} autoComplete={session.setupRequired?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label><small>Ít nhất 12 ký tự.</small>
      {session.setupRequired&&!session.localSetup&&<label>Mã thiết lập máy chủ<input type="password" value={setupToken} onChange={e=>setSetupToken(e.target.value)} required autoComplete="off"/></label>}
      <button className="button primary" disabled={busy}>{busy?'Đang xử lý…':session.setupRequired?'Tạo tài khoản quản trị':'Đăng nhập'}</button>
    </form>:<>
      <div className="admin-toolbar"><button className="button secondary" disabled={busy} onClick={()=>{setCutHistory([]);setCutting(false);setDraft(fresh());setImageData('');setPreview('');setMessage('');}}>Tạo khung mới</button><span>{frames.length} khung trên máy chủ</span></div>
      <div className="admin-workspace"><section className="admin-canvas-panel"><h2>1. Căn vị trí ảnh</h2><p>Kéo bốn góc của từng ô để khớp với vùng ảnh. Thứ tự: trên trái → trên phải → dưới phải → dưới trái.</p>
        {draft.src?<div ref={stage} className={'frame-design '+(cutting?'cutting':'')} style={{aspectRatio:draft.width/draft.height}}>
          {layers.map((l,order)=>{
            if(!l.visible)return null;
            if(l.id==='background')return <img key={l.id} src={draft.src} alt="Ảnh nền khung đang tạo" style={{position:'absolute',inset:0,zIndex:order,opacity:l.opacity,pointerEvents:'none'}}/>;
            if(!l.id.startsWith('photo-'))return null;
            const i=Number(l.id.slice(6)),q=draft.slots[i];
            return <svg key={l.id} style={{zIndex:order,opacity:l.opacity,pointerEvents:'none'}} viewBox={'0 0 '+draft.width+' '+draft.height} aria-label={'Ô ảnh '+(i+1)} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
              <g style={{pointerEvents:busy||l.locked?'none':'auto'}}><polygon points={q.map(([x,y])=>x*draft.width+','+y*draft.height).join(' ')} className={activeLayer===l.id?'active':''} onPointerDown={()=>selectLayer(l.id)}/>
              <text x={(q[0][0]+q[2][0])/2*draft.width} y={(q[0][1]+q[2][1])/2*draft.height} textAnchor="middle" fontSize={draft.width*.045} pointerEvents="none">{i+1}</text>
</g>
            </svg>;
          })}
          <StickerLayer items={draft.stickers??[]} selected={activeLayer.startsWith('sticker-')?activeLayer.slice(8):null} onSelect={key=>selectLayer('sticker-'+key)} onChange={stickers=>update({stickers})} disabled={busy} states={Object.fromEntries((draft.stickers??[]).map(s=>{const l=layerState('sticker-'+s.key);return [s.key,{...l,order:layers.indexOf(l)}];}))}/>
          {activeLayer==='photo-'+selected&&selectedQuad&&layerState(activeLayer)?.visible&&!layerState(activeLayer)?.locked&&!cutting&&<svg className="frame-slot-handles" style={{zIndex:80,pointerEvents:'none'}} viewBox={'0 0 '+draft.width+' '+draft.height} aria-label="Chỉnh góc ô ảnh phía dưới khung" onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
            <polygon points={selectedQuad.map(([x,y])=>x*draft.width+','+y*draft.height).join(' ')} style={{fill:'none',stroke:'#155fcc',strokeDasharray:'5 4'}}/>
            {selectedQuad.map(([x,y],corner)=><circle key={corner} style={{pointerEvents:busy?'none':'auto'}} cx={x*draft.width} cy={y*draft.height} r={draft.width*.015} onPointerDown={e=>{e.preventDefault();drag.current={slot:selected,corner,pointer:e.pointerId};e.currentTarget.ownerSVGElement!.setPointerCapture(e.pointerId);}}/>)}
          </svg>}
          {cutting&&<button type="button" className="cutout-surface" aria-label="Bấm vùng trắng để khoét ô ảnh" disabled={busy||draft.slots.length>=4} onClick={e=>void cutAt(e.clientX,e.clientY)}/>}
          </div>:<div className="admin-empty">Tải ảnh nền khung ở bên cạnh để bắt đầu.</div>}
        {preview&&<div className="admin-preview"><h3>Ảnh thử</h3><img src={preview} alt="Xem thử khung với ảnh mẫu"/></div>}
      </section>
      <section className="admin-controls"><h2>2. Thiết lập khung</h2>
        <fieldset disabled={busy}><label>Tên khung<input value={draft.name} maxLength={60} onChange={e=>update({name:e.target.value})} placeholder="Ví dụ: Polaroid mùa hè"/></label>
        <label>Ảnh nền khung<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/></label>
        {draft.src&&<p className="admin-dimensions">{draft.width} × {draft.height} px</p>}
        {draft.src&&<section className="cutout-tools" aria-label="Khoét ô ảnh"><h3>Khung trên · Ảnh dưới</h3><p>Với JPG có ô trắng: bật công cụ, bấm giữa từng ô theo thứ tự chụp. Mỗi lần bấm sẽ khoét vùng trắng và tạo một ô ảnh phía dưới, giữ trang trí chồng lên ảnh.</p>
          <button type="button" className="button secondary" aria-pressed={cutting} disabled={draft.slots.length>=4||layerState('background')?.locked} onClick={()=>{setCutting(!cutting);setActiveLayer('background');}}>{cutting?'Dừng khoét ô ảnh':'Khoét ô ảnh từ vùng trắng'}</button>
          {cutting&&<><p className="cutout-instruction">Bấm vào vùng trắng trên khung bên cạnh. Tối đa 4 ô ảnh.</p><label>Độ nhạy khoét: {tolerance}<input aria-label="Độ nhạy khoét" type="range" min="2" max="60" value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/></label><p>Nếu mất chi tiết trắng: hoàn tác rồi giảm độ nhạy. Nếu còn viền trắng: hoàn tác rồi tăng nhẹ.</p></>}
          <button type="button" className="quiet-button" disabled={!cutHistory.length} onClick={undoCut}>Hoàn tác lần khoét</button>
        </section>}
        <button type="button" className="button secondary" disabled={!draft.src||draft.slots.length>=4} onClick={addSlot}>Thêm ô ảnh ({draft.slots.length}/4)</button>
        <div className="admin-slot-tabs">{draft.slots.map((_,i)=><button key={i} type="button" aria-pressed={selected===i} onClick={()=>selectLayer('photo-'+i)}>Ô {i+1}</button>)}</div>
        {selectedQuad&&activeLayer==='photo-'+selected&&<fieldset disabled={layerState(activeLayer)?.locked}><div className="corner-inputs">{selectedQuad.map(([x,y],corner)=><div key={corner}><span>Góc {corner+1}</span>{(['X','Y'] as const).map((axis,k)=><label key={axis}>{axis}<input aria-label={'Góc '+(corner+1)+' '+axis} type="number" min="0" max="100" step=".1" value={Math.round((k?y:x)*1000)/10} onChange={e=>{const slots=draft.slots.map(q=>q.map(p=>[...p]) as PhotoQuad);slots[selected][corner][k]=Math.max(0,Math.min(1,Number(e.target.value)/100));update({slots});}}/></label>)}</div>)}</div><button type="button" className="quiet-button" onClick={removeSlot}>Xóa ô đang chọn</button></fieldset>}
        <label className="admin-check"><input type="checkbox" checked={draft.overlay} onChange={e=>{const background=layerState('background'),others=layers.filter(l=>l.id!=='background');update({overlay:e.target.checked,layers:e.target.checked?[...others,background]:[background,...others]});}}/>Đặt khung PNG trong suốt lên trên ảnh</label>
        <label className="admin-check"><input type="checkbox" checked={draft.showCaption} onChange={e=>update({showCaption:e.target.checked})}/>In lời nhắn ở cuối khung</label>
        <p className="admin-hint">Khung JPG cần khoét vùng trắng trước khi đặt lên trên ảnh. PNG có ô trong suốt có thể đặt lên trên ngay. Dùng Xem thử để kiểm tra, rồi lưu khung.</p>
        {draft.src&&<section className="frame-layers" aria-label="Quản lý lớp"><h3>Các lớp <small>Trên cùng → dưới cùng</small></h3>
          {[...layers].reverse().map(l=>{const name=l.id==='background'?'Ảnh nền':l.id.startsWith('photo-')?'Ô ảnh '+(Number(l.id.slice(6))+1):STICKER_CATALOG.find(a=>a.id===draft.stickers?.find(s=>'sticker-'+s.key===l.id)?.asset)?.name??'Sticker';return <div key={l.id} className={'frame-layer-row '+(activeLayer===l.id?'active':'')} data-layer={l.id}>
            <button type="button" className="layer-name" aria-pressed={activeLayer===l.id} onClick={()=>selectLayer(l.id)}>{name}</button>
            <button type="button" aria-label={(l.visible?'Ẩn':'Hiện')+' lớp '+name} onClick={()=>changeLayer(l.id,{visible:!l.visible})}>{l.visible?'◉':'○'}</button>
            <button type="button" aria-label={(l.locked?'Mở khóa':'Khóa')+' lớp '+name} onClick={()=>changeLayer(l.id,{locked:!l.locked})}>{l.locked?'🔒':'🔓'}</button>
            <button type="button" aria-label={'Đưa lên lớp '+name} disabled={l.locked||layers.indexOf(l)===layers.length-1} onClick={()=>reorder(l.id,1)}>↑</button>
            <button type="button" aria-label={'Đưa xuống lớp '+name} disabled={l.locked||layers.indexOf(l)===0} onClick={()=>reorder(l.id,-1)}>↓</button>
          </div>;})}
          {layerState(activeLayer)&&<label>Độ hiện của lớp <span>{Math.round(layerState(activeLayer).opacity*100)}%</span><input aria-label="Độ hiện của lớp" type="range" min="0" max="100" disabled={layerState(activeLayer).locked} value={layerState(activeLayer).opacity*100} onChange={e=>changeLayer(activeLayer,{opacity:Number(e.target.value)/100})}/></label>}
          <StickerPicker locked={layerState(activeLayer)?.locked} items={draft.stickers??[]} selected={activeLayer.startsWith('sticker-')?activeLayer.slice(8):null} onSelect={key=>selectLayer(key?'sticker-'+key:'background')} onChange={stickers=>{if(activeLayer.startsWith('sticker-')&&layerState(activeLayer)?.locked&&stickers.length<(draft.stickers??[]).length)return;update({stickers});}}/>
        </section>}
        <button type="button" className="button secondary" disabled={!draft.src||!draft.slots.length} onClick={()=>void tryPreview()}>Xem thử với ảnh mẫu</button>
        <div className="admin-save"><button type="button" className="button secondary" disabled={!draft.name.trim()||!draft.src||!draft.slots.length} onClick={()=>void save(false)}>Lưu bản nháp</button><button type="button" className="button primary" disabled={!draft.name.trim()||!draft.src||!draft.slots.length} onClick={()=>void save(true)}>Lưu và công bố</button></div>
        </fieldset>
      </section></div>
      <section className="admin-library"><h2>Khung đã lưu</h2>{!frames.length&&<p>Chưa có khung nào. Tạo chiếc khung đầu tiên ở phía trên.</p>}<div className="admin-frame-list">{frames.map(frame=><article key={frame.id}><img src={frame.src} alt={frame.name}/><h3>{frame.name}</h3><p>{frame.slots.length} ảnh · {frame.published?'Đang công bố':'Bản nháp'}</p><button className="button secondary" disabled={busy} onClick={()=>edit(frame)}>Chỉnh sửa {frame.name}</button><button className="quiet-button" disabled={busy} onClick={()=>void remove(frame)}>Xóa {frame.name}</button></article>)}</div></section>
    </>}
  </main>;
}


