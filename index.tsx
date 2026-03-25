import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

posthog.init('phc_Bue0oaCzWqHfduKWkCejiDFljJIU0ehvImdGVGMwZdr0', {
  api_host: 'https://us.posthog.com',
  person_profiles: 'identified_only',
});

Sentry.init({
  dsn: 'https://19b0bc8a05c3daa283a76a9709356f5f@o4511102439260160.ingest.us.sentry.io/4511102451187712',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 0.2,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);