import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import ChatWidget from './components/ChatWidget';

const isEmbedded = window.self !== window.top;

if (isEmbedded) {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {!isEmbedded && (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-center text-slate-500">
          <p className="text-lg font-medium">Web del Restaurante</p>
          <p className="text-sm mt-1">El widget aparece en la esquina inferior derecha →</p>
        </div>
      </div>
    )}
    <ChatWidget />
  </StrictMode>,
);
