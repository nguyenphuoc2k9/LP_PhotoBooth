import { EFFECTS, type EffectId } from '@/lib/config';

export function EffectPicker({ value, onChange, disabled = false }: { value: EffectId[]; onChange: (value: EffectId[]) => void; disabled?: boolean }) {
  return <fieldset className="effects-panel" disabled={disabled}>
    <legend>Hiệu ứng <span>Hiển thị sau khi chụp · Có thể kết hợp</span></legend>
    <div className="effect-list">{EFFECTS.map(effect => <button type="button" key={effect.id}
      aria-label={effect.name} title={effect.name} aria-pressed={value.includes(effect.id)}
      onClick={() => onChange(value.includes(effect.id) ? value.filter(id => id !== effect.id) : [...value, effect.id])}>
      <span aria-hidden="true">{effect.icon}</span>{effect.label}
    </button>)}</div>
  </fieldset>;
}
