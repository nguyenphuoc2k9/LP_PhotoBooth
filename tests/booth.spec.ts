import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test('Vietnamese booth, 30 frames, 12 filters, auto capture and PNG export', async ({ page }) => {
  // Built-in catalog assertions must not depend on the owner's published frames.
  await page.route('**/api/frames/', route => route.fulfill({json:{frames:[]}}));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(page.locator('.filter-option')).toHaveCount(12);
  await page.getByRole('button', { name: 'Chọn khung' }).click();
  await expect(page.locator('.frame-choice')).toHaveCount(30);
  await expect(page.locator('.frame-choice img')).toHaveCount(30);
  await page.screenshot({ path: 'screenshots/frames-vietnamese.png' });
  await page.getByRole('button', { name: 'Đêm đầy sao', exact: true }).click();
  await page.getByRole('button', { name: 'Ảnh mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Hồng mơ', exact: true }).click();
  await page.getByLabel('Đếm ngược').selectOption('1');
  await page.screenshot({ path: 'screenshots/booth-vietnamese-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Chụp tự động', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giữ lại khoảnh khắc này.' })).toBeVisible({ timeout: 18000 });
  await page.getByLabel('Lời nhắn').fill('Hôm nay thật xinh');
  await page.getByRole('combobox', { name: 'Bộ lọc màu', exact: true }).selectOption('peach');
  await expect(page.getByRole('button', { name: 'Tải ảnh PNG' })).toBeEnabled();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh PNG' }).click();
  const download = await downloadEvent;
  const png = await readFile((await download.path())!);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(720);
  expect(png.readUInt32BE(20)).toBe(2194);
  const color = await page.locator('.finished-print').evaluate(async (el: HTMLImageElement) => {
    await el.decode(); const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight;
    const ctx = c.getContext('2d')!; ctx.drawImage(el, 0, 0); return Array.from(ctx.getImageData(0, 0, 1, 1).data);
  });
  expect(color).toEqual([41, 43, 75, 255]);
  await page.screenshot({ path: 'screenshots/result-vietnamese.png', fullPage: true });
  await page.getByRole('button', { name: 'Chụp bộ ảnh mới' }).click();
  await expect(page.getByRole('button', { name: 'Chụp tự động', exact: true })).toBeEnabled();
});

test('camera sessions release tracks, can reopen, and manual capture works', async ({ page }) => {
  await page.addInitScript(() => {
    const streams: MediaStream[] = [];
    Object.assign(window, { testStreams: streams });
    navigator.mediaDevices.getUserMedia = async () => {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 960;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#ef779b'; ctx.fillRect(0, 0, 640, 960);
      ctx.fillStyle = '#60b8b2'; ctx.fillRect(640, 0, 640, 960);
      const stream = c.captureStream(12); streams.push(stream); return stream;
    };
  });
  await page.goto('/');
  await page.getByLabel('Bố cục ảnh').selectOption('portrait');
  await page.getByLabel('Đếm ngược').selectOption('1');
  await page.getByRole('button', { name: 'Bật camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chụp từng ảnh', exact: true })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Chụp từng ảnh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Giữ lại khoảnh khắc này.' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { testStreams: MediaStream[] }).testStreams.every(s => s.getTracks().every(t => t.readyState === 'ended')))).toBe(true);
  await page.getByRole('button', { name: 'Chụp bộ ảnh mới' }).click();
  await page.getByRole('button', { name: 'Bật camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chụp tự động', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Ảnh mẫu', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { testStreams: MediaStream[] }).testStreams.every(s => s.getTracks().every(t => t.readyState === 'ended')))).toBe(true);
});

test('uploads fill the strip without camera access', async ({ page }) => {
  await page.goto('/');
  const sample = path.resolve('public/sample.jpg');
  await page.locator('input[type=file]').setInputFiles([sample, sample, sample, sample]);
  await expect(page.locator('.photo-slot.has-photo')).toHaveCount(4);
  await page.getByRole('button', { name: 'Tạo ảnh', exact: true }).click();
  await expect(page.locator('.finished-print')).toBeVisible();
});

test('cancel prevents delayed captures', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ảnh mẫu', exact: true }).click();
  await page.getByRole('button', { name: 'Chụp tự động', exact: true }).click();
  await expect(page.getByLabel('Bố cục ảnh')).toBeDisabled();
  await page.getByRole('button', { name: 'Dừng chụp' }).click();
  await page.waitForTimeout(3200);
  await expect(page.locator('.photo-slot.has-photo')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chụp tự động', exact: true })).toBeEnabled();
});

for (const [name, message] of [['NotAllowedError', 'Camera đang bị chặn'], ['NotFoundError', 'Không tìm thấy camera'], ['NotReadableError', 'ứng dụng khác']]) {
  test('localized camera failure: ' + name, async ({ page }) => {
    await page.addInitScript(error => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Raw failure', error); }; }, name);
    await page.goto('/'); await page.getByRole('button', { name: 'Bật camera', exact: true }).click();
    await expect(page.locator('.camera-empty')).toContainText(message);
    await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  });
}

test('mobile and tablet layouts retain camera aspect and fit the screen', async ({ page }) => {
  for (const [width, height] of [[390, 844], [768, 1024], [844, 390]]) {
    await page.setViewportSize({ width, height }); await page.goto('/');
    await page.getByRole('button', { name: 'Ảnh mẫu', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const [id, ratio] of [['strip', 4 / 3], ['grid', 1], ['portrait', 3 / 4], ['polaroid', 1]] as const) {
      await page.getByLabel('Bố cục ảnh').selectOption(id);
      const box = await page.locator('.viewfinder').boundingBox();
      expect(Math.abs(box!.width / box!.height - ratio)).toBeLessThan(.01);
    }
    await page.getByLabel('Bố cục ảnh').selectOption('strip');
    await page.screenshot({ path: 'screenshots/booth-vietnamese-' + width + '.png', fullPage: true });
  }
});

