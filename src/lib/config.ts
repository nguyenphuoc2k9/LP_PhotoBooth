import type { SharedFrame } from './shared-frames';
import type { BeautyOptions } from './beauty';
export const FILTERS = [
  { id: 'original', name: 'Tự nhiên' }, { id: 'mono', name: 'Đen trắng' },
  { id: 'warm', name: 'Nắng ấm' }, { id: 'cool', name: 'Trong veo' },
  { id: 'vintage', name: 'Phim cũ' }, { id: 'contrast', name: 'Sắc nét' },
  { id: 'soft', name: 'Mềm mại' }, { id: 'sepia', name: 'Nâu hoài niệm' },
  { id: 'rose', name: 'Hồng mơ' }, { id: 'peach', name: 'Cam đào' },
  { id: 'mint', name: 'Bạc hà' }, { id: 'lavender', name: 'Tím sương' },
] as const;
export type FilterId = typeof FILTERS[number]['id'];
export const LAYOUTS = [
  { id: 'scrapbook', name: '3 ảnh · Polaroid xanh', short: 'Ba ảnh', shots: 3, ratio: 1.08, columns: 1, width: 736, cellHeight: 240, padding: 0, gap: 0, footer: 0 },
  { id: 'event', name: '3 ảnh · Khung sưu tầm', short: 'Ba ảnh', shots: 3, ratio: 1.5, columns: 2, width: 1800, cellHeight: 480, padding: 40, gap: 20, footer: 140 },
  { id: 'strip', name: '1 × 4 · Dải ảnh', short: 'Dải ảnh', shots: 4, ratio: 4 / 3, columns: 1, width: 720, cellHeight: 480, padding: 40, gap: 18, footer: 140 },
  { id: 'grid', name: '2 × 2 · Lưới vuông', short: 'Lưới vuông', shots: 4, ratio: 1, columns: 2, width: 1440, cellHeight: 652, padding: 54, gap: 28, footer: 150 },
  { id: 'portrait', name: '1 ảnh · Chân dung', short: 'Chân dung', shots: 1, ratio: 3 / 4, columns: 1, width: 1080, cellHeight: 1333, padding: 40, gap: 0, footer: 140 },
  { id: 'polaroid', name: '1 ảnh · Polaroid', short: 'Polaroid', shots: 1, ratio: 1, columns: 1, width: 1080, cellHeight: 956, padding: 62, gap: 0, footer: 260 },
] as const;
export type LayoutId = typeof LAYOUTS[number]['id'];
export const THEMES = [
  { id: 'blue-scrapbook', name: 'Mèo và sao xanh', color: '#e5effa', ink: '#395d86', accent: '#91b2dc', pattern: 'plain', category: 'Sắc xanh' },
  { id: 'collected-gold', name: 'Kỷ niệm vàng', color: '#f2e5b7', ink: '#614918', accent: '#c69839', pattern: 'plain', category: 'Sưu tầm' },
  { id: 'collected-roses', name: 'Hoa hồng cổ điển', color: '#ffffff', ink: '#242b35', accent: '#333333', pattern: 'plain', category: 'Sưu tầm' },
  { id: 'collected-wedding', name: 'Ngày chung đôi', color: '#fff1f3', ink: '#7f254b', accent: '#b83260', pattern: 'plain', category: 'Sưu tầm' },
  { id: 'clouds', name: 'Mây xanh', color: '#dceeff', ink: '#285687', accent: '#ffffff', pattern: 'clouds', category: 'Sắc xanh' },
  { id: 'blue-ribbon', name: 'Nơ xanh dịu', color: '#edf5ff', ink: '#315e9a', accent: '#81a8dd', pattern: 'bows', category: 'Sắc xanh' },
  { id: 'blue-gingham', name: 'Caro picnic', color: '#f4f9ff', ink: '#28568d', accent: '#bbd5f4', pattern: 'checker', category: 'Sắc xanh' },
  { id: 'blue-botanical', name: 'Vườn hoa xanh', color: '#e8f0fa', ink: '#305583', accent: '#829fc4', pattern: 'botanical', category: 'Sắc xanh' },
  { id: 'blue-celestial', name: 'Trăng và sao', color: '#173459', ink: '#edf5ff', accent: '#d4e7fc', pattern: 'celestial', category: 'Sắc xanh' },
  { id: 'blue-airmail', name: 'Bưu thiếp biển', color: '#f7fbff', ink: '#25537f', accent: '#7da8d6', pattern: 'airmail', category: 'Sắc xanh' },
  { id: 'white', name: 'Trắng tinh khôi', color: '#fffdfa', ink: '#423b45', accent: '#d9c9d1', pattern: 'plain', category: 'Tối giản' },
  { id: 'film', name: 'Cuộn phim đen', color: '#25232b', ink: '#fff7ea', accent: '#fff7ea', pattern: 'film', category: 'Hoài cổ' },
  { id: 'retro', name: 'Vé ngày xưa', color: '#f2dcb6', ink: '#66452b', accent: '#af7754', pattern: 'ticket', category: 'Hoài cổ' },
  { id: 'pastel', name: 'Thư tình hồng', color: '#ffe2eb', ink: '#8a3156', accent: '#ea7ba4', pattern: 'hearts', category: 'Dễ thương' },
  { id: 'y2k', name: 'Ngôi sao Y2K', color: '#dedbff', ink: '#4e3a86', accent: '#9b7de1', pattern: 'stars', category: 'Dễ thương' },
  { id: 'camera', name: 'Sổ ảnh cổ điển', color: '#e4e8d4', ink: '#445237', accent: '#8fa17f', pattern: 'double', category: 'Hoài cổ' },
  { id: 'celebration', name: 'Tiệc sắc màu', color: '#fff3d4', ink: '#8a462b', accent: '#f29c6c', pattern: 'confetti', category: 'Sự kiện' },
  { id: 'cherry', name: 'Caro anh đào', color: '#fff0f3', ink: '#8c3556', accent: '#f0a4bb', pattern: 'checker', category: 'Dễ thương' },
  { id: 'mint', name: 'Chấm bi bạc hà', color: '#e3f4ec', ink: '#346153', accent: '#80baaa', pattern: 'dots', category: 'Dễ thương' },
  { id: 'blue', name: 'Sọc trời xanh', color: '#e8f3ff', ink: '#365c87', accent: '#a9c9ed', pattern: 'stripes', category: 'Tối giản' },
  { id: 'lavender', name: 'Ren tím', color: '#f0e8fc', ink: '#6b468c', accent: '#c6a5e3', pattern: 'lace', category: 'Dễ thương' },
  { id: 'peach', name: 'Nơ đào xinh', color: '#ffe8dd', ink: '#9a4e38', accent: '#e8a189', pattern: 'bows', category: 'Dễ thương' },
  { id: 'daisy', name: 'Hoa nhỏ', color: '#fff9d9', ink: '#776133', accent: '#d2b75e', pattern: 'flowers', category: 'Dễ thương' },
  { id: 'ocean', name: 'Sóng biển', color: '#daf1f5', ink: '#2f6875', accent: '#83bac7', pattern: 'waves', category: 'Tối giản' },
  { id: 'midnight', name: 'Đêm đầy sao', color: '#292b4b', ink: '#fff2d5', accent: '#d8c69a', pattern: 'stars', category: 'Sự kiện' },
  { id: 'notebook', name: 'Trang lưu bút', color: '#fffaf0', ink: '#475a7a', accent: '#b8c9e4', pattern: 'grid', category: 'Hoài cổ' },
  { id: 'birthday', name: 'Sinh nhật vui', color: '#fbe4f0', ink: '#893c70', accent: '#d98abc', pattern: 'confetti', category: 'Sự kiện' },
  { id: 'love', name: 'Hẹn hò đỏ', color: '#8f304c', ink: '#fff5ec', accent: '#dd8da5', pattern: 'hearts', category: 'Sự kiện' },
  { id: 'cocoa', name: 'Caro ca cao', color: '#e9d6c6', ink: '#5d4037', accent: '#bca08b', pattern: 'checker', category: 'Hoài cổ' },
  { id: 'silver', name: 'Viền ánh bạc', color: '#edf0f4', ink: '#495265', accent: '#a2acbc', pattern: 'double', category: 'Tối giản' },
] as const;
export type ThemeId = typeof THEMES[number]['id'];
export type Decoration = 'none' | 'star' | 'heart' | 'sparkle';
export const EFFECTS = [
  { id: 'timestamp', name: 'Dấu thời gian', label: 'TimeStamp', icon: '▣' },
  { id: 'lightLeak', name: 'Lọt sáng', label: 'Light Leak', icon: '☀' },
  { id: 'vignette', name: 'Tối góc', label: 'Vignette', icon: '◉' },
  { id: 'grain', name: 'Hạt phim', label: 'Grain', icon: '▦' },
  { id: 'chromatic', name: 'Lệch màu', label: 'Chromatic', icon: '🌈' },
] as const;
export type EffectId = typeof EFFECTS[number]['id'];
export interface PrintOptions {
  customFrame?: SharedFrame;
  layout: LayoutId; filter: FilterId; theme: ThemeId;
  background: string; border: string; caption: string; date: string;
  showDate: boolean; decoration: Decoration;
  effects: EffectId[]; timestamp: string; beauty: BeautyOptions;
}
export function localDate() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export const DEFAULT_OPTIONS: PrintOptions = {
  layout: 'strip', filter: 'original', theme: 'blue', background: '#e8f3ff', border: '#e8f3ff',
  caption: 'Một chút kỷ niệm', date: '', showDate: true, decoration: 'none',
  effects: [], timestamp: '', beauty: { smooth: 0, glow: 0 },
};

