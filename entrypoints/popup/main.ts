import { browser } from 'wxt/browser';
import '../../assets/theme.css';

document.addEventListener('DOMContentLoaded', () => {
	const sidebarBtn = document.getElementById('open-sidebar');
	const textpadBtn = document.getElementById('open-text-pad');

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

	sidebarBtn?.addEventListener('click', async () => {
		try {
			await browser.runtime.sendMessage({ action: 'REQUEST_TOGGLE_SIDEBAR' });
		} catch (e) {
			console.error("[SELD] Error sending REQUEST_TOGGLE_SIDEBAR from popup:", e);
		}
		window.close();
	});

	textpadBtn?.addEventListener('click', () => {
		browser.tabs.create({
			url: browser.runtime.getURL('/textpad.html'),
		});
		window.close();
	});
});
