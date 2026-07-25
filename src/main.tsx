import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Safely intercept unexpected Web API / iframe sandbox illegal constructor errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event?.error?.message?.includes('Illegal constructor') || 
      event?.message?.includes('Illegal constructor')
    ) {
      console.warn('Intercepted browser API illegal constructor error:', event.error || event.message);
      event.preventDefault();
      event.stopImmediatePropagation?.();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


