import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TrackerPage from './TrackerPage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TrackerPage />
  </StrictMode>,
);
