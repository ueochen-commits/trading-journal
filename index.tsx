import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import posthog from 'posthog-js';

posthog.init('phc_Bue0oaCzWqHfduKWkCejiDFljJIU0ehvImdGVGMwZdr0', {
  api_host: 'https://us.i.posthog.com',
  person_profiles: 'identified_only',
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