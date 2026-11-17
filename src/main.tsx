import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// @ts-ignore — SCSS side-effect imports are handled by the bundler.
import './styles/main.scss';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
