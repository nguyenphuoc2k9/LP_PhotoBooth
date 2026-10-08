import { Aperture } from 'lucide-react';
export function PrintSample({ variant = 'strip', tone = '', caption = 'GOOD COMPANY' }: { variant?: 'strip' | 'polaroid' | 'grid'; tone?: string; caption?: string }) {
  return <div className={`sample-print ${variant} ${tone}`}>
    <div className="sample-photos">{Array.from({ length: variant === 'polaroid' ? 1 : 4 }, (_, i) => <div className="sample-photo" key={i}><img src="/sample.jpg" alt={i === 0 ? 'Sample print of two friends laughing in a photo booth' : ''} style={{ objectPosition: `${45 + i * 5}% ${45 + i * 5}%`, transform: `scale(${1 + i * .06})` }} /></div>)}</div>
    <div className="sample-caption"><span>{caption}</span><small>STILLROOM <Aperture size={9} /></small></div>
  </div>;
}
