// Safe process.env shim for client-side environments (e.g., Vercel production builds)
if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || {};
  (window as any).process.env = (window as any).process.env || {};
  
  // Backport all Vite environment variables safely to process.env
  try {
    const metaEnv = (import.meta as any).env || {};
    Object.keys(metaEnv).forEach((key) => {
      (window as any).process.env[key] = metaEnv[key];
    });
  } catch (e) {
    console.warn("Could not copy import.meta.env properties:", e);
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
