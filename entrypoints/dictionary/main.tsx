import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../components/dictionary/App';
import '../../assets/theme.css';

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

ReactDOM.createRoot(document.getElementById('app')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
