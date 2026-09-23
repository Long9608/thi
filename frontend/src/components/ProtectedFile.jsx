import React, { useEffect, useState } from 'react';

function useProtectedFile(src) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl('');
    if (!src) return;
    if (src.startsWith('blob:') || src.startsWith('data:image/')) { setUrl(src); return; }
    const origin = new URL(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').origin;
    const target = new URL(src, origin);
    if (target.origin !== origin || !target.pathname.startsWith('/uploads/')) return;
    const controller = new AbortController();
    let objectUrl;
    fetch(target, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('File unavailable'); return response.blob(); })
      .then(blob => { if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
      .catch(() => {});
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src]);
  return url;
}

export function ProtectedImage({ src, alt, ...props }) {
  const url = useProtectedFile(src);
  return url ? <img src={url} alt={alt} {...props} /> : <span className="text-sm text-slate-500">Không tải được ảnh</span>;
}

export function ProtectedFileLink({ href, children, ...props }) {
  const url = useProtectedFile(href);
  return url ? <a href={url} {...props}>{children}</a> : null;
}
