import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stillroom — Photobooth của bạn',
  description: 'Chụp photobooth online với 30 khung ảnh, 12 bộ lọc màu và tải ảnh PNG. Ảnh được xử lý ngay trên thiết bị của bạn.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><head><link rel="stylesheet" href="/fonts/satoshi.css" /></head><body>{children}</body></html>;
}
