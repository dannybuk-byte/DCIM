import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Initialize offline queue monitoring
import { initOfflineQueue } from './utils/offlineQueue'
const cleanupOfflineQueue = initOfflineQueue();

// Expose antifragility services for debugging (DEV only)
import { chaosEngine } from './services/chaosEngineering'
import { degradationService } from './services/gracefulDegradation'
import { selfHealingService } from './services/selfHealing'
import { predictiveFailureEngine, recordMetric } from './services/predictiveFailure'

if (import.meta.env.DEV) {
  // Expose under dcim namespace
  (window as any).dcim = {
    chaosEngine,
    degradationService,
    selfHealingService,
    predictiveFailureEngine,
    recordMetric,
  };
  
  // Also expose directly on window for convenience
  (window as any).chaosEngine = chaosEngine;
  (window as any).degradationService = degradationService;
  (window as any).selfHealingService = selfHealingService;
  (window as any).predictiveFailureEngine = predictiveFailureEngine;
  (window as any).recordMetric = recordMetric;
  
  console.log('🛠️ DCIM Debug Tools available at window.dcim.* or window.*');
}

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

