import React from 'react';
import ReactDOM from 'react-dom/client';
import LibraryApp from '../../components/library/LibraryApp';
import '../../assets/theme.css';
import '../../components/library/Library.css';
import { browser } from 'wxt/browser';

/**
 * Entrypoint for The Library.
 * Sets up theme listeners and mounts the LibraryApp.
 */
document.addEventListener('DOMContentLoaded', () => {
	const applyTheme = (theme: string) => {
		const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.body.className = `seld-theme-vars ${isDark ? 'dark-theme' : 'light-theme'}`;
	};

	browser.storage.local.get(['theme']).then(res => {
		applyTheme((res.theme as string) || 'system');
	});

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		browser.storage.local.get(['theme']).then(res => {
			applyTheme((res.theme as string) || 'system');
		});
	});

	browser.storage.onChanged.addListener((changes, namespace) => {
		if (namespace === 'local' && changes.theme) {
			applyTheme(changes.theme.newValue as string);
		}
	});
});

const rootElement = document.getElementById('app');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <LibraryApp />
    </React.StrictMode>
  );
}
