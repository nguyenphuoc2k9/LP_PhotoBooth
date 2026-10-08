import { NO_BEAUTY, type BeautyOptions } from '@/lib/beauty';
export function BeautyPicker({ value, onChange, disabled = false }: { value: BeautyOptions; onChange: (value: BeautyOptions) => void; disabled?: boolean }) {
  return <fieldset className="beauty-panel" disabled={disabled}><legend>Làm đẹp tự nhiên</legend>
    <p>Giữ nét khuôn mặt · Áp dụng sau khi chụp</p>
    <label htmlFor="beauty-smooth">Làm mịn giữ nét <output>{value.smooth}%</output><input id="beauty-smooth" type="range" min="0" max="100" step="5" value={value.smooth} onChange={e => onChange({ ...value, smooth: Number(e.target.value) })} /></label>
    <label htmlFor="beauty-glow">Sáng dịu <output>{value.glow}%</output><input id="beauty-glow" type="range" min="0" max="100" step="5" value={value.glow} onChange={e => onChange({ ...value, glow: Number(e.target.value) })} /></label>
    <button type="button" className="quiet-button" onClick={() => onChange(NO_BEAUTY)}>Tắt làm đẹp</button>
  </fieldset>;
}

