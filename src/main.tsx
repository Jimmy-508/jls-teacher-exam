import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { applyAppearanceSettings } from './services/appearanceService';
import { USER_SETTINGS_STORAGE_KEY } from './services/userSettingsService';
import './styles.css';

applySavedAppearanceSettings();

function applySavedAppearanceSettings() {
  try {
    const rawSettings = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    applyAppearanceSettings(rawSettings ? JSON.parse(rawSettings) : undefined);
  } catch {
    applyAppearanceSettings(undefined);
  }
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
