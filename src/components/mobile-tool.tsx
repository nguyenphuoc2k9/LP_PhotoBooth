'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

// Keep a single copy of each editor, with its state owned by the booth.
export function MobileTool({ title, disabled, children }: { title: string; disabled?: boolean; children: ReactNode }) {
  const [mobile, setMobile] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    const query = matchMedia('(max-width: 767px), (max-height: 500px) and (max-width: 950px)');
    const sync = () => { dialog.current?.close(); setMobile(query.matches); };
    sync(); query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => { if (disabled) dialog.current?.close(); }, [disabled]);
  if (!mobile) return <div className="desktop-tool">{children}</div>;
  return <>
    <button ref={trigger} className="mobile-tool-trigger" disabled={disabled} aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{title}</button>
    <dialog ref={dialog} className="mobile-tool-sheet" aria-labelledby={titleId} onClose={() => trigger.current?.focus()}>
      <div className="mobile-sheet-heading"><h2 id={titleId}>{title}</h2><button aria-label={'Đóng ' + title} onClick={() => dialog.current?.close()}>✕</button></div>
      <div className="mobile-sheet-content">{children}</div>
    </dialog>
  </>;
}
