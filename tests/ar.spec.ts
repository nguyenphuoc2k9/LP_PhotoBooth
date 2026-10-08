import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('real local AR model tracks faces, previews all accessories and captures them in PNG',async({page})=>{
  test.setTimeout(120000);
  const arRequests:string[]=[];page.on('request',r=>{if(r.url().includes('/ar/'))arRequests.push(r.url());});
  await page.goto('/');await page.getByRole('button',{name:'Ảnh mẫu',exact:true}).click();
  await page.getByLabel('Bố cục ảnh').selectOption('polaroid');await page.getByLabel('Đếm ngược').selectOption('1');
  const pixels=()=>page.locator('.viewfinder canvas').evaluate(el=>(el as HTMLCanvasElement).toDataURL());
  const without=await pixels();expect(arRequests).toHaveLength(0);
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).check();
  await expect(page.locator('.ar-status')).toContainText(/Đang bám theo [12] khuôn mặt/,{timeout:60000});
  await expect.poll(pixels).not.toBe(without);
  expect(arRequests.some(u=>u.includes('face_landmarker.task'))).toBe(true);
  for(const name of ['Tai mèo','Vương miện','Nơ hồng']){
    const before=await pixels();await page.getByRole('button',{name:'AR '+name,exact:true}).click();
    await expect.poll(pixels).not.toBe(before);
  }
  await expect(page.getByRole('button',{name:'AR Kính xanh',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:'AR Tai mèo',exact:true})).toHaveAttribute('aria-pressed','false');
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.viewfinder').screenshot({path:'screenshots/ar-preview.png'});
  await page.getByRole('button',{name:'Chụp từng ảnh',exact:true}).click();
  await expect(page.locator('.finished-print')).toBeVisible({timeout:20000});
  const withAR=await page.locator('.finished-print').getAttribute('src');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Tải ảnh PNG',exact:true}).click();
  const png=await readFile((await (await download).path())!);expect(png.readUInt32BE(16)).toBe(1080);
  const withPixels=await page.locator('.finished-print').evaluate(async(el:HTMLImageElement)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(el.src)).arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join(''));
  expect(createHash('sha256').update(png).digest('hex')).toBe(withPixels);
  await page.locator('.print-composition').screenshot({path:'screenshots/ar-result.png'});
  await page.getByRole('button',{name:'Chụp bộ ảnh mới',exact:true}).click();
  await page.getByRole('button',{name:'AR',exact:true}).click();
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Đóng AR',exact:true}).click();
  await page.getByRole('button',{name:'Chụp từng ảnh',exact:true}).click();
  await expect(page.locator('.finished-print')).toBeVisible();
  expect(await page.locator('.finished-print').getAttribute('src')).not.toBe(withAR);
  const plain=await page.locator('.finished-print').evaluate(async(el:HTMLImageElement)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await fetch(el.src)).arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join(''));
  expect(plain).not.toEqual(withPixels);
});

test('AR loading failure is recoverable and off mode still captures',async({page})=>{
  await page.route('**/ar/face_landmarker.task',r=>r.abort());
  await page.goto('/');await page.getByRole('button',{name:'Ảnh mẫu',exact:true}).click();
  await page.getByLabel('Bố cục ảnh').selectOption('polaroid');await page.getByLabel('Đếm ngược').selectOption('1');
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).check();
  await expect(page.locator('.ar-status')).toContainText('Không tải được AR',{timeout:40000});
  await expect(page.getByRole('button',{name:'Chụp từng ảnh',exact:true})).toBeDisabled();
  await page.unroute('**/ar/face_landmarker.task');await page.getByRole('button',{name:'Thử lại AR',exact:true}).click();
  await expect(page.locator('.ar-status')).toContainText(/Đang bám theo [12] khuôn mặt/,{timeout:40000});
  await page.getByLabel('Bật phụ kiện AR',{exact:true}).uncheck();
  await expect(page.getByRole('button',{name:'Chụp từng ảnh',exact:true})).toBeEnabled();
});
