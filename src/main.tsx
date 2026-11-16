import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

(window as any).__STREAMALLOW_MOUNTED__ = true;

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('[Stream Allow Fatal Mount Error]:', error);
  }
} else {
  console.error('[Stream Allow Fatal] Root element "#root" not found in document.');
}
