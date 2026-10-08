import {test,expect} from '@playwright/test';
test('live AR follows a moving face and clears accessories when faces leave',async({page})=>{
  test.setTimeout(90000);
  await page.addInitScript(()=>{
    const scene={offset:0,blank:false};Object.assign(window,{arTestScene:scene});
    navigator.mediaDevices.getUserMedia=async()=>{
      const img=new Image();img.src='/sample.jpg';await img.decode();
      const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d')!;
      const draw=()=>{ctx.fillStyle='#ddd';ctx.fillRect(0,0,640,480);if(!scene.blank)ctx.drawImage(img,scene.offset,0,640,480);};draw();const timer=setInterval(draw,66);
      const stream=c.captureStream(15);stream.getTracks()[0].addEventListener('ended',()=>clearInterval(timer));return stream;
    };
  });
  await page.goto('/');await page.getByRole('button',{name:'Bật camera',exact:true}).click();
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).check();
  await expect(page.locator('.ar-status')).toContainText(/Đang bám theo [12] khuôn mặt/,{timeout:40000});
  const center=()=>page.locator('.viewfinder canvas').evaluate((el:HTMLCanvasElement)=>{const d=el.getContext('2d')!.getImageData(0,0,el.width,el.height).data;let sum=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i]===23&&d[i+1]===52&&d[i+2]===89){sum+=(i/4)%el.width;n++;}return n?sum/n:0;});
  await expect.poll(center).toBeGreaterThan(0);const original=await center();
  await page.evaluate(()=>{(window as unknown as {arTestScene:{offset:number}}).arTestScene.offset=55;});
  await expect.poll(center,{timeout:15000}).toBeGreaterThan(original+25);
  await page.evaluate(()=>{(window as unknown as {arTestScene:{blank:boolean}}).arTestScene.blank=true;});
  await expect(page.locator('.ar-status')).toContainText('Chưa thấy khuôn mặt');
  await expect.poll(center).toBe(0);
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).uncheck();
  await expect(page.locator('.ar-status')).toHaveCount(0);
});
