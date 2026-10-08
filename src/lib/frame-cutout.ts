import type { PhotoQuad } from './collected-frames';

// Remove only the connected, near-white region selected by the administrator.
// Work on a copy so rejected selections never damage the source image.
export function cutPhotoWindow(source:ImageData,x:number,y:number,tolerance:number){
  const {width:w,height:h,data}=source;
  const sx=Math.max(0,Math.min(w-1,Math.floor(x))),sy=Math.max(0,Math.min(h-1,Math.floor(y))),seed=(sy*w+sx)*4;
  const limit=Math.max(2,Math.min(60,tolerance));
  if(data[seed+3]<200||Math.min(data[seed],data[seed+1],data[seed+2])<200)throw new Error('Hãy bấm vào giữa vùng trắng cần đặt ảnh, tránh phần trang trí.');
  const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let head=0,tail=0,minX=w,maxX=0,minY=h,maxY=0;
  const add=(p:number)=>{
    if(visited[p])return;visited[p]=1;const i=p*4;
    if(data[i+3]<200||Math.min(data[i],data[i+1],data[i+2])<255-limit)return;
    queue[tail++]=p;
  };
  add(sy*w+sx);
  while(head<tail){
    const p=queue[head++],px=p%w,py=Math.floor(p/w);
    minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    if(px>0)add(p-1);if(px<w-1)add(p+1);if(py>0)add(p-w);if(py<h-1)add(p+w);
  }
  if(tail<100||(maxX-minX)*(maxY-minY)<w*h*.002)throw new Error('Vùng chọn quá nhỏ. Hãy bấm giữa ô ảnh hoặc tăng độ nhạy.');
  if(minX===0||minY===0||maxX===w-1||maxY===h-1||tail>w*h*.5||(maxX-minX)*(maxY-minY)>w*h*.5)throw new Error('Vùng trắng nối ra ngoài khung. Hãy giảm độ nhạy rồi chọn lại bên trong ô ảnh.');
  const output=new ImageData(new Uint8ClampedArray(data),w,h);
  for(let i=0;i<tail;i++)output.data[queue[i]*4+3]=0;
  // Extend the photo slightly behind the retained edge, keeping decorations above it.
  const left=Math.max(0,minX-2)/w,top=Math.max(0,minY-2)/h,right=Math.min(w,maxX+3)/w,bottom=Math.min(h,maxY+3)/h;
  const slot:PhotoQuad=[[left,top],[right,top],[right,bottom],[left,bottom]];
  return {image:output,slot};
}

