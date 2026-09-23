import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppLauncherPage from './AppLauncherPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLauncherPage />
  </StrictMode>,
);
