import React from 'react';
import ReactDOM from 'react-dom/client';
import LibraryApp from '../../components/library/LibraryApp';
import '../../assets/theme.css';
import '../../components/library/Library.css';
import { browser } from 'wxt/browser';

import { createThemeManager } from '../../utils/themeManager';

/**
 * Entrypoint for The Library.
 * Sets up theme listeners and mounts the LibraryApp.
 */
document.addEventListener('DOMContentLoaded', () => {
	createThemeManager().setupThemeListeners();
});

const rootElement = document.getElementById('app');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LibraryApp />
    </React.StrictMode>
  );
}
