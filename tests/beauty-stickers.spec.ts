import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

test('beauty is reversible; all 100 stickers load; drag, transforms, delete and PNG agree', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.getByLabel('Bố cục ảnh').selectOption('polaroid');
  await page.locator('input[type=file]').setInputFiles(path.resolve('public/sample.jpg'));
  await page.getByRole('button', { name:'Tạo ảnh', exact:true }).click();
  const print=page.locator('.finished-print'), download=page.getByRole('button',{name:'Tải ảnh PNG',exact:true});
  await expect(download).toBeEnabled();
  const hash=()=>print.evaluate(async(el:HTMLImageElement)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(el.src)).arrayBuffer()))).join(','));
  const original=await hash(), old=await print.getAttribute('src');
  await page.getByLabel('Làm mịn giữ nét').focus(); await page.keyboard.press('End');
  await page.getByLabel('Sáng dịu').focus(); await page.keyboard.press('End');
  await expect(print).not.toHaveAttribute('src',old!);await expect(download).toBeEnabled();
  expect(await hash()).not.toBe(original);
  await page.getByRole('button',{name:'Tắt làm đẹp',exact:true}).click();await expect(download).toBeEnabled();
  await expect.poll(hash).toBe(original);
  await page.getByLabel('Làm mịn giữ nét').focus();await page.keyboard.press('End');
  await expect(download).toBeEnabled();
  await page.locator('.sticker-panel summary').click();
  await expect(page.locator('.sticker-grid button')).toHaveCount(100);
  expect(await page.locator('.sticker-grid img').evaluateAll(async images=>(await Promise.all(images.map(async el=>{try{await(el as HTMLImageElement).decode();return true;}catch{return false;}}))).every(Boolean))).toBe(true);
  await page.getByLabel('Tìm sticker').fill('meo');
  await expect(page.locator('.sticker-grid button')).toHaveCount(2);
  await page.getByRole('button',{name:'Thêm sticker Mèo',exact:true}).click();
  const sticker=page.getByRole('button',{name:'Di chuyển sticker Mèo',exact:true});
  await expect(sticker).toBeVisible();await sticker.scrollIntoViewIfNeeded();
  const box=(await sticker.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+25,{steps:5});await page.mouse.up();
  expect(await page.locator('.placed-sticker').evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBeGreaterThan(50);
  const wrapper=page.locator('.placed-sticker');
  const beforeSize=await wrapper.evaluate(el=>parseFloat((el as HTMLElement).style.width));
  for(const label of ['Xoay sticker','Kích thước sticker']){
    const handle=page.getByRole('button',{name:label,exact:true});await handle.scrollIntoViewIfNeeded();
    const h=(await handle.boundingBox())!,w=(await wrapper.boundingBox())!;
    const cx=w.x+w.width/2,cy=w.y+w.height/2,hx=h.x+h.width/2,hy=h.y+h.height/2;
    await page.mouse.move(hx,hy);await page.mouse.down();
    if(label==='Xoay sticker')await page.mouse.move(cx-(hy-cy),cy+(hx-cx),{steps:8});
    else await page.mouse.move(cx+(hx-cx)*1.35,cy+(hy-cy)*1.35,{steps:8});
    await page.mouse.up();
  }
  expect(await wrapper.evaluate(el=>parseFloat((el as HTMLElement).style.width))).toBeGreaterThan(beforeSize);
  expect(await wrapper.evaluate(el=>(el as HTMLElement).style.transform)).not.toContain('rotate(0deg)');
  await expect(page.getByLabel('Vị trí ngang')).toHaveCount(0);
  await page.getByLabel('Tìm sticker').fill('trai tim xanh');
  await page.getByRole('button',{name:'Thêm sticker Trái tim xanh',exact:true}).click();
  await expect(page.locator('.placed-sticker')).toHaveCount(2);
  await page.getByRole('button',{name:'Xóa sticker đang chọn'}).click();
  await expect(page.locator('.placed-sticker')).toHaveCount(1);
  await expect(download).toBeEnabled();
  const expected=await page.locator('.print-composition').evaluate(async wrapper=>{
    const base=wrapper.querySelector('.finished-print') as HTMLImageElement;await base.decode();
    const c=document.createElement('canvas');c.width=base.naturalWidth;c.height=base.naturalHeight;
    const ctx=c.getContext('2d')!;ctx.drawImage(base,0,0);
    for(const el of wrapper.querySelectorAll<HTMLButtonElement>('.placed-sticker')){
      const img=el.querySelector('img')!;await img.decode();
      const size=parseFloat(el.style.width)/100*c.width,angle=Number(el.style.transform.match(/rotate\(([-\d.]+)deg\)/)![1]);
      ctx.save();ctx.translate(parseFloat(el.style.left)/100*c.width,parseFloat(el.style.top)/100*c.height);ctx.rotate(angle*Math.PI/180);ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();
    }
    const blob=await new Promise<Blob>(r=>c.toBlob(b=>r(b!)));
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
  });
  const event=page.waitForEvent('download');await download.click();const saved=await event;
  expect(createHash('sha256').update(await readFile((await saved.path())!)).digest('hex')).toBe(expected);
  await saved.saveAs('screenshots/beauty-sticker-print.png');
  await page.getByLabel('Tìm sticker').fill('');
  await page.locator('.sticker-grid img').evaluateAll(images=>Promise.all(images.map(el=>(el as HTMLImageElement).decode())));
  await sticker.click();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'screenshots/beauty-stickers-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for (const selector of ['.print-composition','.print-editor']) { const bounds=(await page.locator(selector).boundingBox())!; expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x+bounds.width).toBeLessThanOrEqual(390); }
  await page.getByRole('button',{name:'Sticker',exact:true}).click();
  await page.locator('.sticker-panel summary').click();
  const grid=(await page.locator('.sticker-grid').boundingBox())!;expect(grid.x).toBeGreaterThanOrEqual(0);expect(grid.x+grid.width).toBeLessThanOrEqual(390);
  await page.getByRole('button',{name:'Đóng Sticker',exact:true}).click();
  await sticker.scrollIntoViewIfNeeded();
  const touch=await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const mobileBox=(await sticker.boundingBox())!;
  const beforeTouch=await wrapper.getAttribute('style');
  const tx=mobileBox.x+mobileBox.width/2,ty=mobileBox.y+mobileBox.height/2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-25,y:ty-15}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(wrapper).not.toHaveAttribute('style',beforeTouch!);
  await touch.detach();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'screenshots/beauty-stickers-mobile.png',fullPage:true});
});

