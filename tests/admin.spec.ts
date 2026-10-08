import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';

test('authenticated admin creates, edits, previews, publishes and removes a shared frame',async({page,browser,request})=>{
  test.setTimeout(180000);
  const origin='http://127.0.0.1:3001',password=randomBytes(24).toString('hex');
  // Browser fetch exercises its real Secure-cookie behavior on the loopback origin.
  const browserRequest=async(url:string,method:string,options?:{headers?:Record<string,string>;data?:unknown})=>{
    const result=await page.evaluate(async({url,method,options})=>{
      const r=await fetch(url,{method,headers:{'Content-Type':'application/json',...options?.headers},body:options?.data?JSON.stringify(options.data):undefined});
      return {status:r.status,body:r.headers.get('Content-Type')?.includes('application/json')?await r.json():null};
    },{url,method,options});
    return {status:()=>result.status,json:async()=>result.body};
  };
  const adminApi={get:(url:string)=>browserRequest(url,'GET'),post:(url:string,options:{headers?:Record<string,string>;data?:unknown})=>browserRequest(url,'POST',options)};
  expect((await request.post('/api/frames/',{headers:{Origin:origin},data:{}})).status()).toBe(401);
  expect((await request.get('/api/frames/?admin=1')).status()).toBe(401);
  expect((await request.post('/api/admin/session/',{headers:{Origin:origin},data:{action:'setup',email:'test@example.com',password,setupToken:'wrong-token'}})).status()).toBe(403);
  await page.goto('/admin/');
  await page.getByLabel('Email quản trị').fill('test@example.com');
  await page.getByLabel('Mật khẩu',{exact:true}).fill(password);
  await page.getByLabel('Mã thiết lập máy chủ').fill(process.env.STILLROOM_TEST_SETUP_TOKEN!);
  const setup=page.waitForResponse(r=>r.url().includes('/api/admin/session/')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Tạo tài khoản quản trị',exact:true}).click();
  const response=await setup;
  expect(response.status()).toBe(200);
  expect((await response.allHeaders())['set-cookie']).toContain('HttpOnly');
  expect((await response.allHeaders())['set-cookie']).toContain('Secure');
  await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();
  expect((await request.post('/api/frames/',{headers:{Origin:'https://invalid.example'},data:{}})).status()).toBe(403);
  expect((await adminApi.post('/api/frames/',{headers:{Origin:origin},data:{name:'invalid',slots:[[[0,0],[0,1],[1,0],[1,1]]],overlay:false,showCaption:false,published:true}})).status()).toBe(400);
  // The supplied opaque JPG must become a true foreground overlay, retaining
  // decorations that overlap the four photo windows.
  await page.getByLabel('Ảnh nền khung',{exact:true}).setInputFiles(path.resolve('tests/fixtures/decorated-four-window.jpg'));
  await page.getByLabel('Tên khung',{exact:true}).fill('Khung khoét thử nghiệm');
  await page.getByRole('button',{name:'Khoét ô ảnh từ vùng trắng',exact:true}).click();
  const cut=async(y:number)=>{
    const surface=page.getByRole('button',{name:'Bấm vùng trắng để khoét ô ảnh',exact:true});
    await surface.scrollIntoViewIfNeeded();const box=(await surface.boundingBox())!;
    await surface.click({position:{x:box.width*350/675,y:box.height*y/1200}});
    await expect(page.locator('.admin-message')).toContainText('Đã khoét ô');
    await expect(page.getByLabel('Tên khung',{exact:true})).toBeEnabled();
  };
  const alpha=()=>page.getByAltText('Ảnh nền khung đang tạo').evaluate(async(el:HTMLImageElement)=>{
    await el.decode();const c=document.createElement('canvas');c.width=el.naturalWidth;c.height=el.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(el,0,0);
    return [185,420,650,880].map(y=>ctx.getImageData(350,y,1,1).data[3]);
  });
  await cut(185);expect(await alpha()).toEqual([0,255,255,255]);
  await page.getByRole('button',{name:'Hoàn tác lần khoét',exact:true}).click();expect(await alpha()).toEqual([255,255,255,255]);
  for(const y of [185,420,650,880])await cut(y);
  expect(await alpha()).toEqual([0,0,0,0]);
  await expect(page.locator('.frame-layer-row').first()).toHaveAttribute('data-layer','background');
  await page.getByRole('button',{name:'Xem thử với ảnh mẫu',exact:true}).click();
  await expect(page.getByAltText('Xem thử khung với ảnh mẫu')).toBeVisible();
  await page.locator('.admin-preview').screenshot({path:'screenshots/foreground-frame-preview.png'});
  await page.getByRole('button',{name:'Lưu và công bố',exact:true}).click();await expect(page.locator('.admin-message')).toContainText('Đã công bố');
  const cutFrame=(await (await adminApi.get('/api/frames/?admin=1')).json()).frames[0];
  expect(cutFrame.slots).toHaveLength(4);expect(cutFrame.layers.at(-1).id).toBe('background');
  await page.reload();await page.getByRole('button',{name:'Chỉnh sửa Khung khoét thử nghiệm',exact:true}).click();expect(await alpha()).toEqual([0,0,0,0]);
  const cutVisitor=await browser.newContext(),cutBooth=await cutVisitor.newPage();await cutBooth.goto(origin+'/');
  await cutBooth.getByRole('button',{name:/^Chọn khung/}).click();await cutBooth.getByRole('button',{name:cutFrame.name,exact:true}).click();
  const cutSharp=(await import('sharp')).default;
  const redPhoto={name:'red.png',mimeType:'image/png',buffer:await cutSharp({create:{width:400,height:400,channels:3,background:'#ff0000'}}).png().toBuffer()};
  await cutBooth.locator('input[type=file]').setInputFiles([redPhoto,redPhoto,redPhoto,redPhoto]);await cutBooth.getByRole('button',{name:'Tạo ảnh',exact:true}).click();
  const cutDownload=cutBooth.waitForEvent('download');await cutBooth.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();
  const cutPng=await readFile((await (await cutDownload).path())!);
  for(const y of [185,420,650,880])expect([...await cutSharp(cutPng).extract({left:350,top:y,width:1,height:1}).removeAlpha().raw().toBuffer()]).toEqual([255,0,0]);
  // The curtain and bow protrude into photo rectangles but must stay in front.
  const savedOverlay=await (await request.get(cutFrame.src)).body();
  for(const [x,y] of [[300,330],[340,800]]){
    const actual=await cutSharp(cutPng).extract({left:x,top:y,width:1,height:1}).removeAlpha().raw().toBuffer();
    const original=await cutSharp(savedOverlay).extract({left:x,top:y,width:1,height:1}).removeAlpha().raw().toBuffer();expect([...actual]).toEqual([...original]);
  }
  await cutVisitor.close();
  await browserRequest('/api/frames/'+cutFrame.id+'/','DELETE');await page.reload();
  await page.getByLabel('Ảnh nền khung',{exact:true}).setInputFiles(path.resolve('public/frames/blue-cat-scrapbook.jpg'));
  await page.getByLabel('Tên khung',{exact:true}).fill('Khung thử nghiệm dùng chung');
  const corners=[[[143,220],[406,202],[423,442],[158,460]],[[367,568],[617,525],[660,752],[407,797]],[[176,854],[418,910],[369,1131],[123,1075]]];
  for(const quad of corners){
    await page.getByRole('button',{name:/Thêm ô ảnh/}).click();
    for(let c=0;c<4;c++)for(let axis=0;axis<2;axis++)await page.getByLabel('Góc '+(c+1)+' '+(axis?'Y':'X'),{exact:true}).fill(String(Math.round(quad[c][axis]/(axis?1308:736)*1000)/10));
  }
  // Drag one handle and restore using the accessible precise position inputs.
  const handle=page.locator('.frame-design circle').first();
  await handle.scrollIntoViewIfNeeded(); const box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+10,box.y+box.height/2+5);await page.mouse.up();
  await expect(page.getByLabel('Góc 1 X',{exact:true})).not.toHaveValue('23.9');
  await page.getByLabel('Góc 1 X',{exact:true}).fill('23.9');await page.getByLabel('Góc 1 Y',{exact:true}).fill('65.3');
  await page.locator('.sticker-panel summary').click();
  await page.getByRole('button',{name:'Thêm sticker Mèo',exact:true}).click();
  await expect(page.locator('.frame-layer-row')).toHaveCount(5);
  await page.getByRole('button',{name:'Đưa xuống lớp Mèo',exact:true}).click();
  await expect(page.locator('.frame-layer-row').first()).toHaveAttribute('data-layer','photo-2');
  await page.getByRole('button',{name:'Đưa lên lớp Mèo',exact:true}).click();
  await page.getByRole('button',{name:'Ẩn lớp Mèo',exact:true}).click();
  await expect(page.locator('.placed-sticker')).toHaveCount(0);
  await page.getByRole('button',{name:'Hiện lớp Mèo',exact:true}).click();
  await page.getByRole('button',{name:'Khóa lớp Mèo',exact:true}).click();
  await expect(page.getByRole('button',{name:'Di chuyển sticker Mèo',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Đưa xuống lớp Mèo',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Mở khóa lớp Mèo',exact:true}).click();
  await page.getByRole('slider',{name:'Độ hiện của lớp',exact:true}).fill('60');
  await page.getByRole('button',{name:'Khóa lớp Mèo',exact:true}).click();
  await page.getByRole('button',{name:'Xem thử với ảnh mẫu',exact:true}).click();
  await expect(page.getByAltText('Xem thử khung với ảnh mẫu')).toBeVisible();
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'screenshots/admin-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'screenshots/admin-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();
  await expect(page.locator('.admin-message')).toContainText('Đã lưu bản nháp');
  const records=await (await adminApi.get('/api/frames/?admin=1')).json();
  const frame=records.frames[0];expect(frame.slots).toHaveLength(3);expect(frame.published).toBe(false);expect(frame.stickers).toHaveLength(1);expect(frame.layers.at(-1)).toMatchObject({locked:true,visible:true,opacity:.6});
  expect((await adminApi.post('/api/frames/',{data:{...frame,layers:[{id:'bad',visible:true,locked:false,opacity:1}]}})).status()).toBe(400);
  expect((await (await request.get('/api/frames/')).json()).frames).toHaveLength(0);
  expect((await request.get(frame.src)).status()).toBe(404);
  await page.reload();
  await page.getByRole('button',{name:'Chỉnh sửa Khung thử nghiệm dùng chung',exact:true}).click();
  await expect(page.getByLabel('Tên khung',{exact:true})).toHaveValue('Khung thử nghiệm dùng chung');
  await expect(page.getByRole('button',{name:'Mở khóa lớp Mèo',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Lưu và công bố',exact:true}).click();
  await expect(page.locator('.admin-message')).toContainText('Đã công bố');
  expect((await (await request.get('/api/frames/')).json()).frames).toHaveLength(1);
  expect((await request.get(frame.src)).status()).toBe(200);
  const visitor=await browser.newContext();const booth=await visitor.newPage();await booth.goto(origin+'/');
  await booth.getByRole('button',{name:/^Chọn khung/}).click();
  await booth.getByRole('button',{name:'Khung admin',exact:true}).click();
  await booth.getByRole('button',{name:frame.name,exact:true}).click();
  await expect(booth.locator('.photo-slot')).toHaveCount(3);
  const red={name:'red.svg.png',mimeType:'image/png',buffer:await (await import('sharp')).default({create:{width:400,height:400,channels:3,background:'#ff0000'}}).png().toBuffer()};
  await booth.locator('input[type=file]').setInputFiles([red,red,red]);
  await booth.getByRole('button',{name:'Tạo ảnh',exact:true}).click();
  await expect(booth.locator('.finished-print')).toBeVisible();
  const download=booth.waitForEvent('download');await booth.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();
  const png=await readFile((await (await download).path())!);expect(png.readUInt32BE(16)).toBe(736);expect(png.readUInt32BE(20)).toBe(1308);
  const sharp=(await import('sharp')).default;
  const pixel=await sharp(png).extract({left:280,top:330,width:1,height:1}).removeAlpha().raw().toBuffer();expect([...pixel]).toEqual([255,0,0]);
  // Render the same photos after moving the background above them, then hide
  // the background again. This verifies saved layer order/visibility in PNG.
  const published=(await (await adminApi.get('/api/frames/?admin=1')).json()).frames[0];
  const foreground=[...published.layers.filter((l:{id:string})=>l.id!=='background'),published.layers.find((l:{id:string})=>l.id==='background')];
  for(const visible of [true,false]){
    const edited={...published,layers:foreground.map((l:{id:string})=>l.id==='background'?{...l,visible}:l)};
    expect((await adminApi.post('/api/frames/',{data:edited})).status()).toBe(200);
    await booth.reload();await booth.getByRole('button',{name:/^Chọn khung/}).click();await booth.getByRole('button',{name:frame.name,exact:true}).click();
    await booth.locator('input[type=file]').setInputFiles([red,red,red]);await booth.getByRole('button',{name:'Tạo ảnh',exact:true}).click();
    const nextDownload=booth.waitForEvent('download');await booth.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();
    const next=await readFile((await (await nextDownload).path())!);const color=await sharp(next).extract({left:280,top:330,width:1,height:1}).removeAlpha().raw().toBuffer();
    if(visible)expect(color[1]).toBeGreaterThan(220);else expect([...color]).toEqual([255,0,0]);
  }
  await visitor.close();
  await page.getByRole('button',{name:'Lưu bản nháp',exact:true}).click();await expect(page.locator('.admin-message')).toContainText('Đã lưu bản nháp');
  expect((await (await request.get('/api/frames/')).json()).frames).toHaveLength(0);
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page.getByRole('heading',{name:'Đăng nhập admin',exact:true})).toBeVisible();
  expect((await adminApi.get('/api/frames/?admin=1')).status()).toBe(401);
  await page.getByLabel('Email quản trị').fill('test@example.com');await page.getByLabel('Mật khẩu',{exact:true}).fill(password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page.getByRole('button',{name:'Chỉnh sửa '+frame.name,exact:true})).toBeVisible();
  page.on('dialog',d=>void d.accept());await page.getByRole('button',{name:'Xóa '+frame.name,exact:true}).click();
  await expect(page.locator('.admin-message')).toContainText('Đã xóa khung');
  expect((await adminApi.get(frame.src)).status()).toBe(404);
  for(let i=0;i<5;i++)expect((await request.post('/api/admin/session/',{headers:{Origin:origin},data:{action:'login',email:'test@example.com',password:'wrong-password-long'}})).status()).toBe(401);
  expect((await request.post('/api/admin/session/',{headers:{Origin:origin},data:{action:'login',email:'test@example.com',password}})).status()).toBe(429);
});




