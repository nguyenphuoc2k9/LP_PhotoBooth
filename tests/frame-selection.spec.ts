import { test, expect } from '@playwright/test';

test('gallery stays usable when sample and one imported frame fail, and allows retry', async ({ page }) => {
  await page.route('**/sample.jpg', r=>r.abort());
  await page.route('**/frames/blue-cat-scrapbook.jpg', r=>r.abort());
  await page.goto('/');
  await page.getByRole('button',{name:/^Chọn khung/}).click();
  await expect(page.locator('.frame-choice')).toHaveCount(30);
  await expect(page.locator('.frame-choice:disabled')).toHaveCount(0);
  await page.getByRole('button',{name:'Mèo và sao xanh',exact:true}).click();
  await expect(page.locator('.gallery-status')).toContainText('chưa tải được');
  await page.getByRole('button',{name:'Đêm đầy sao',exact:true}).click();
  await expect(page.locator('.frame-dialog')).not.toBeVisible();
  await expect(page.locator('.current-frame')).toContainText('Đêm đầy sao');
  await page.getByRole('button',{name:/^Chọn khung/}).click();
  await page.unroute('**/frames/blue-cat-scrapbook.jpg');
  await page.getByRole('button',{name:'Mèo và sao xanh',exact:true}).click();
  await expect(page.locator('.frame-dialog')).not.toBeVisible();
  await expect(page.locator('.current-frame')).toContainText('Mèo và sao xanh');
  await expect(page.locator('.photo-slot')).toHaveCount(3);
});
