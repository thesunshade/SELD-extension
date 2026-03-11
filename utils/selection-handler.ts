import { browser } from 'wxt/browser';

export function setupSidebarEvents(
	getIsSidebarOpen: () => boolean,
	initSidebar: () => void
) {
	let lastQueryTime = 0;

	const handleSelection = (e: MouseEvent) => {
		if (!getIsSidebarOpen()) return;
		if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const text = selection.toString().trim();

		if (text && text.length > 0 && text.length < 50) {
			const now = Date.now();
			if (now - lastQueryTime > 300) {
				window.dispatchEvent(new CustomEvent('seld:search', { detail: text }));
				lastQueryTime = now;
			}
		}
	};

	const handleCtrlClick = (e: MouseEvent) => {
		if (!e.ctrlKey) return;
		if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

		browser.storage.local.get(['seldCtrlClickLookup']).then((result) => {
			if (result.seldCtrlClickLookup === false) return;

			let textNode: Node | null = null;
			let offset: number = 0;

			if (document.caretRangeFromPoint) {
				const range = document.caretRangeFromPoint(e.clientX, e.clientY);
				if (range) {
					textNode = range.startContainer;
					offset = range.startOffset;
				}
			} else if ((document as any).caretPositionFromPoint) {
				const position = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
				if (position) {
					textNode = position.offsetNode;
					offset = position.offset;
				}
			}

			if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

			const text = textNode.nodeValue || '';

			const start = text.substring(0, offset).search(/[\u0D80-\u0DFFa-zA-Z]+$/);
			const end = text.substring(offset).search(/[^\u0D80-\u0DFFa-zA-Z]/);

			let word = '';
			if (start !== -1) {
				const actualEnd = end === -1 ? text.length : offset + end;
				word = text.substring(start, actualEnd).trim();
			}

			if (word && word.length < 50) {
				if (!getIsSidebarOpen()) {
					initSidebar();
				}
				window.dispatchEvent(new CustomEvent('seld:search', { detail: word }));
			}
		});
	};

	window.addEventListener('mouseup', handleSelection);
	window.addEventListener('click', handleCtrlClick);

	return () => {
		window.removeEventListener('mouseup', handleSelection);
		window.removeEventListener('click', handleCtrlClick);
	};
}
