'use client';
import { useRef, useState } from 'react';
import { Aperture, Camera, ShieldCheck, Download, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PrintSample } from './print-sample';
gsap.registerPlugin(ScrollTrigger, useGSAP);
export function Home({ onStart, onPrivacy }: { onStart: (demo?: boolean) => void; onPrivacy: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [sample, setSample] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-content > *', { y: 18, opacity: 0, stagger: .08, duration: .65, ease: 'power2.out' });
      gsap.utils.toArray<HTMLElement>('.scroll-print').forEach(el => {
        gsap.fromTo(el, { scale: .86 }, { scale: 1, scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 45%', scrub: true } });
        gsap.to(el, { opacity: .25, scrollTrigger: { trigger: el, start: 'bottom 20%', end: 'bottom top', scrub: true } });
      });
    });
    mm.add('(min-width: 1000px) and (prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.create({ trigger: '.story-copy', start: 'top 20%', endTrigger: '.story-prints', end: 'bottom 65%', pin: true, pinSpacing: false });
    });
    return () => mm.revert();
  }, { scope: root });
  const faqs = [
    ['Where do my photos go?', 'Nowhere until you download them. Camera frames and finished prints are processed in your browser. We don’t upload, store, or analyze your photos.'],
    ['Can I use my phone?', 'Yes. Open Stillroom in a current mobile browser, allow the camera, and use portrait or landscape mode. The front camera is preferred.'],
    ['Will my print be mirrored?', 'The live preview is mirrored to feel like a selfie camera. Your downloaded photograph keeps the camera’s original orientation.'],
    ['Do I need an account?', 'No account, no sign-up. Just a camera and a little moment. Your print downloads as a high-resolution PNG.'],
  ];
  return <main ref={root} className="home overflow-x-hidden w-full max-w-full">
    <header className="nav"><a className="wordmark" href="#" aria-label="Stillroom home"><Aperture aria-hidden="true" />stillroom<span className="brand-period">.</span></a><nav aria-label="Main navigation"><a href="#the-prints">The prints</a><button className="text-link" onClick={onPrivacy}>Your privacy</button><button className="nav-start" onClick={() => onStart()}>Step inside <Camera size={16} /></button></nav></header>
    <section className="hero">
      <div className="hero-content">
        <p className="eyebrow">YOUR BROWSER. YOUR PHOTO BOOTH.</p>
        <h1 className="max-w-6xl">A little moment.<br /><span className="serif">Worth keeping.</span></h1>
        <p className="hero-description">Pull up a friend. Make a face. Keep the feeling.<br />A photo booth for wherever you are.</p>
        <div className="hero-actions"><button className="button primary" onClick={() => onStart()}><Camera size={19} />Start photo booth</button><button className="button secondary" onClick={() => onStart(true)}>Try a sample</button></div>
        <p className="camera-note"><ShieldCheck size={14} />No sign-up. Photos stay on your device.</p>
      </div>
      <div className="hero-gallery" aria-label="Sample photographic prints">
        <div className="hero-strip"><PrintSample tone="mono" caption="JUST US, BEING US" /></div>
        <div className="hero-main-photo"><img src="/sample.jpg" alt="Two friends laughing together in an analog-style photo booth" /><span className="photo-edge">SOME DAYS DESERVE A PRINT.</span></div>
        <div className="hero-polaroid"><PrintSample variant="polaroid" caption="the good kind of ordinary" /></div>
        <span className="gallery-caption">A FEW SECONDS. A SMALL KEEPSAKE.</span>
      </div>
    </section>
    <div className="film-marquee" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, i) => <span key={i}>COME AS YOU ARE <Aperture /> LEAVE WITH A MEMORY <Aperture /></span>)}</div></div>
    <section className="prints-section" id="the-prints">
      <div className="section-heading"><div><p className="eyebrow">MADE TO KEEP</p><h2>Your moment.<br /><span className="serif">Your kind of print.</span></h2></div><p>Classic strips, instant-film borders, or a frame all to yourself. A little nostalgia, made yours.</p></div>
      <div className="prints-grid grid-flow-dense">
        <article><div className="print-stage"><PrintSample caption="FOUR LITTLE MEMORIES" /></div><div className="print-label"><h3>The classic strip</h3><span>Four frames. One story.</span></div></article>
        <article><div className="print-stage"><PrintSample variant="grid" tone="mono" caption="ALL THE GOOD TAKES" /></div><div className="print-label"><h3>The contact sheet</h3><span>Room for every expression.</span></div></article>
        <article><div className="print-stage"><PrintSample variant="polaroid" caption="right here, right now" /></div><div className="print-label"><h3>The instant memory</h3><span>A classic, with your caption.</span></div></article>
      </div>
    </section>
    <section className="story-section"><div className="story-copy"><p className="eyebrow">LESS PERFECT. MORE YOU.</p><h2>A face.<br />A friend.<br /><span className="serif">A feeling.</span></h2><p>The best photos aren’t always the planned ones. Three seconds to get ready. Then let the moment happen.</p><button className="button primary" onClick={() => onStart()}><Camera size={18} />Make your own</button></div><div className="story-prints"><div className="scroll-print"><PrintSample variant="polaroid" caption="a very good day" /></div><div className="scroll-print dark-print"><PrintSample tone="mono" caption="THE IN-BETWEEN MOMENTS" /></div></div></section>
    <section className="sample-section"><div><p className="eyebrow">A DIFFERENT MOOD, SAME YOU</p><h2>Find your <span className="inline-photo"><img src="/sample.jpg" alt="" /></span><br /><span className="serif">favorite feeling.</span></h2><p>From crisp black and white to warm, faded film.<br />Eight filters. Plenty of personality.</p><div className="carousel-controls"><button aria-label="Previous sample filter" onClick={() => setSample((sample + 2) % 3)}><ChevronLeft /></button><span>{['Original', 'Black & White', 'Vintage'][sample]}</span><button aria-label="Next sample filter" onClick={() => setSample((sample + 1) % 3)}><ChevronRight /></button></div></div><div className="mood-print"><PrintSample variant="polaroid" tone={['', 'mono', 'vintage'][sample]} caption={['just like that', 'a little timeless', 'warm memories'][sample]} /></div></section>
    <section className="faq-section"><h2>A few things<br /><span className="serif">before you step in.</span></h2><div>{faqs.map(([q, a], i) => <div className="faq" key={q}><button aria-expanded={openFaq === i} aria-controls={`faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{q}{openFaq === i ? <Minus size={18} /> : <Plus size={18} />}</button><div id={`faq-${i}`} hidden={openFaq !== i}><p>{a}</p></div></div>)}</div></section>
    <section className="last-call"><Aperture size={38} /><h2>Meet you<br /><span className="serif">in the booth.</span></h2><button className="button paper" onClick={() => onStart()}><Camera size={18} />Start photo booth</button><p>Free to make. Yours to keep.</p></section>
    <footer className="footer"><a className="wordmark" href="#"><Aperture />stillroom.</a><span>A little corner of the internet, for you.</span><button className="text-link" onClick={onPrivacy}>Privacy</button></footer>
  </main>;
}
