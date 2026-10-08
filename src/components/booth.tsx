'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';
import { Camera, ImagePlus, RotateCcw, Download, ShieldCheck, Check, X, Aperture, Menu, Images, Frame, SwitchCamera, Sparkles, LoaderCircle, Heart, Star } from 'lucide-react';
import { useCamera, CAMERA_MESSAGES } from '@/hooks/use-camera';
import { DEFAULT_OPTIONS, FILTERS, LAYOUTS, THEMES, localDate, type PrintOptions, type LayoutId, type ThemeId } from '@/lib/config';
import { applyFilter, captureFrame, composePhoto, downloadPhoto, generatePhotoStrip, sampleFrame } from '@/lib/imaging';

import { COLLECTED_FRAMES, loadCollectedFrame, frameLayout, isFrameLayout } from '@/lib/collected-frames';
import { ARPicker } from './ar-picker';
import { useAR } from '@/hooks/use-ar';
import { paintAR,type ARAccessory } from '@/lib/ar';
import { BeautyPicker } from './beauty-picker';
import { StickerLayer, StickerPicker } from './sticker-editor';
import { renderStickers, type PlacedSticker } from '@/lib/stickers';
import { EffectPicker } from './effect-picker';
import { applyPhotoEffects, sessionTimestamp } from '@/lib/effects';
import { loadSharedFrame, type SharedFrame } from '@/lib/shared-frames';
import { PINTEREST_SOURCES } from '@/lib/pinterest';

type Phase = 'camera' | 'countdown' | 'result';
export function Booth() {
  const camera = useCamera();
  const [options, setOptions] = useState<PrintOptions>({ ...DEFAULT_OPTIONS });
  const [arEnabled,setArEnabled]=useState(false),[arItems,setArItems]=useState<ARAccessory[]>(['glasses']),[arSize,setArSize]=useState(1);
  const [phase, setPhase] = useState<Phase>('camera');
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [delay, setDelay] = useState(3);
  const [count, setCount] = useState<number | null>(null);
  const [photos, setPhotos] = useState<(HTMLCanvasElement | null)[]>([null, null, null, null]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [sample, setSample] = useState<HTMLCanvasElement | null>(null);
  const [filterThumbs, setFilterThumbs] = useState<string[]>([]);
  const [frameThumbs, setFrameThumbs] = useState<Record<string, string>>({});
  const [sharedFrames, setSharedFrames] = useState<SharedFrame[]>([]);
  const [galleryStatus, setGalleryStatus] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [message, setMessage] = useState('');
  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState('');
  const [size, setSize] = useState('');
  const [rendering, setRendering] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLCanvasElement | null>(null);
  const gallery = useRef<HTMLDialogElement>(null);
  const help = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const targetSlot = useRef<number | null>(null);
  const generation = useRef(0);
  const capturing = useRef(false);
  const alive = useRef(true);
  const choosingFrame = useRef(0);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const baseLayout = LAYOUTS.find(l => l.id === options.layout)!;
  const custom = options.customFrame;
  const firstSlot = custom?.slots[0];
  const ratio = custom && firstSlot ? Math.hypot((firstSlot[1][0]-firstSlot[0][0])*custom.width,(firstSlot[1][1]-firstSlot[0][1])*custom.height)/Math.hypot((firstSlot[3][0]-firstSlot[0][0])*custom.width,(firstSlot[3][1]-firstSlot[0][1])*custom.height) : baseLayout.ratio;
  const layout = custom ? { ...baseLayout, shots: custom.slots.length, ratio: Math.max(.25,Math.min(4,ratio)) } : baseLayout;
  const baseTheme = THEMES.find(t => t.id === options.theme)!;
  const theme = custom ? { ...baseTheme, name: custom.name } : baseTheme;
  const selected = photos.slice(0, layout.shots);
  const total = selected.filter(Boolean).length;
  const complete = total === layout.shots;
  const busy = phase === 'countdown' || uploading;
  const ready = demo ? !!sample : camera.status === 'ready';
  const ar=useAR({enabled:arEnabled,active:ready&&phase!=='result'&&!uploading,video:camera.videoRef,sample,demo});
  const arUnavailable=arEnabled&&ar.status!=='ready';
  const update = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => setOptions(o => ({ ...o, [key]: value }));

  useEffect(() => {
    alive.current = true;
    setOptions(o => ({ ...o, date: localDate(), timestamp: sessionTimestamp() }));
    let disposed = false;
    const placeholder = document.createElement('canvas'); placeholder.width = 320; placeholder.height = 240;
    const placeholderContext = placeholder.getContext('2d')!;
    placeholderContext.fillStyle = '#dcecff'; placeholderContext.fillRect(0, 0, 320, 240);
    placeholderContext.fillStyle = '#779ccb'; placeholderContext.textAlign = 'center'; placeholderContext.font = '24px Arial'; placeholderContext.fillText('Ảnh của bạn', 160, 130);
    let picture = placeholder;
    const previewFrame = (id: ThemeId) => {
      if (disposed) return;
      const t = THEMES.find(t => t.id === id)!;
      try {
        const thumbnail = generatePhotoStrip([picture, picture, picture, picture], { ...DEFAULT_OPTIONS, customFrame: undefined, theme: id, layout: frameLayout(id) ?? 'strip', background: t.color, border: t.color, caption: 'stillroom', showDate: false }, .18).toDataURL('image/png');
        setFrameThumbs(old => ({ ...old, [id]: thumbnail }));
      } catch { /* One unavailable frame must not lock the rest of the gallery. */ }
    };
    for (const t of THEMES) {
      if (COLLECTED_FRAMES[t.id]) void loadCollectedFrame(t.id).then(() => previewFrame(t.id)).catch(() => {});
      else previewFrame(t.id);
    }
    sampleFrame().then(frame => {
      if (disposed) return;
      picture = frame; setSample(frame);
      setFilterThumbs(FILTERS.map(f => composePhoto(frame, 96, 72, f.id).toDataURL('image/jpeg', .8)));
      for (const t of THEMES) previewFrame(t.id);
    }).catch(() => { if (!disposed) setMessage('Ảnh mẫu chưa tải được. Bạn vẫn có thể chọn khung, chụp hoặc tải ảnh lên.'); });
    return () => { disposed = true; alive.current = false; generation.current++; capturing.current = false; };

  }, []);

  useEffect(() => {
    let disposed=false;
    const refresh=()=>fetch('/api/frames/',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(!disposed)setSharedFrames(data.frames);}).catch(()=>{});
    void refresh(); window.addEventListener('focus',refresh);
    return()=>{disposed=true;window.removeEventListener('focus',refresh);};
  }, []);

  // Reuse two small canvases. Sample mode renders once unless AR is enabled; live filters run at 12 fps.
  useEffect(() => {
    if (!ready || phase === 'result') return;
    const scratch = document.createElement('canvas');
    scratch.width = 640; scratch.height = Math.round(640 / layout.ratio);
    const ctx = scratch.getContext('2d')!;
    let raf = 0, last = 0;
    const draw = () => {
      const source = demo ? sample : camera.videoRef.current;
      const output = canvasRef.current;
      if (!source || !output) return;
      const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
      if (!sw || !sh) return;
      const w = Math.min(sw, sh * layout.ratio), h = w / layout.ratio;
      ctx.drawImage(source, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, scratch.width, scratch.height);
      if(arEnabled&&performance.now()-ar.latest.current.at<600)paintAR(ctx,ar.latest.current.faces,arItems,scratch.width,scratch.height,{x:(sw-w)/2/sw,y:(sh-h)/2/sh,width:w/sw,height:h/sh},arSize);
      applyFilter(scratch, options.filter, output);
    };
    if (demo&&!arEnabled) { draw(); return; }
    const tick = (now: number) => {
      if (!document.hidden && now - last > 83) { last = now; draw(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, demo, sample, phase, layout.ratio, options.filter, camera.videoRef,arEnabled,arItems,arSize,ar.latest]);

  useEffect(() => {
    setThumbs(photos.map(p => p ? applyPhotoEffects(composePhoto(p, 240, 240 / layout.ratio, options.filter, [], options.beauty), options.effects, options.timestamp).toDataURL('image/jpeg', .86) : ''));
  }, [photos, options.filter, options.beauty, options.effects, options.timestamp, layout.ratio]);

  useEffect(() => {
    if (phase !== 'result') return;
    setRendering(true);
    let disposed = false, url = '';
    const timer = window.setTimeout(() => {
      try {
        const result = generatePhotoStrip(photos.slice(0, layout.shots) as HTMLCanvasElement[], options);
        result.toBlob(blob => {
          if (disposed || !alive.current) return;
          if (!blob) { setRendering(false); setMessage('Không thể tạo ảnh. Vui lòng thử lại.'); return; }
          url = URL.createObjectURL(blob); printRef.current = result; setPreview(url);
          setSize(result.width + ' × ' + result.height + ' px'); setRendering(false);
        }, 'image/png');
      } catch { setMessage('Chưa đủ ảnh cho bố cục này. Vui lòng quay lại chụp thêm.'); setRendering(false); }
    }, 100);
    return () => { disposed = true; clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [photos, options, phase, layout.shots]);

  useEffect(() => {
    if (phase === 'result') { resultHeading.current?.focus(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }, [phase]);

  const cancel = useCallback(() => {
    generation.current++; capturing.current = false; setCount(null); setFlash(false); setPhase('camera');
    setMessage('Đã dừng chụp. Những ảnh đã chụp vẫn được giữ lại.');
  }, []);
  useEffect(() => {
    const hidden = () => { if (document.hidden && capturing.current) cancel(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, [cancel]);
  useEffect(() => {
    if (phase === 'countdown' && !demo && camera.status !== 'ready') cancel();
  }, [phase, demo, camera.status, cancel]);

  function finish() { camera.stop(); setPhase('result'); }
  async function shoot(automatic: boolean) {
    if (!ready || arUnavailable || capturing.current || complete) return;
    capturing.current = true; const ticket = ++generation.current;
    const valid = () => alive.current && generation.current === ticket;
    const next = [...photos];
    const empty = selected.map((p, i) => p ? -1 : i).filter(i => i >= 0);
    const indices = automatic ? empty : empty.slice(0, 1);
    if (!photos.some(Boolean)) update('timestamp', sessionTimestamp());
    setPhase('countdown'); setMessage('');
    try {
      for (const index of indices) {
        for (let n = delay; n > 0; n--) { if (!valid()) return; setCount(n); await new Promise(r => setTimeout(r, 1000)); }
        if (!valid()) return;
        setCount(null);const raw=demo?sample!:captureFrame(camera.videoRef.current!);
        next[index]=arEnabled?await ar.decorate(raw,arItems,arSize):raw;
        if(!valid())return;
        setPhotos([...next]); setFlash(true);
        await new Promise(r => setTimeout(r, 120)); if (!valid()) return; setFlash(false);
        await new Promise(r => setTimeout(r, 280)); if (!valid()) return;
      }
      capturing.current = false;
      if (next.slice(0, layout.shots).every(Boolean)) finish(); else setPhase('camera');
    } catch {
      if (valid()) { capturing.current = false; setPhase('camera'); setCount(null); setFlash(false); setMessage(arEnabled?'Chưa chụp được ảnh với AR. Hãy thử lại hoặc tắt AR.':'Chưa chụp được ảnh. Hãy kiểm tra camera và thử lại.'); }
    }
  }
  function reset() {
    generation.current++; capturing.current = false;
    setPhotos([null, null, null, null]); setStickers([]); setSelectedSticker(null); setPreview(''); printRef.current = null;
    setPhase('camera'); setMessage(''); setCount(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  async function chooseFrame(id: ThemeId) {
    const ticket = ++choosingFrame.current; setGalleryStatus('Đang tải khung…');
    try { await loadCollectedFrame(id); }
    catch { if (alive.current && ticket === choosingFrame.current) setGalleryStatus('Khung này chưa tải được. Hãy chọn lại để thử tải, hoặc chọn một khung khác.'); return; }
    if (!alive.current || ticket !== choosingFrame.current) return;

    const t = THEMES.find(t => t.id === id)!;
    setOptions(o => ({ ...o, customFrame: undefined, theme: id, layout: frameLayout(id) ?? ((o.customFrame || isFrameLayout(o.layout)) ? 'strip' : o.layout), background: t.color, border: t.color }));
    setGalleryStatus(''); gallery.current?.close();
    const nextLayout = frameLayout(id) ?? ((options.customFrame || isFrameLayout(options.layout)) ? 'strip' : options.layout);
    const needed = LAYOUTS.find(l => l.id === nextLayout)!.shots;
    const missing = photos.slice(0, needed).filter(p => !p).length;
    if (phase === 'result' && missing) { setPhase('camera'); setMessage('Chụp hoặc tải thêm ' + missing + ' ảnh để dùng khung này.'); }
  }
  async function chooseSharedFrame(frame:SharedFrame) {
    const ticket=++choosingFrame.current; setGalleryStatus('Đang tải khung…');
    try { await loadSharedFrame(frame); } catch { if(ticket===choosingFrame.current)setGalleryStatus('Không tải được khung này. Hãy thử chọn lại.');return; }
    if(!alive.current||ticket!==choosingFrame.current)return;
    setOptions(o=>({...o,customFrame:frame,layout:'strip'}));setGalleryStatus(''); gallery.current?.close();
    const missing=photos.slice(0,frame.slots.length).filter(p=>!p).length;
    if(phase==='result'&&missing){setPhase('camera');setMessage('Chụp hoặc tải thêm '+missing+' ảnh để dùng khung này.');}
  }
  function uploadAt(slot: number | null) { targetSlot.current = slot; input.current?.click(); }
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); e.target.value = '';
    if (!files.length || busy) return;
    if(arUnavailable){setMessage('AR chưa sẵn sàng. Hãy đợi hoặc tắt AR trước khi tải ảnh.');return;}
    setUploading(true); setMessage('');
    if (!photos.some(Boolean)) update('timestamp', sessionTimestamp());
    const next = [...photos];
    const destinations = targetSlot.current === null ? selected.map((p, i) => p ? -1 : i).filter(i => i >= 0) : [targetSlot.current];
    const slots = destinations.length ? destinations : [0];
    try {
      for (let i = 0; i < Math.min(files.length, slots.length); i++) {
        const file = files[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Chọn ảnh JPG, PNG hoặc WebP dưới 20 MB.');
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bitmap.width * scale)); c.height = Math.max(1, Math.round(bitmap.height * scale));
        c.getContext('2d')!.drawImage(bitmap, 0, 0, c.width, c.height); bitmap.close(); next[slots[i]] = arEnabled?await ar.decorate(c,arItems,arSize):c;
      }
      if (alive.current) setPhotos(next);
    } catch (error) { setMessage(error instanceof Error && error.message.startsWith('Chọn') ? error.message : 'Không đọc được ảnh này. Hãy thử ảnh JPG, PNG hoặc WebP khác.'); }
    finally { if (alive.current) setUploading(false); }
  }
  async function save() {
    if (!printRef.current || rendering || saving) return;
    setSaving(true);
    try { await downloadPhoto(await renderStickers(printRef.current, stickers)); setMessage('Đã tạo file PNG. Kiểm tra thư mục tải xuống của bạn nhé!'); }
    catch { setMessage('Không tải được ảnh. Vui lòng thử lại.'); }
    finally { setSaving(false); }
  }

  return <main id="main" className="studio">
    <a href="#camera-area" className="skip-link">Đến khu vực chụp ảnh</a>
    <header className="studio-header">
      <div className="header-tools"><button className="menu-button" onClick={() => help.current?.showModal()}><Menu size={17} />Hướng dẫn</button><span className="language-label">VN · Tiếng Việt</span></div>
      <a href="/" className="brand" aria-label="Stillroom — Trang chủ">stillroom<span>photobooth của bạn</span></a>
      <div className="header-note"><ShieldCheck size={15} />Ảnh chỉ ở trên máy bạn</div>
    </header>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={upload} className="sr-only" aria-label="Chọn ảnh từ thiết bị" />
    <video ref={camera.videoRef} autoPlay playsInline muted className="source-video" aria-hidden="true" />

    {phase !== 'result' ? <div className="studio-grid">
      <section className="capture-panel" id="camera-area" aria-label="Khu vực chụp ảnh">
        <fieldset className="toolbar" disabled={busy}>
          <label>Bố cục ảnh<select disabled={!!options.customFrame} value={options.layout} onChange={e => update('layout', e.target.value as LayoutId)}>{options.customFrame ? <option value={options.layout}>{layout.shots} ảnh · Khung admin</option> : LAYOUTS.filter(l => frameLayout(options.theme) ? l.id === frameLayout(options.theme) : !isFrameLayout(l.id)).map(l => <option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
          <label>Đếm ngược<select value={delay} onChange={e => setDelay(Number(e.target.value))}>{[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} giây</option>)}</select></label>
          <button className="frame-button" onClick={() => gallery.current?.showModal()}><Frame size={17} />Chọn khung<span>{THEMES.length + sharedFrames.length}</span></button>
          <button className="sample-button" aria-pressed={demo} disabled={!sample} onClick={() => { camera.stop(); setDemo(!demo); }}>Ảnh mẫu{demo && <Check size={14} />}</button>
        </fieldset>
        <div className="viewfinder" style={{ '--ratio': layout.ratio } as CSSProperties}>
          <canvas ref={canvasRef} className={!demo && facing === 'user' ? 'mirrored' : ''} aria-label="Xem trước camera" role="img" />
          {!ready && <div className="camera-empty">
            <div className="camera-symbol">{camera.status === 'requesting' ? <LoaderCircle className="spin" size={32} /> : <Camera size={32} />}</div>
            <h1>{camera.status === 'requesting' ? 'Đang kết nối camera…' : camera.status === 'idle' ? 'Sẵn sàng lưu một chút kỷ niệm?' : 'Chưa thể kết nối camera'}</h1>
            <p>{CAMERA_MESSAGES[camera.status]}</p>
            {camera.status !== 'requesting' && <button className="button primary" onClick={() => { setDemo(false); void camera.start(facing); }}><Camera size={17} />{camera.status === 'idle' ? 'Bật camera' : 'Thử lại'}</button>}
            <button className="upload-inline" disabled={busy} onClick={() => uploadAt(null)}>Hoặc tải ảnh từ thiết bị</button>
          </div>}
          {ready && <><span className="camera-status">{demo ? 'Đang dùng ảnh mẫu' : 'Camera đang bật'}</span><span className="mirror-note">{demo ? 'Ảnh minh họa' : facing === 'user' ? 'Xem trước lật gương' : 'Camera sau'}</span></>}
          {count !== null && <div className="countdown" aria-hidden="true">{count}</div>}
          {flash && <div className="capture-flash" />}
        </div>
        <div className="capture-controls">
          <button className="capture-action" disabled={!ready || arUnavailable || busy || complete} onClick={() => void shoot(false)}><span><Camera size={23} /></span>Chụp từng ảnh</button>
          <button className="capture-action auto" disabled={!ready || arUnavailable || busy || complete} onClick={() => void shoot(true)}><span>{phase === 'countdown' ? <span className="shutter-count">{count ?? <Check />}</span> : <Aperture size={31} />}</span>Chụp tự động</button>
          <button className="capture-action" disabled={busy || !photos.some(Boolean)} onClick={reset}><span><RotateCcw size={23} /></span>Chụp lại</button>
        </div>
        <div className="secondary-controls">
          {phase === 'countdown' ? <button className="button secondary" onClick={cancel}><X size={15} />Dừng chụp</button> : <><button className="button upload-button" disabled={uploading} onClick={() => uploadAt(null)}><ImagePlus size={16} />{uploading ? 'Đang đọc ảnh…' : 'Tải ảnh lên'}</button>{!demo && camera.status === 'ready' && <button className="quiet-button" onClick={() => { const next = facing === 'user' ? 'environment' : 'user'; setFacing(next); void camera.start(next); }}><SwitchCamera size={16} />Đổi camera</button>}</>}
        </div>
        <fieldset className="filters-panel" disabled={busy}><legend>Bộ lọc màu <span>12 sắc thái cho khoảnh khắc của bạn</span></legend><div className="filter-list">{FILTERS.map((f, i) => <button key={f.id} className={'filter-option ' + (options.filter === f.id ? 'selected' : '')} aria-pressed={options.filter === f.id} onClick={() => update('filter', f.id)}>{filterThumbs[i] && <img src={filterThumbs[i]} alt="" />}<span>{f.name}</span></button>)}</div></fieldset>
        <ARPicker enabled={arEnabled} onEnabled={setArEnabled} items={arItems} onItems={setArItems} size={arSize} onSize={setArSize} status={ar.status} faces={ar.faceCount} active={ready} disabled={busy} onRetry={ar.retry}/>
        <EffectPicker value={options.effects} onChange={v => update('effects', v)} disabled={busy} />
        <BeautyPicker value={options.beauty} onChange={v => update('beauty', v)} disabled={busy} />
        <p className="privacy-line"><ShieldCheck size={14} />Ảnh được xử lý trên thiết bị, không gửi lên máy chủ.</p>
      </section>

      <aside className="strip-panel" aria-label="Dải ảnh của bạn">
        <div className="strip-heading"><h2>Dải ảnh của bạn</h2><span>{total}/{layout.shots}</span></div>
        <div className={'photo-slots ' + (layout.shots === 1 ? 'one' : '')} style={{ '--frame-color': theme.color } as CSSProperties}>
          {selected.map((photo, i) => <div className={'photo-slot ' + (photo ? 'has-photo' : '')} key={i}>
            <span className="slot-number">{String(i + 1).padStart(2, '0')}</span>
            {thumbs[i] && photo ? <img src={thumbs[i]} alt={'Ảnh ' + (i + 1)} /> : <Images size={38} strokeWidth={1.2} />}
            <button disabled={busy} className="slot-upload" onClick={() => uploadAt(i)} aria-label={(photo ? 'Thay ảnh ' : 'Tải ảnh ') + (i + 1)}><ImagePlus size={13} />{photo ? 'Thay ảnh' : 'Tải ảnh'}</button>
          </div>)}
        </div>
        <button className="current-frame" disabled={busy} onClick={() => gallery.current?.showModal()}><span style={{ background: theme.color }} /><span>{theme.name}</span><Frame size={15} /></button>
        <button className="button primary create-print" disabled={!complete || busy} onClick={finish}><Sparkles size={17} />Tạo ảnh{!complete && <span>{total}/{layout.shots}</span>}</button>
        <p className="strip-hint">{complete ? 'Ảnh đã đủ. Thêm lời nhắn rồi tải về nhé!' : 'Chụp hoặc tải ảnh vào từng ô.'}</p>
      </aside>
    </div> : <section className="result-page">
      <div className="result-title"><span>Ảnh của bạn đã sẵn sàng</span><h1 tabIndex={-1} ref={resultHeading}>Giữ lại khoảnh khắc này.</h1><p>Thêm một lời nhắn, chọn khung yêu thích rồi tải về.</p></div>
      <div className="result-grid"><div className="result-stage">{preview ? <div className="print-composition" style={{ width: !options.customFrame && options.layout === 'strip' ? 205 : Math.min(500, 640 * (printRef.current ? printRef.current.width / printRef.current.height : 1)) }}><img className={'finished-print ' + options.layout} src={preview} alt={'Ảnh hoàn chỉnh: ' + options.caption} /><StickerLayer items={stickers} selected={selectedSticker} onSelect={setSelectedSticker} onChange={setStickers} /></div> : <LoaderCircle className="spin" />}<span className="print-size">{size} · PNG{rendering ? ' · Đang cập nhật…' : ''}</span></div>
      <div className="print-editor"><h2>Một chút của riêng bạn</h2>
        <button className="current-frame" onClick={() => gallery.current?.showModal()}><span style={{ background: theme.color }} />{theme.name}<Frame size={17} /></button>
        <label>Lời nhắn<input value={options.caption} maxLength={60} onChange={e => update('caption', e.target.value)} placeholder="Viết một điều dễ thương…" /></label>
        <label>Bộ lọc màu<select aria-label="Bộ lọc màu" value={options.filter} onChange={e => update('filter', e.target.value as PrintOptions['filter'])}>{FILTERS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label>Bố cục ảnh<select disabled={!!options.customFrame} aria-label="Bố cục ảnh" value={options.layout} onChange={e => update('layout', e.target.value as LayoutId)}>{options.customFrame ? <option value={options.layout}>{layout.shots} ảnh · Khung admin</option> : LAYOUTS.filter(l => (frameLayout(options.theme) ? l.id === frameLayout(options.theme) : !isFrameLayout(l.id)) && photos.slice(0, l.shots).every(Boolean)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <EffectPicker value={options.effects} onChange={v => update('effects', v)} />
        <BeautyPicker value={options.beauty} onChange={v => update('beauty', v)} />
        <StickerPicker items={stickers} selected={selectedSticker} onSelect={setSelectedSticker} onChange={setStickers} />
        {!options.customFrame && !COLLECTED_FRAMES[options.theme] && <div className="color-row"><label>Màu nền<input type="color" value={options.background} onChange={e => update('background', e.target.value)} /></label><label>Màu viền<input type="color" value={options.border} onChange={e => update('border', e.target.value)} /></label></div>}
        <div className="date-row"><label><input type="checkbox" checked={options.showDate} onChange={e => update('showDate', e.target.checked)} />In ngày chụp</label><input type="date" aria-label="Ngày chụp" disabled={!options.showDate} value={options.date} onChange={e => update('date', e.target.value)} /></div>
        <fieldset className="decorations"><legend>Trang trí nhỏ</legend>{(['none', 'heart', 'star', 'sparkle'] as const).map((kind, i) => { const Icon = [X, Heart, Star, Sparkles][i]; return <button key={kind} aria-label={['Không trang trí', 'Trái tim', 'Ngôi sao', 'Lấp lánh'][i]} aria-pressed={options.decoration === kind} className={options.decoration === kind ? 'selected' : ''} onClick={() => update('decoration', kind)}><Icon size={18} /></button>; })}</fieldset>
        <button className="button primary download-button" disabled={!preview || rendering || saving} onClick={() => void save()}><Download size={18} />{saving ? 'Đang tải ảnh…' : 'Tải ảnh PNG'}</button>
        <button className="button secondary" onClick={reset}><RotateCcw size={16} />Chụp bộ ảnh mới</button>
        <p className="editor-note">Camera đã tắt. Ảnh vẫn chỉ ở trên thiết bị của bạn.</p>
      </div></div>
    </section>}

    <footer className="studio-footer"><span>stillroom · Một chút kỷ niệm, một chút bạn.</span><a href="/admin/">Quản trị khung</a><button onClick={() => help.current?.showModal()}>Hướng dẫn & quyền riêng tư</button></footer>
    <dialog onClose={() => { choosingFrame.current++; setGalleryStatus(''); }} ref={gallery} className="frame-dialog"><div className="dialog-heading"><div><span>{THEMES.length + sharedFrames.length} thiết kế dành cho bạn</span><h2>Chọn chiếc khung yêu thích</h2></div><button onClick={() => gallery.current?.close()} aria-label="Đóng thư viện khung"><X /></button></div><p className="gallery-status" role="status" hidden={!galleryStatus}>{galleryStatus}</p><div className="frame-categories">{['Tất cả', 'Khung admin', 'Sắc xanh', 'Sưu tầm', 'Dễ thương', 'Tối giản', 'Hoài cổ', 'Sự kiện'].map(c => <button key={c} aria-pressed={category === c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div><div className="frame-grid">{(category==='Tất cả'||category==='Khung admin')&&sharedFrames.map(frame=><button type="button" key={frame.id} aria-label={frame.name} className={'frame-choice collected '+(options.customFrame?.id===frame.id?'selected':'')} aria-pressed={options.customFrame?.id===frame.id} onClick={()=>void chooseSharedFrame(frame)}><div><img src={frame.src} alt={'Khung '+frame.name}/></div><span>{frame.name}</span></button>)}{THEMES.filter(t => category === 'Tất cả' || t.category === category).map(t => <button key={t.id} aria-label={t.name} disabled={busy} className={'frame-choice ' + (COLLECTED_FRAMES[t.id] ? 'collected ' : '') + (!options.customFrame && options.theme === t.id ? 'selected' : '')} aria-pressed={!options.customFrame && options.theme === t.id} onClick={() => chooseFrame(t.id)}><div style={{ background: t.color + '88' }}>{frameThumbs[t.id] ? <img src={frameThumbs[t.id]} alt={'Xem trước khung ' + t.name} /> : <Frame />}{!options.customFrame && options.theme === t.id && <span className="frame-check"><Check size={15} /></span>}</div><span>{t.name}</span></button>)}</div><p className="gallery-note"><a href="/admin/" target="_blank" rel="noopener noreferrer">Quản trị · Tạo khung mới ↗</a></p><p className="gallery-note">26 khung Stillroom hỗ trợ 4 bố cục. 3 khung sưu tầm và khung Mèo và sao xanh dùng bố cục riêng gồm 3 ảnh.</p><p className="gallery-note">Khung Mèo và sao xanh: ảnh do bạn cung cấp. Khung sưu tầm khác: <a href="https://www.detanet.ro/2022/09/free-dslrbooth-templates-wedding-pack-for.html" target="_blank" rel="noopener noreferrer">Cristian · DetaNet ↗</a></p><details className="pinterest-sources"><summary>Khám phá thêm trên Pinterest · 6 gợi ý</summary><p>Các liên kết tham khảo mở trên Pinterest. Những mẫu này chưa được nhập vào thư viện chụp ảnh.</p><div className="pinterest-links">{PINTEREST_SOURCES.map(p => <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>)}</div></details></dialog>
    <dialog ref={help} className="help-dialog"><div className="dialog-heading"><h2>Một phút là có ảnh xinh</h2><button aria-label="Đóng hướng dẫn" onClick={() => help.current?.close()}><X /></button></div><ol><li>Chọn bố cục, thời gian đếm ngược và khung ảnh.</li><li>Bật camera, dùng ảnh mẫu hoặc tải ảnh từ thiết bị.</li><li>Chụp từng ảnh hoặc chụp tự động cả bộ.</li><li>Thêm lời nhắn và tải ảnh PNG về máy.</li></ol><h3>Ảnh của bạn, chỉ của bạn</h3><p>Ảnh được xử lý ngay trong trình duyệt, không tải lên máy chủ. Camera tự tắt khi hoàn tất bộ ảnh hoặc đóng trang. Ảnh chưa tải sẽ mất khi bạn làm mới trang.</p><p>Khung xem camera trước được lật như gương; ảnh tải về giữ chiều gốc. Ảnh mẫu chỉ dùng để thử giao diện.</p><button className="button primary" onClick={() => help.current?.close()}>Mình hiểu rồi</button></dialog>
    <div className="sr-only" role="status" aria-live="polite">{count !== null ? 'Còn ' + count + ' giây' : phase === 'result' ? 'Ảnh đã sẵn sàng' : total + ' trên ' + layout.shots + ' ảnh'}</div>
    {message && <div className="toast" role="status">{message}<button aria-label="Đóng thông báo" onClick={() => setMessage('')}><X size={16} /></button></div>}
  </main>;
}



