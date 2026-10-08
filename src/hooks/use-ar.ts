'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {ARTracker,paintAR,type ARFace,type ARAccessory} from '@/lib/ar';
export function useAR({enabled,active,video,sample,demo}:{enabled:boolean;active:boolean;video:RefObject<HTMLVideoElement|null>;sample:HTMLCanvasElement|null;demo:boolean}){
  const [status,setStatus]=useState<'off'|'loading'|'ready'|'error'>('off');
  const [faceCount,setFaceCount]=useState(0),[attempt,setAttempt]=useState(0);
  const engine=useRef<ARTracker|null>(null),latest=useRef<{faces:ARFace[];at:number}>({faces:[],at:0});
  useEffect(()=>{
    latest.current={faces:[],at:0};setFaceCount(0);
    if(!enabled){setStatus('off');return;}
    let disposed=false;setStatus('loading');let tracker:ARTracker;
    try{tracker=new ARTracker();engine.current=tracker;tracker.init().then(()=>{if(!disposed)setStatus('ready');}).catch(()=>{if(!disposed)setStatus('error');});}
    catch{setStatus('error');return;}
    return()=>{disposed=true;tracker.dispose();if(engine.current===tracker)engine.current=null;latest.current={faces:[],at:0};};
  },[enabled,attempt]);
  useEffect(()=>{
    latest.current={faces:[],at:0};setFaceCount(0);
    if(!enabled||!active||status!=='ready')return;
    let disposed=false,timer:ReturnType<typeof setTimeout>;
    const scratch=document.createElement('canvas');
    const detect=async()=>{
      if(disposed)return;
      if(!document.hidden){
        const source=demo?sample:video.current;
        const w=source instanceof HTMLVideoElement?source.videoWidth:source?.width,h=source instanceof HTMLVideoElement?source.videoHeight:source?.height;
        if(source&&w&&h){
          scratch.width=Math.min(640,w);scratch.height=Math.round(h*scratch.width/w);scratch.getContext('2d')!.drawImage(source,0,0,scratch.width,scratch.height);
          try{const faces=await engine.current!.detect(scratch);if(!disposed){latest.current={faces,at:performance.now()};setFaceCount(faces.length);}}
          catch{if(!disposed){latest.current={faces:[],at:0};setStatus('error');}return;}
        }
      }
      if(!disposed)timer=setTimeout(detect,100);
    };
    void detect();return()=>{disposed=true;clearTimeout(timer);latest.current={faces:[],at:0};};
  },[enabled,active,status,video,sample,demo]);
  async function decorate(source:HTMLCanvasElement,items:ARAccessory[],size:number){
    if(!enabled)return source;
    const tracker=engine.current;if(status!=='ready'||!tracker)throw new Error('AR chưa sẵn sàng.');
    const out=document.createElement('canvas');out.width=source.width;out.height=source.height;const ctx=out.getContext('2d')!;ctx.drawImage(source,0,0);
    const faces=await tracker.detect(out);paintAR(ctx,faces,items,out.width,out.height,undefined,size);return out;
  }
  return {status,faceCount,latest,decorate,retry:()=>setAttempt(n=>n+1)};
}
