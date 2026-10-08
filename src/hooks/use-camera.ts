'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'missing' | 'busy' | 'unavailable' | 'error';
export const CAMERA_MESSAGES: Record<CameraStatus, string> = {
  idle: 'Bật camera và cho phép truy cập để bắt đầu chụp ảnh.', requesting: 'Hãy cho phép truy cập camera trong thông báo của trình duyệt.', ready: 'Camera đã sẵn sàng',
  denied: 'Camera đang bị chặn. Hãy cho phép truy cập camera trong cài đặt trang web rồi thử lại.',
  missing: 'Không tìm thấy camera. Hãy kết nối webcam hoặc tải ảnh từ thiết bị.',
  busy: 'Camera có thể đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.',
  unavailable: 'Camera cần kết nối HTTPS hoặc localhost. Hãy mở bằng Chrome, Safari, Firefox hoặc Edge.',
  error: 'Không khởi động được camera. Hãy kiểm tra kết nối rồi thử lại.',
};
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const stop = useCallback(() => {
    generation.current += 1;
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);
  const start = useCallback(async (facingMode: 'user' | 'environment' = 'user') => {
    stop(); const ticket = generation.current; setStatus('requesting');
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setStatus('unavailable'); return; }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
      if (ticket !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Preview unavailable');
      video.srcObject = stream;
      await Promise.all([new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => { cleanup(); reject(new Error('Camera startup timed out')); }, 15000);
        const ready = () => { cleanup(); resolve(); };
        const cleanup = () => { clearTimeout(timer); video.removeEventListener('loadeddata', ready); };
        if (video.readyState >= 2) ready(); else video.addEventListener('loadeddata', ready, { once: true });
      }), video.play()]);
      if (ticket !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => { if (ticket === generation.current) { stop(); setStatus('error'); } }, { once: true }));
      setStatus('ready');
    } catch (error) {
      stream?.getTracks().forEach(t => t.stop());
      if (ticket !== generation.current) return;
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      const name = error instanceof DOMException ? error.name : '';
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'missing' : name === 'NotReadableError' ? 'busy' : 'error');
    }
  }, [stop]);
  useEffect(() => {
    const release = () => stop();
    window.addEventListener('pagehide', release);
    return () => { window.removeEventListener('pagehide', release); generation.current++; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [stop]);
  return { videoRef, status, start, stop };
}
