import React, { useState, useEffect, useRef } from "react";
import tippy from "tippy.js";
import { Highlighter } from "./Highlighter";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "../../utils/constants";
import { stardict } from "../../utils/stardict";
import { htmlToFormattedText } from "../../utils/styleTranslator";

const DownloadListButton = ({ filteredWords, listType }: { filteredWords: string[], listType?: string }) => {
	const btnRef = useRef<HTMLButtonElement>(null);
	const [isDownloading, setIsDownloading] = useState(false);

	useEffect(() => {
		if (btnRef.current) {
			const instance = tippy(btnRef.current, {
				interactive: true,
				trigger: 'click',
				placement: 'bottom-end',
				theme: 'light',
				appendTo: () => {
					const root = btnRef.current?.closest('.seld-theme-vars');
					return (root as HTMLElement) || document.body;
				},
				onShow: (inst) => {
					const openTippys = document.querySelectorAll('[data-tippy-root]');
					openTippys.forEach(t => {
						if (t !== inst.popper) {
							(t as any)._tippy?.hide();
						}
					});

					const container = document.createElement('div');
					container.style.display = 'flex';
					container.style.flexDirection = 'column';
					container.style.gap = '4px';
					container.style.padding = '6px';

					const createOption = (label: string, type: number) => {
						const btn = document.createElement('button');
						btn.className = "seld-btn seld-btn-ghost";
						btn.style.textAlign = "left";
						btn.style.justifyContent = "flex-start";
						btn.style.width = "100%";
						btn.style.padding = "6px 12px";
						btn.style.whiteSpace = "nowrap";
						btn.textContent = label;
						btn.onclick = () => {
							handleDownload(type);
							inst.hide();
						};
						return btn;
					};

					container.appendChild(createOption("Download as Plain Text", 1));
					container.appendChild(createOption("Download as Markdown", 2));
					container.appendChild(createOption("Download as TSV", 3));

					inst.setContent(container);
				}
			});
			return () => instance.destroy();
		}
	}, [filteredWords, listType]);

	const handleDownload = async (type: number) => {
		if (filteredWords.length === 0) return;
		setIsDownloading(true);

		try {
			const lines: string[] = [];
			
			if (type === 3) {
				lines.push(`Word\tDefinition`);
			}

			for (const word of filteredWords) {
				const defBlocks = await stardict.getDefinition(word);
				let definitionHtml = "";
				if (defBlocks) {
					if (defBlocks.length > 1) {
						definitionHtml = defBlocks.map(b => {
							const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
							const homographs = b.homographDefinitions.join("<hr/>");
							return `${header}${homographs}`;
						}).join("\n\n<hr/>\n\n");
					} else if (defBlocks.length === 1) {
						definitionHtml = defBlocks[0].homographDefinitions.join("\n\n<hr/>\n\n");
					}
				}

				if (type === 1) { // Plain Text
					const plainDef = htmlToFormattedText(definitionHtml, false);
					lines.push(`${word}\n\n${plainDef}`);
				} else if (type === 2) { // Markdown
					const mdDef = htmlToFormattedText(definitionHtml, true);
					lines.push(`${word}\n\n${mdDef}`);
				} else if (type === 3) { // TSV
					const plainDef = htmlToFormattedText(definitionHtml, false);
					const sanitize = (str: string) => str.replace(/\t/g, ' ').replace(/\n/g, '\\n');
					lines.push(`${sanitize(word)}\t${sanitize(plainDef)}`);
				}
			}

			let finalContent = "";
			let mimeType = "text/plain";
			let ext = "txt";

			if (type === 1 || type === 2) {
				finalContent = lines.join("\n\n-----\n\n");
			} else if (type === 3) {
				finalContent = lines.join("\n");
				mimeType = "text/tab-separated-values;charset=utf-8;";
				ext = "tsv";
			}

			const blob = new Blob([finalContent], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `SELD_${listType?.toLowerCase() || 'export'}.${ext}`;
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 100);
		} catch (error) {
			console.error("Failed to generate download", error);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<button
			ref={btnRef}
			title="Download List"
			className="seld-btn seld-btn-secondary sort-toggle-btn"
			style={{ minWidth: "40px", padding: "4px 8px", opacity: isDownloading ? 0.5 : 1 }}
			disabled={isDownloading || filteredWords.length === 0}
		>
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="7 10 12 15 17 10"></polyline>
				<line x1="12" y1="15" x2="12" y2="3"></line>
			</svg>
		</button>
	);
};

interface WordListUIProps {
	items: string[]; // Expected in chronological order (oldest first)
	transliterateSinhala: boolean;
	onItemClick: (word: string, index: number) => void;
	onItemRemove: (word: string) => void;
	onFilteredItemsChange: (items: string[]) => void;
	emptyMessage?: string;
	listType?: string;
}

export const WordListUI: React.FC<WordListUIProps> = ({
	items,
	transliterateSinhala,
	onItemClick,
	onItemRemove,
	onFilteredItemsChange,
	emptyMessage = "No items found.",
	listType
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortMode, setSortMode] = useState<"date" | "alpha">("date");
	const [filteredWords, setFilteredWords] = useState<string[]>([]);


	useEffect(() => {
		let isActive = true;

		const processList = () => {
			let matchedItems = [...items];

			if (searchQuery.trim()) {
				const patterns = searchQuery.trim().toLowerCase().split(/\s+/);
				matchedItems = matchedItems.filter(w => {
					const wLower = w.toLowerCase();
					return patterns.every(term => wLower.includes(term));
				});
			}

			if (sortMode === "alpha") {
				// Sort alphabetically using Sinhala locale
				matchedItems.sort((a, b) => a.localeCompare(b, "si"));
			} else {
				// Date added (newest at top) map reverse of chronological
				matchedItems.reverse();
			}

			if (isActive) {
				setFilteredWords(matchedItems);
				onFilteredItemsChange(matchedItems);
			}
		};

		const debounce = setTimeout(() => {
			processList();
		}, searchQuery.trim() ? DEFAULT_SEARCH_DEBOUNCE_MS : 0);

		return () => {
			isActive = false;
			clearTimeout(debounce);
		};
	}, [items, searchQuery, sortMode, onFilteredItemsChange]);

	return (
		<div className="word-list-ui" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div className="word-list-header" style={{ display: "flex", gap: "8px", paddingBottom: "10px" }}>
				<input
					type="text"
					className="dict-search-input"
					placeholder={listType ? `Search ${listType} list...` : "Search list..."}
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					style={{ flex: 1, margin: 0 }}
				/>
				<DownloadListButton filteredWords={filteredWords} listType={listType} />
				<button
					onClick={() => setSortMode(prev => prev === "date" ? "alpha" : "date")}
					className="seld-btn seld-btn-secondary sort-toggle-btn"
					style={{ minWidth: "40px", padding: "4px 8px" }}
					data-tippy-content={sortMode === "date" ? "Click to sort alphabetically" : "Click to sort by date added"}
				>
					{sortMode === "date" ? (
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
							<line x1="16" y1="2" x2="16" y2="6"></line>
							<line x1="8" y1="2" x2="8" y2="6"></line>
							<line x1="3" y1="10" x2="21" y2="10"></line>
						</svg>
					) : (
						<svg
							viewBox="173 218 32 32"
							width="23"
							height="23"
							fill="currentColor"
							stroke="currentColor"
							strokeWidth="0.4"
						>
							<path d="m 191.30077,242.60092 q -1.58985,0.20052 -3.26563,0.20052 -4.2539,0 -6.64582,-1.8763 -2.39193,-1.8763 -2.39193,-5.27082 0,-1.7474 0.6875,-3.00781 0.6875,-1.27474 1.99089,-2.10547 1.30338,-0.83073 2.97916,-1.11719 1.6901,-0.28645 4.31119,-0.28645 h 2.33464 q -0.0716,-1.27474 -0.81641,-1.97656 -0.74479,-0.70183 -2.00521,-0.70183 -1.16015,0 -1.74739,0.44401 -0.57292,0.42969 -0.57292,1.16016 0,0.25781 0.0286,0.42969 l -2.09114,0.25781 q -0.0716,-0.42969 -0.0716,-0.88802 0,-1.57552 1.13151,-2.44922 1.13151,-0.88802 3.17969,-0.88802 3.05077,0 4.19661,2.49219 0.77343,-1.33203 2.16275,-2.50651 l 1.60417,1.28906 q -0.17188,0.22917 -0.17188,0.60156 0,0.34375 0.20052,0.75912 0.20052,0.40104 0.75912,1.26041 0.65885,0.98828 0.91666,1.6901 0.25782,0.6875 0.25782,1.34636 0,1.46093 -0.94532,2.22005 -0.93098,0.74479 -2.77864,0.74479 -0.65885,0 -1.16015,-0.12891 v 5.88671 q 0.98828,-0.28646 2.09114,-0.88802 l 0.75911,1.94792 q -1.16015,0.55859 -2.85025,1.0026 v 6.17317 h -2.07682 z m 2.07682,-10.22655 q 0.37239,0.11458 1.04557,0.11458 0.94531,0 1.33203,-0.3151 0.38672,-0.3151 0.38672,-0.94531 0,-0.47266 -0.17188,-0.90234 -0.17187,-0.44401 -0.65885,-1.20313 -0.6875,-1.03125 -0.80208,-1.61848 -0.50131,0.61588 -0.81641,1.41796 -0.3151,0.78776 -0.3151,2.14844 z m -2.07682,8.16405 v -9.46743 h -2.09115 q -2.6927,0 -4.02473,0.24349 -1.33203,0.24349 -2.2487,0.84505 -0.90234,0.60156 -1.3177,1.51823 -0.40105,0.90234 -0.40105,2.10546 0,2.27734 1.81901,3.60937 1.81901,1.31771 5.22786,1.31771 1.91927,0 3.03646,-0.17188 z" />
						</svg>
					)}
				</button>
			</div>

			<div className="word-list-content search-results-list custom-scroll" style={{ flex: 1, overflowY: "auto", margin: 0 }}>
				{filteredWords.length === 0 ? (
					<div className="dict-empty-state" style={{ padding: "20px", textAlign: "center", opacity: 0.7 }}>
						{emptyMessage}
					</div>
				) : (
					filteredWords.map((word, idx) => (
						<div
							key={`${word}-${idx}`}
							className="headword-item list-item"
							onClick={() => onItemClick(word, idx)}
							style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
						>
							<div style={{ flex: 1 }}>
								<Highlighter text={word} searchTerm={searchQuery} />
								{transliterateSinhala && /[\u0D80-\u0DFF]/.test(word) && (
									<span className="seld-transliteration"> {transliterateSinhalaTxt(word)}</span>
								)}
							</div>
							<button
								className="seld-btn seld-btn-ghost seld-btn-icon-circle remove-item-btn"
								onClick={e => {
									e.stopPropagation();
									onItemRemove(word);
								}}
								data-tippy-content="Remove"
							>
								<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>
					))
				)}
			</div>
			<style>{`
				.list-item .remove-item-btn { opacity: 0; transform: scale(0.8); }
				.list-item:hover .remove-item-btn { opacity: 0.6; }
				.list-item .remove-item-btn:hover { opacity: 1; color: #e74c3c; transform: scale(1); }
			`}</style>
		</div>
	);
}
