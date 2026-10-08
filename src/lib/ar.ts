export type ARAccessory='glasses'|'cat'|'crown'|'bow';
export type ARPoint={x:number;y:number};
export type ARFace={left:ARPoint;right:ARPoint;forehead:ARPoint};
export const AR_ACCESSORIES=[{id:'glasses',name:'Kính xanh',icon:'🕶️'},{id:'cat',name:'Tai mèo',icon:'🐱'},{id:'crown',name:'Vương miện',icon:'👑'},{id:'bow',name:'Nơ hồng',icon:'🎀'}] as const;
export function paintAR(ctx:CanvasRenderingContext2D,faces:ARFace[],items:ARAccessory[],width:number,height:number,crop={x:0,y:0,width:1,height:1},size=1){
  const point=(p:ARPoint)=>({x:(p.x-crop.x)/crop.width*width,y:(p.y-crop.y)/crop.height*height});
  for(const face of faces){
    let a=point(face.left),b=point(face.right);if(a.x>b.x)[a,b]=[b,a];
    const f=point(face.forehead),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,angle=Math.atan2(b.y-a.y,b.x-a.x),unit=Math.hypot(b.x-a.x,b.y-a.y);
    if(unit<3||!Number.isFinite(unit))continue;
    const top=((f.y-cy)*Math.cos(angle)-(f.x-cx)*Math.sin(angle))/unit;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.scale(unit,unit);ctx.lineJoin='round';ctx.lineCap='round';
    if(items.includes('glasses')){
      ctx.save();ctx.scale(size,size);ctx.lineWidth=.075;ctx.strokeStyle='#173459';ctx.fillStyle='rgba(31,87,146,.75)';
      for(const x of [-.96,.13]){ctx.beginPath();ctx.roundRect(x,-.25,.83,.55,.15);ctx.fill();ctx.stroke();ctx.beginPath();ctx.strokeStyle='#b9eeff';ctx.lineWidth=.035;ctx.moveTo(x+.16,-.1);ctx.lineTo(x+.3,-.16);ctx.stroke();ctx.strokeStyle='#173459';ctx.lineWidth=.075;}
      ctx.beginPath();ctx.moveTo(-.13,-.04);ctx.quadraticCurveTo(0,-.15,.13,-.04);ctx.moveTo(-.96,-.12);ctx.lineTo(-1.12,-.19);ctx.moveTo(.96,-.12);ctx.lineTo(1.12,-.19);ctx.stroke();ctx.restore();
    }
    ctx.translate(0,top+.12);ctx.scale(size,size);
    if(items.includes('cat')){
      for(const direction of [-1,1]){ctx.save();ctx.scale(direction,1);ctx.fillStyle='#9cbbec';ctx.strokeStyle='#294c7e';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(.28,0);ctx.quadraticCurveTo(.65,-.9,1,-.85);ctx.lineTo(1.08,.12);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f8bbd4';ctx.beginPath();ctx.moveTo(.49,-.02);ctx.lineTo(.89,-.59);ctx.lineTo(.94,.04);ctx.closePath();ctx.fill();ctx.restore();}
    }
    if(items.includes('crown')){
      ctx.fillStyle='#ffda67';ctx.strokeStyle='#b7791d';ctx.lineWidth=.055;ctx.beginPath();ctx.moveTo(-.86,.08);ctx.lineTo(-1,-.68);ctx.lineTo(-.48,-.37);ctx.lineTo(0,-.98);ctx.lineTo(.48,-.37);ctx.lineTo(1,-.68);ctx.lineTo(.86,.08);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#f383ad';for(const x of [-.5,0,.5]){ctx.beginPath();ctx.ellipse(x,-.12,.09,.12,0,0,Math.PI*2);ctx.fill();}
    }
    if(items.includes('bow')){
      ctx.translate(.65,-.18);ctx.rotate(.22);ctx.strokeStyle='#ac426d';ctx.lineWidth=.055;ctx.fillStyle='#f3a8cb';
      for(const direction of [-1,1]){ctx.save();ctx.scale(direction,1);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(.9,-.95,1.05,.8,0,.16);ctx.fill();ctx.stroke();ctx.restore();}
      ctx.fillStyle='#de6a9e';ctx.beginPath();ctx.ellipse(0,.04,.16,.21,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
}

export class ARTracker{
  private worker:Worker;
  private pending=new Map<number,{resolve:(value:ARFace[])=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private sequence=0;
  private disposed=false;
  constructor(){
    this.worker=new Worker('/ar/worker.js');
    this.worker.onmessage=({data})=>{const job=this.pending.get(data.id);if(!job)return;clearTimeout(job.timer);this.pending.delete(data.id);if(data.error)job.reject(new Error(data.error));else job.resolve(data.faces??[]);};
    this.worker.onerror=()=>this.fail(new Error('Không khởi động được AR trên trình duyệt này.'));
  }
  private fail(error:Error){for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(error);}this.pending.clear();}
  private request(type:string,bitmap?:ImageBitmap){
    if(this.disposed){bitmap?.close();return Promise.reject(new Error('AR đã tắt.'));}
    const id=++this.sequence;
    return new Promise<ARFace[]>((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('AR mất quá lâu để phản hồi.'));this.dispose();},type==='init'?30000:10000);
      this.pending.set(id,{resolve,reject,timer});
      try{this.worker.postMessage({id,type,bitmap},bitmap?[bitmap]:[]);}catch(e){bitmap?.close();clearTimeout(timer);this.pending.delete(id);reject(e);}
    });
  }
  async init(){await this.request('init');}
  async detect(source:HTMLCanvasElement){const bitmap=await createImageBitmap(source,{resizeWidth:Math.min(640,source.width),resizeHeight:Math.max(1,Math.round(source.height*Math.min(1,640/source.width)))});return this.request('detect',bitmap);}
  dispose(){if(this.disposed)return;this.disposed=true;this.worker.terminate();this.fail(new Error('AR đã tắt.'));}
}
