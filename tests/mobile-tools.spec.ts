import { test, expect } from '@playwright/test';
import path from 'node:path';

test('phone camera and AR stay active across sheets; countdown locks tools and can stop',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    Object.assign(window,{cameraStarts:0});
    navigator.mediaDevices.getUserMedia=async()=>{
      (window as unknown as {cameraStarts:number}).cameraStarts++;
      const img=new Image();img.src='/sample.jpg';await img.decode();
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
      canvas.getContext('2d')!.drawImage(img,0,0,640,480);return canvas.captureStream(10);
    };
  });
  let models=0;page.on('request',r=>{if(r.url().includes('face_landmarker.task'))models++;});
  await page.goto('/');await page.getByRole('button',{name:'Bật camera',exact:true}).click();
  await page.getByRole('button',{name:'Đổi camera',exact:true}).click();
  await expect(page.locator('.mirror-note')).toHaveText('Camera sau');
  await page.getByRole('button',{name:'AR',exact:true}).click();await page.getByLabel('Bật phụ kiện AR',{exact:true}).check();
  await expect(page.locator('.ar-status')).toContainText(/Đang bám theo [12] khuôn mặt/,{timeout:45000});
  await page.getByRole('button',{name:'Đóng AR',exact:true}).click();
  await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();await page.getByRole('button',{name:'Đóng Bộ lọc',exact:true}).click();
  await page.getByRole('button',{name:'AR',exact:true}).click();await expect(page.getByLabel('Bật phụ kiện AR',{exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Đóng AR',exact:true}).click();
  expect(models).toBe(1);expect(await page.evaluate(()=>(window as unknown as {cameraStarts:number}).cameraStarts)).toBe(2);
  await page.getByRole('button',{name:'Chụp tự động',exact:true}).click();await expect(page.getByRole('button',{name:'Bộ lọc',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Dừng chụp',exact:true}).click();await expect(page.locator('.photo-slot.has-photo')).toHaveCount(0);
  await page.getByLabel('Đếm ngược').selectOption('1');await page.getByRole('button',{name:'Chụp tự động',exact:true}).click();
  await expect(page.locator('.finished-print')).toBeVisible({timeout:25000});
});

test('phone tools retain choices, focus, aspect and usable targets at all sizes', async ({ page }) => {
  test.setTimeout(120000);
  for (const [width,height] of [[320,700],[360,800],[390,844],[430,932],[844,390]]) {
    await page.setViewportSize({width,height}); await page.goto('/');
    await page.getByRole('button',{name:'Ảnh mẫu',exact:true}).click();
    await expect(page.getByRole('button',{name:'Bộ lọc',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const camera=(await page.locator('.viewfinder').boundingBox())!;
    expect(Math.abs(camera.width/camera.height-4/3)).toBeLessThan(.01);
    const strip=(await page.locator('.strip-panel').boundingBox())!,tools=(await page.locator('.capture-toolset').boundingBox())!;
    expect(strip.y).toBeLessThan(tools.y);
    for(const title of ['Bộ lọc','AR','Làm đẹp','Hiệu ứng']) {
      const button=page.getByRole('button',{name:title,exact:true});await button.click();
      await expect(page.locator('dialog[open]')).toHaveCount(1);
      const close=page.getByRole('button',{name:'Đóng '+title,exact:true});
      const box=(await close.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height);
      if(title==='Bộ lọc')await page.getByRole('button',{name:'Hồng mơ',exact:true}).click();
      await close.click();await expect(button).toBeFocused();
    }
    await page.getByRole('button',{name:'Bộ lọc',exact:true}).click();
    await expect(page.getByRole('button',{name:'Hồng mơ',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Khung',exact:true}).click();
    expect(await page.locator('.frame-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    await page.getByRole('button',{name:'Đóng thư viện khung',exact:true}).click();
    await page.screenshot({path:`screenshots/mobile-redesign-${width}.png`,fullPage:true});
  }
});

test('phone upload, result tools, sticker gestures and PNG export',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByLabel('Bố cục ảnh').selectOption('polaroid');
  await page.locator('input[type=file]').setInputFiles(path.resolve('public/sample.jpg'));
  await page.getByRole('button',{name:'Tạo ảnh',exact:true}).click();
  await expect(page.locator('.finished-print')).toBeVisible();
  await page.getByRole('button',{name:'Khung, lời nhắn và màu ảnh',exact:true}).click();
  await page.getByLabel('Lời nhắn',{exact:true}).fill('Kỷ niệm trên điện thoại');
  expect(await page.getByLabel('Lời nhắn',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
  await page.getByRole('button',{name:'Đóng Khung, lời nhắn và màu ảnh',exact:true}).click();
  await page.getByRole('button',{name:'Khung, lời nhắn và màu ảnh',exact:true}).click();
  await page.locator('.mobile-tool-sheet[open] .current-frame').click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.getByRole('button',{name:'Đóng thư viện khung',exact:true}).click();
  await expect(page.getByRole('button',{name:'Khung, lời nhắn và màu ảnh',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Sticker',exact:true}).click();
  await page.locator('.sticker-panel summary').click();await page.getByLabel('Tìm sticker').fill('meo');
  await page.getByRole('button',{name:'Thêm sticker Mèo',exact:true}).click();
  await page.getByRole('button',{name:'Đóng Sticker',exact:true}).click();
  const sticker=page.getByRole('button',{name:'Di chuyển sticker Mèo',exact:true});
  await sticker.scrollIntoViewIfNeeded();const box=(await sticker.boundingBox())!;
  const touch=await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width/2+20,y:box.y+box.height/2+15}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect(await page.locator('.placed-sticker').evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(50);
  for(const name of ['Xoay sticker','Kích thước sticker']) {const handle=page.getByRole('button',{name,exact:true});expect((await handle.boundingBox())!.width).toBeGreaterThanOrEqual(44);await handle.focus();await page.keyboard.press('ArrowRight');}
  expect(await page.locator('.placed-sticker').getAttribute('style')).toContain('rotate(5deg)');
  await page.getByRole('button',{name:'Tải ảnh PNG',exact:true}).scrollIntoViewIfNeeded();
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();expect((await event).suggestedFilename()).toMatch(/\.png$/);
  await page.screenshot({path:'screenshots/mobile-result-redesign.png',fullPage:true});
});
