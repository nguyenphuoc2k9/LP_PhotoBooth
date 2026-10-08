import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

test('each effect changes pixels, toggles reversibly, and combined PNG matches preview', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Bố cục ảnh').selectOption('polaroid');
  await page.locator('input[type=file]').setInputFiles(path.resolve('public/sample.jpg'));
  await page.getByRole('button', { name: 'Tạo ảnh', exact: true }).click();
  const print = page.locator('.finished-print');
  const download = page.getByRole('button', { name: 'Tải ảnh PNG', exact: true });
  const pixels = async () => {
    await expect(download).toBeEnabled();
    return print.evaluate(async (el: HTMLImageElement) => {
      await el.decode();
      const c = document.createElement('canvas'); c.width = el.naturalWidth; c.height = el.naturalHeight;
      const ctx = c.getContext('2d')!; ctx.drawImage(el, 0, 0);
      const digest = await crypto.subtle.digest('SHA-256', ctx.getImageData(0, 0, c.width, c.height).data);
      return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    });
  };
  await expect(print).toBeVisible(); const original = await pixels();
  const names = ['Dấu thời gian', 'Lọt sáng', 'Tối góc', 'Hạt phim', 'Lệch màu'];
  for (const name of names) {
    const chip = page.getByRole('button', { name, exact: true });
    const previous = await print.getAttribute('src');
    await chip.click(); await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(print).not.toHaveAttribute('src', previous!);
    expect(await pixels()).not.toBe(original);
    const changed = await print.getAttribute('src');
    await chip.click(); await expect(print).not.toHaveAttribute('src', changed!);
    expect(await pixels()).toBe(original);
  }
  for (const name of names) await page.getByRole('button', { name, exact: true }).click();
  await expect(download).toBeEnabled();
  const expected = await print.evaluate(async (el: HTMLImageElement) => {
    const digest = await crypto.subtle.digest('SHA-256', await (await fetch(el.src)).arrayBuffer());
    return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
  });
  const event = page.waitForEvent('download'); await download.click();
  expect(createHash('sha256').update(await readFile((await (await event).path())!)).digest('hex')).toBe(expected);
  await page.screenshot({ path: 'screenshots/blue-effects.png', fullPage: true });
});

test('collected frames render three photos and preserve photos when returning to a strip', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chọn khung' }).click();
  await page.getByRole('button', { name: 'Sưu tầm', exact: true }).click();
  await expect(page.locator('.frame-choice img')).toHaveCount(3);
  await page.screenshot({ path: 'screenshots/collected-frames.png' });
  await page.getByRole('button', { name: 'Kỷ niệm vàng', exact: true }).click();
  await expect(page.locator('.photo-slot')).toHaveCount(3);
  const sample = path.resolve('public/sample.jpg');
  await page.locator('input[type=file]').setInputFiles([sample, sample, sample]);
  await page.getByRole('button', { name: 'Tạo ảnh', exact: true }).click();
  await expect(page.locator('.finished-print')).toBeVisible();
  for (const name of ['Kỷ niệm vàng', 'Hoa hồng cổ điển', 'Ngày chung đôi']) {
    await page.locator('.current-frame').click();
    await page.locator('.frame-dialog').getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tải ảnh PNG', exact: true })).toBeEnabled();
    expect(await page.locator('.finished-print').evaluate(async (el: HTMLImageElement) => { await el.decode(); return [el.naturalWidth, el.naturalHeight]; })).toEqual([1800, 1200]);
    await page.screenshot({ path: 'screenshots/collected-' + ['Kỷ niệm vàng', 'Hoa hồng cổ điển', 'Ngày chung đôi'].indexOf(name) + '.png', fullPage: true });
  }
  await page.locator('.current-frame').click();
  await page.getByRole('button', { name: 'Sắc xanh', exact: true }).click();
  await expect(page.locator('.frame-choice')).toHaveCount(7);
  await page.getByRole('button', { name: 'Mây xanh', exact: true }).click();
  await expect(page.locator('.photo-slot.has-photo')).toHaveCount(3);
  await expect(page.locator('.photo-slot')).toHaveCount(4);
  await expect(page.locator('.create-print')).toBeDisabled();
});
