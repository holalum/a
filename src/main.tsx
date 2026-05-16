import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StoreProvider } from './store';
import { ToastProvider } from './toast';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StoreProvider>
  </StrictMode>,
);
