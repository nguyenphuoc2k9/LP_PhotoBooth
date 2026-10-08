import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('user scrapbook fills three tilted windows, preserves artwork and exports at native size', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chọn khung' }).click();
  await page.getByRole('button', { name: 'Mèo và sao xanh', exact: true }).click();
  await expect(page.getByLabel('Bố cục ảnh')).toHaveValue('scrapbook');
  await expect(page.locator('.photo-slot')).toHaveCount(3);
  const sources = await page.evaluate(() => ['#ff0000', '#00ff00', '#0000ff'].map(color => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 400;
    const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 400, 400);
    return c.toDataURL().split(',')[1];
  }));
  await page.locator('input[type=file]').setInputFiles(sources.map((data, i) => ({ name: `photo-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })));
  await page.getByRole('button', { name: 'Tạo ảnh', exact: true }).click();
  const print = page.locator('.finished-print');
  await expect(print).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tải ảnh PNG', exact: true })).toBeEnabled();
  const pixels = await print.evaluate(async (img: HTMLImageElement) => {
    await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
    const centers = [[280, 330], [510, 650], [270, 990]].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    const outside = [[45, 75], [588, 217], [105, 590], [681, 930], [650, 1230]];
    const artwork = outside.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    const source = new Image(); source.src = '/frames/blue-cat-scrapbook.jpg'; await source.decode(); ctx.drawImage(source, 0, 0);
    return { centers, artwork, original: outside.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data)) };
  });
  expect(pixels.centers).toEqual([[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]]);
  expect(pixels.artwork).toEqual(pixels.original);
  await page.getByRole('button', { name: 'Chụp bộ ảnh mới' }).click();
  const sample = path.resolve('public/sample.jpg');
  await page.locator('input[type=file]').setInputFiles([sample, sample, sample]);
  await page.getByRole('button', { name: 'Tạo ảnh', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tải ảnh PNG', exact: true })).toBeEnabled();
  const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Tải ảnh PNG', exact: true }).click();
  const download = await event; const png = await readFile((await download.path())!);
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([736, 1308]);
  await download.saveAs('screenshots/meo-va-sao-xanh-preview.png');
  await page.screenshot({ path: 'screenshots/scrapbook-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'screenshots/scrapbook-mobile.png', fullPage: true });
});
