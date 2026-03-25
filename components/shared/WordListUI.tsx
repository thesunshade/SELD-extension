import React, { useState, useEffect, useRef } from "react";
import tippy from "tippy.js";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import { Highlighter } from "./Highlighter";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "../../utils/constants";

interface WordListUIProps {
	items: string[]; // Expected in chronological order (oldest first)
	transliterateSinhala: boolean;
	onItemClick: (word: string, index: number) => void;
	onItemRemove: (word: string) => void;
	onFilteredItemsChange: (items: string[]) => void;
	emptyMessage?: string;
}

export const WordListUI: React.FC<WordListUIProps> = ({
	items,
	transliterateSinhala,
	onItemClick,
	onItemRemove,
	onFilteredItemsChange,
	emptyMessage = "No items found."
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortMode, setSortMode] = useState<"date" | "alpha">("date");
	const [filteredWords, setFilteredWords] = useState<string[]>([]);
	const sortBtnRef = useRef<HTMLButtonElement>(null);

	const toggleSort = () => {
		setSortMode(prev => prev === "date" ? "alpha" : "date");
	};

	useEffect(() => {
		if (sortBtnRef.current) {
			const instance = tippy(sortBtnRef.current, {
				content: sortMode === "date" ? "Click to sort alphabetically" : "Click to sort by date added",
				placement: "top",
				animation: "fade",
			});
			return () => instance.destroy();
		}
	}, [sortMode]);

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
					placeholder="Search list..."
					value={searchQuery}
					onChange={e => setSearchQuery(e.target.value)}
					style={{ flex: 1, margin: 0 }}
				/>
				<button
					ref={sortBtnRef}
					onClick={toggleSort}
					className="sort-toggle-btn"
					style={{ background: "transparent", border: "1px solid rgba(128,128,128,0.3)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "40px" }}
				>
					{sortMode === "date" ? (
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
							<line x1="16" y1="2" x2="16" y2="6"></line>
							<line x1="8" y1="2" x2="8" y2="6"></line>
							<line x1="3" y1="10" x2="21" y2="10"></line>
						</svg>
					) : (
						<span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>අ</span>
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
								className="remove-item-btn"
								onClick={e => {
									e.stopPropagation();
									onItemRemove(word);
								}}
								title="Remove"
								style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", color: "inherit" }}
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
				.list-item .remove-item-btn { opacity: 0; transition: opacity 0.2s; }
				.list-item:hover .remove-item-btn { opacity: 0.5; }
				.list-item .remove-item-btn:hover { opacity: 1; color: #e74c3c; }
			`}</style>
		</div>
	);
}
