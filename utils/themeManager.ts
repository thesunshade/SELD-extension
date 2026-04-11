import { browser } from 'wxt/browser';

/**
 * Utility to manage the application theme across different entrypoints.
 * It handles the initial theme application, system preference changes,
 * and storage changes (when the user updates settings).
 */
export const createThemeManager = () => {
	const applyTheme = (theme: string) => {
		const isDark =
			theme === 'dark' ||
			(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.body.className = `seld-theme-vars ${isDark ? 'dark-theme' : 'light-theme'}`;
	};

	const initTheme = async () => {
		const res = await browser.storage.local.get(['theme']);
		applyTheme((res.theme as string) || 'system');
	};

	const setupThemeListeners = () => {
		// Apply theme immediately on call
		initTheme();

		// Listen for system theme changes (relevant if 'system' is selected)
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			// Re-check storage to see if we should still follow system theme
			initTheme();
		});

		// Listen for manual theme changes in storage (from Settings)
		browser.storage.onChanged.addListener((changes, namespace) => {
			if (namespace === 'local' && changes.theme) {
				applyTheme(changes.theme.newValue as string);
			}
		});
	};

	return { setupThemeListeners };
};
