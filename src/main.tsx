import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Manage Service Worker registration based on environment
if ('serviceWorker' in navigator) {
  if ((import.meta as any).env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('PWA Service Worker registered successfully!', reg.scope))
        .catch((err) => console.warn('PWA Service Worker registration failed:', err));
    });
  } else {
    // We are in development mode, so unregister service workers to avoid breaking HMR and hot assets
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Cleared dev service worker to allow fresh reload.');
            // Reload to fetch the non-cached fresh dev assets
            window.location.reload();
          }
        });
      }
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
