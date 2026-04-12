import { browser } from 'wxt/browser';
import type { ContentScriptContext } from 'wxt/client';
import { checkBloom } from './bloom-data';
import { setActiveHighlight, clearActiveHighlight } from './dom-highlights';

const MAX_SELECTION_LENGTH = 100;

function getNGrams(text: string, offset: number): { 
	clickedWord: string, 
	clickedWordRange: { start: number, end: number } | null,
	potentialCompounds: { text: string, start: number, end: number }[] 
} {
	// Need to identify the word at offset first.
	const wordRegex = /[\u0D80-\u0DFFa-zA-Z\u200D\u200C]+/g;
	let match;
	const tokens: { text: string, start: number, end: number }[] = [];
	let clickedWordIdx = -1;

	while ((match = wordRegex.exec(text)) !== null) {
		const token = { text: match[0], start: match.index, end: match.index + match[0].length };
		tokens.push(token);
		if (match.index <= offset && match.index + match[0].length >= offset) {
			clickedWordIdx = tokens.length - 1;
		}
	}

	if (clickedWordIdx === -1) {
		// Fallback for when regex might miss something but offset is valid
		return { clickedWord: '', clickedWordRange: null, potentialCompounds: [] };
	}

	const clickedToken = tokens[clickedWordIdx];
	const compounds: { text: string, start: number, end: number }[] = [];
	
	// Generates 4, 3, 2-grams containing the clicked word
	for (let size = 4; size >= 2; size--) {
		for (let i = 0; i < size; i++) {
			const startIdx = clickedWordIdx - i;
			const endIdx = startIdx + size - 1;

			if (startIdx >= 0 && endIdx < tokens.length) {
				const group = tokens.slice(startIdx, endIdx + 1);
				compounds.push({
					text: group.map(t => t.text).join(' '),
					start: group[0].start,
					end: group[group.length - 1].end
				});
			}
		}
	}

	return { 
		clickedWord: clickedToken.text, 
		clickedWordRange: { start: clickedToken.start, end: clickedToken.end },
		potentialCompounds: compounds 
	};
}

export function setupSidebarEvents(
	getIsSidebarOpen: () => boolean,
	initSidebar: () => void,
	ctx?: ContentScriptContext | null
) {
	let lastQueryTime = 0;

	const handleSelection = (e: MouseEvent) => {
		if (!getIsSidebarOpen()) return;
		if (e.target instanceof HTMLElement && (e.target.closest('#seld-sidebar-root') || e.target.tagName.toLowerCase() === 'seld-sidebar')) return;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const selectionText = selection.toString().trim();
		if (selectionText.length > MAX_SELECTION_LENGTH) return;

		const range = selection.getRangeAt(0);
		const textNode = range.startContainer;
		const offset = range.startOffset;

		// Fallback for non-text-node selections or complex ranges
		if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
			const text = selection.toString().trim();
			if (text && text.length > 0 && text.length < MAX_SELECTION_LENGTH) {
				const now = Date.now();
				if (now - lastQueryTime > 300) {
					window.dispatchEvent(new CustomEvent('seld:search', { 
						detail: { 
							text, 
							range 
						} 
					}));
					lastQueryTime = now;
				}
			}
			return;
		}

		const text = textNode.nodeValue || '';
		const { clickedWord, clickedWordRange, potentialCompounds } = getNGrams(text, offset);

		let searchTarget = clickedWord;
		let isCompoundMaybe = false;
		let matchRange: { start: number, end: number } | null = clickedWordRange;

		for (const compound of potentialCompounds) {
			if (checkBloom(compound.text)) {
				searchTarget = compound.text;
				isCompoundMaybe = true;
				matchRange = { start: compound.start, end: compound.end };
				break;
			}
		}

		const selectionString = selection.toString().trim();
		const finalFallback = clickedWord || selectionString;
		if (!finalFallback) return;

		const potentialMatches: { text: string, range: Range }[] = [];
		for (const compound of potentialCompounds) {
			if (checkBloom(compound.text)) {
				const r = document.createRange();
				r.setStart(textNode, compound.start);
				r.setEnd(textNode, compound.end);
				potentialMatches.push({ text: compound.text, range: r });
			}
		}

		let wordRange: Range | null = null;
		if (clickedWordRange) {
			wordRange = document.createRange();
			wordRange.setStart(textNode, clickedWordRange.start);
			wordRange.setEnd(textNode, clickedWordRange.end);
		} else {
			wordRange = range;
		}

		const now = Date.now();
		if (now - lastQueryTime > 300) {
			window.dispatchEvent(
				new CustomEvent('seld:search', {
					detail: {
						text: finalFallback,
						wordRange,
						compounds: potentialMatches
					}
				})
			);
			lastQueryTime = now;
		}
	};

	const handleCtrlClick = (e: MouseEvent) => {
		if (!e.ctrlKey) return;
		if (e.target instanceof HTMLElement && (e.target.closest('#seld-sidebar-root') || e.target.tagName.toLowerCase() === 'seld-sidebar')) return;

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
			const { clickedWord, clickedWordRange, potentialCompounds } = getNGrams(text, offset);

			let searchTarget = clickedWord;
			let isCompoundMaybe = false;
			let matchRange: { start: number, end: number } | null = clickedWordRange;

			for (const compound of potentialCompounds) {
				if (checkBloom(compound.text)) {
					searchTarget = compound.text;
					isCompoundMaybe = true;
					matchRange = { start: compound.start, end: compound.end };
					break;
				}
			}

			if (searchTarget && searchTarget.length < MAX_SELECTION_LENGTH) {
				if (!getIsSidebarOpen()) {
					initSidebar();
				}

				const potentialMatches: { text: string, range: Range }[] = [];
				for (const compound of potentialCompounds) {
					if (checkBloom(compound.text)) {
						const r = document.createRange();
						r.setStart(textNode, compound.start);
						r.setEnd(textNode, compound.end);
						potentialMatches.push({ text: compound.text, range: r });
					}
				}

				let wordRange: Range | null = null;
				if (clickedWordRange) {
					wordRange = document.createRange();
					wordRange.setStart(textNode, clickedWordRange.start);
					wordRange.setEnd(textNode, clickedWordRange.end);
				}

				window.dispatchEvent(
					new CustomEvent('seld:search', {
						detail: {
							text: searchTarget,
							wordRange,
							compounds: potentialMatches
						}
					})
				);
			}
		});
	};

	// Use ctx.addEventListener when available for auto-cleanup on context invalidation
	if (ctx) {
		ctx.addEventListener(window, 'mouseup', handleSelection);
		ctx.addEventListener(window, 'click', handleCtrlClick);
	} else {
		window.addEventListener('mouseup', handleSelection);
		window.addEventListener('click', handleCtrlClick);
	}

	return () => {
		window.removeEventListener('mouseup', handleSelection);
		window.removeEventListener('click', handleCtrlClick);
	};
}
