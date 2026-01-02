import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Initialize offline queue monitoring
import { initOfflineQueue } from './utils/offlineQueue'
const cleanupOfflineQueue = initOfflineQueue();

// Initialize global error handling
import { setupGlobalErrorHandling } from './utils/globalErrorHandler'
setupGlobalErrorHandling();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupOfflineQueue();
});

