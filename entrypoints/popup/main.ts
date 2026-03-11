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
			const tabs = await browser.tabs.query({ active: true, currentWindow: true });
			const tab = tabs[0];
			if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
				await browser.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' });
			} else {
				console.warn("[SELD] Cannot open sidebar on this page.");
			}
		} catch (e) {
			console.error("[SELD] Error sending TOGGLE_SIDEBAR from popup:", e);
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
