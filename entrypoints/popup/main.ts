import { browser } from 'wxt/browser';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import '../../assets/theme.css';
import './style.css'

document.addEventListener('DOMContentLoaded', () => {
	const sidebarBtn = document.getElementById('open-sidebar');
	const textpadBtn = document.getElementById('open-text-pad');
	const dictBtn = document.getElementById('dictionary-explorer');
	const libraryBtn = document.getElementById('open-library');

	const isRestrictedPage = (url?: string): boolean => {
		if (!url) return true;
		const restrictedPrefixes = [
			'chrome://',
			'chrome-extension://',
			'about:',
			'edge://',
			'moz-extension://',
			'https://chrome.google.com/webstore',
			'https://addons.mozilla.org/'
		];
		return restrictedPrefixes.some(prefix => url.startsWith(prefix));
	};

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
		const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

		if (isRestrictedPage(tab?.url)) {
			const instance = tippy(sidebarBtn!, {
				content: 'Use the sidebar on regular web pages.',
				trigger: 'manual',
				placement: 'top',
				offset: [0, -75], // Shift the tooltip right and down to overlay the buttons
				arrow: false,
				interactive: true, // Allows the tooltip to capture pointer events
				maxWidth: 180,
				theme: 'seld-warning',
				onShow(instance) {
					// Make the tooltip itself clickable to dismiss
					instance.popper.addEventListener('click', (e) => {
						e.stopPropagation(); // Prevent the click from hitting buttons underneath
						instance.hide();
					});
				},
				onHidden(instance) {
					instance.destroy();
				},
			});

			instance.show();

			// Auto-hide after 3 seconds
			setTimeout(() => {
				instance.hide();
			}, 4000);
			return;
		}

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

	dictBtn?.addEventListener('click', () => {
		browser.tabs.create({
			url: browser.runtime.getURL('/dictionary.html'),
		});
		window.close();
	});

	libraryBtn?.addEventListener('click', () => {
		browser.tabs.create({
			url: browser.runtime.getURL('/library.html'),
		});
		window.close();
	});
});
