import {AR_ACCESSORIES,type ARAccessory} from '@/lib/ar';
export function ARPicker({enabled,onEnabled,items,onItems,size,onSize,status,faces,active,disabled,onRetry}:{enabled:boolean;onEnabled:(value:boolean)=>void;items:ARAccessory[];onItems:(items:ARAccessory[])=>void;size:number;onSize:(value:number)=>void;status:string;faces:number;active:boolean;disabled:boolean;onRetry:()=>void}){
  return <fieldset className="ar-panel" disabled={disabled}><legend>Phụ kiện AR <span>Bám theo khuôn mặt</span></legend>
    <label className="ar-toggle"><input type="checkbox" checked={enabled} onChange={e=>onEnabled(e.target.checked)}/>Bật phụ kiện AR</label>
    {enabled&&<><div className="ar-choices">{AR_ACCESSORIES.map(a=><button type="button" key={a.id} aria-label={'AR '+a.name} aria-pressed={items.includes(a.id)} onClick={()=>onItems(items.includes(a.id)?items.filter(id=>id!==a.id):a.id==='glasses'?[...items,a.id]:[...items.filter(id=>id==='glasses'),a.id])}><span aria-hidden="true">{a.icon}</span>{a.name}</button>)}</div>
      <label className="ar-size">Kích thước phụ kiện<input aria-label="Kích thước phụ kiện AR" type="range" min="75" max="130" value={Math.round(size*100)} onChange={e=>onSize(Number(e.target.value)/100)}/></label>
      <p className="ar-status" role="status">{status==='loading'?'Đang tải AR lần đầu…':status==='error'?'Không tải được AR. Thử lại hoặc tắt AR để tiếp tục chụp.':!active?'Bật camera hoặc chọn Ảnh mẫu để thử AR.':faces?'Đang bám theo '+faces+' khuôn mặt':'Chưa thấy khuôn mặt. Nhìn về camera và tăng ánh sáng.'}</p>
      {status==='error'&&<button type="button" className="button secondary" onClick={onRetry}>Thử lại AR</button>}
      <p>Kính có thể kết hợp với một phụ kiện tóc. Hỗ trợ tối đa 2 khuôn mặt. AR được giữ trong ảnh chụp và ảnh tải lên khi bật; tắt AR chỉ áp dụng cho ảnh tiếp theo.</p>
    </>}
    <p>Xử lý trên thiết bị. Mô hình chỉ tải khi bật AR; không gửi ảnh khuôn mặt lên máy chủ.</p>
  </fieldset>;
}
