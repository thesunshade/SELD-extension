import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { transliterateSinhala } from "../../utils/transliterate";
import { getCopyText } from "../../utils/clipboard";
import { browser } from "wxt/browser";
import { DefinitionCard } from "../shared/DefinitionCard";
import "./App.css";

type ViewTab = "browse" | "search";
type SearchScope = "headwords" | "fulltext";

const BATCH_SIZE = 30;

export default function DictionaryApp() {
	// --- State ---
	const [view, setView] = useState<ViewTab>(() => {
		return (sessionStorage.getItem("dict-view") as ViewTab) || "browse";
	});
	const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
	const [fontSize, setFontSize] = useState(100);
	const [transliterateHeadwords, setTransliterateHeadwords] = useState(false);
	const [transliterateDefinitions, setTransliterateDefinitions] = useState(false);

	// Browse state
	const [allEntries, setAllEntries] = useState<IndexEntry[]>([]);
	const [primaryLetters, setPrimaryLetters] = useState<string[]>([]);
	const [selectedLetter, setSelectedLetter] = useState<string | null>(() => {
		return sessionStorage.getItem("dict-letter");
	});
	const [secondaryPrefixes, setSecondaryPrefixes] = useState<string[]>([]);
	const [selectedPrefix, setSelectedPrefix] = useState<string | null>(() => {
		return sessionStorage.getItem("dict-prefix");
	});
	const [filteredEntries, setFilteredEntries] = useState<IndexEntry[]>([]);

	// Search state
	const [searchQuery, setSearchQuery] = useState(() => {
		return sessionStorage.getItem("dict-search") || "";
	});
	const [searchScope, setSearchScope] = useState<SearchScope>(() => {
		return (sessionStorage.getItem("dict-scope") as SearchScope) || "headwords";
	});
	const [searchResults, setSearchResults] = useState<IndexEntry[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Book view state (infinite scroll)
	const [displayedCount, setDisplayedCount] = useState(BATCH_SIZE);
	const [definitionCache, setDefinitionCache] = useState<Map<string, StructuredDefinition[]>>(new Map());
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState("");

	const bookViewRef = useRef<HTMLDivElement>(null);
	const debounceTimer = useRef<number | null>(null);
	const searchResultRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	// --- Load settings ---
	useEffect(() => {
		const keys = ["theme", "fontSize", "seldTransliterateHeadwords", "seldTransliterateDefinitions"];
		browser.storage.local.get(keys).then((res) => {
			if (res.theme) setTheme(res.theme as any);
			if (res.fontSize) setFontSize(res.fontSize as number);
			if (res.seldTransliterateHeadwords !== undefined) setTransliterateHeadwords(res.seldTransliterateHeadwords as boolean);
			if (res.seldTransliterateDefinitions !== undefined) setTransliterateDefinitions(res.seldTransliterateDefinitions as boolean);
		});

		const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
			if (namespace === "local") {
				if (changes.theme) setTheme(changes.theme.newValue);
				if (changes.fontSize) setFontSize(changes.fontSize.newValue);
				if (changes.seldTransliterateHeadwords) setTransliterateHeadwords(changes.seldTransliterateHeadwords.newValue);
				if (changes.seldTransliterateDefinitions) setTransliterateDefinitions(changes.seldTransliterateDefinitions.newValue);
			}
		};

		browser.storage.onChanged.addListener(handleStorageChange);
		return () => browser.storage.onChanged.removeListener(handleStorageChange);
	}, []);

	// --- Load dictionary entries ---
	useEffect(() => {
		stardict.getAllEntries().then(entries => {
			// Deduplicate by word
			const seen = new Set<string>();
			const unique: IndexEntry[] = [];
			for (const e of entries) {
				if (!seen.has(e.word) && !e.word.startsWith("-")) {
					seen.add(e.word);
					unique.push(e);
				}
			}
			setAllEntries(unique);

			// Build primary letter set from actual entries
			const letters = new Set<string>();
			for (const e of unique) {
				if (e.word.length > 0) {
					letters.add(e.word.charAt(0));
				}
			}
			// Sort Sinhala letters by Unicode code point
			setPrimaryLetters(Array.from(letters).sort((a, b) => a.localeCompare(b, "si")));
		});
	}, []);

	// --- Build secondary prefixes when primary letter selected ---
	useEffect(() => {
		if (!selectedLetter || allEntries.length === 0) {
			setSecondaryPrefixes([]);
			return;
		}

		const prefixes = new Set<string>();
		for (const e of allEntries) {
			if (e.word.startsWith(selectedLetter)) {
				prefixes.add(e.word.substring(0, 2));
			}
		}

		const isVowelSign = (char: string) => {
			if (!char) return false;
			const code = char.charCodeAt(0);
			return (
				code === 0x0D82 || // Anusvara
				code === 0x0D83 || // Visarga
				code === 0x0DCA || // Hal Kirima
				(code >= 0x0DCF && code <= 0x0DDF) || // Vowel signs
				(code >= 0x0DF2 && code <= 0x0DF3)    // Vowel signs
			);
		};

		const sortedPrefixes = Array.from(prefixes).sort((a, b) => {
			if (a === b) return 0;
			if (a.charAt(0) !== b.charAt(0)) return a.localeCompare(b, "si");

			const a2 = a.charAt(1);
			const b2 = b.charAt(1);

			// Length 1 (e.g. "න") should come before length 2 (e.g. "නා")
			if (!a2) return -1;
			if (!b2) return 1;

			const aIsVowel = isVowelSign(a2);
			const bIsVowel = isVowelSign(b2);

			// Vowel signs (like 'ා') should come before consonants (like 'ග')
			if (aIsVowel && !bIsVowel) return -1;
			if (!aIsVowel && bIsVowel) return 1;

			return a.localeCompare(b, "si");
		});

		// Filter out the primary letter itself if it's in the list (already covered by "All")
		setSecondaryPrefixes(sortedPrefixes.filter(p => p !== selectedLetter));
	}, [selectedLetter, allEntries]);

	// --- Filter entries for browse ---
	useEffect(() => {
		if (view !== "browse") return;

		const prefix = selectedPrefix || selectedLetter;
		if (!prefix) {
			setFilteredEntries([]);
			setDisplayedCount(BATCH_SIZE);
			return;
		}

		const filtered = allEntries.filter(e => e.word.startsWith(prefix));
		setFilteredEntries(filtered);
		setDisplayedCount(BATCH_SIZE);

		// Reset scroll
		if (bookViewRef.current) bookViewRef.current.scrollTop = 0;
	}, [selectedLetter, selectedPrefix, allEntries, view]);

	// --- Session storage persistence ---
	useEffect(() => { sessionStorage.setItem("dict-view", view); }, [view]);
	useEffect(() => { sessionStorage.setItem("dict-letter", selectedLetter || ""); }, [selectedLetter]);
	useEffect(() => { sessionStorage.setItem("dict-prefix", selectedPrefix || ""); }, [selectedPrefix]);
	useEffect(() => { sessionStorage.setItem("dict-search", searchQuery); }, [searchQuery]);
	useEffect(() => { sessionStorage.setItem("dict-scope", searchScope); }, [searchScope]);

	// --- Search with debounce ---
	const performSearch = useCallback(async (q: string) => {
		if (!q.trim()) {
			setSearchResults([]);
			setIsSearching(false);
			return;
		}
		setIsSearching(true);

		let results: IndexEntry[];
		if (searchScope === "headwords") {
			results = await stardict.searchWords(q, 200);
		} else {
			results = await stardict.searchFullText(q, 200);
		}
		setSearchResults(results);
		setDisplayedCount(BATCH_SIZE);
		setIsSearching(false);
		if (bookViewRef.current) bookViewRef.current.scrollTop = 0;
	}, [searchScope]);

	useEffect(() => {
		if (view !== "search") return;
		if (debounceTimer.current) clearTimeout(debounceTimer.current);
		debounceTimer.current = window.setTimeout(() => {
			performSearch(searchQuery);
		}, 300);
		return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
	}, [searchQuery, searchScope, view, performSearch]);

	// --- Infinite scroll ---
	const handleScroll = useCallback(() => {
		const el = bookViewRef.current;
		if (!el) return;
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
			setDisplayedCount(prev => prev + BATCH_SIZE);
		}
	}, []);

	// --- Fetch definitions for visible entries ---
	const currentEntries = view === "browse" ? filteredEntries : searchResults;
	const visibleEntries = useMemo(() => currentEntries.slice(0, displayedCount), [currentEntries, displayedCount]);

	useEffect(() => {
		const fetchDefs = async () => {
			const newCache = new Map(definitionCache);
			let changed = false;
			for (const entry of visibleEntries) {
				if (!newCache.has(entry.word)) {
					const def = await stardict.getDefinition(entry.word);
					if (def) {
						newCache.set(entry.word, def);
						changed = true;
					}
				}
			}
			if (changed) setDefinitionCache(new Map(newCache));
		};
		fetchDefs();
	}, [visibleEntries]);

	// --- Handlers ---
	const handleSpeak = (text: string) => {
		if (!text) return;
		browser.runtime
			.sendMessage({ action: "GET_TTS_AUDIO", text, tl: "si" })
			.then((response: any) => {
				if (response.audioData) {
					const audio = new Audio(`data:audio/mpeg;base64,${response.audioData}`);
					audio.play().catch(e => console.error("TTS Playback error:", e));
				}
			})
			.catch(e => console.error("Error communicating with background for TTS:", e));
	};

	const handleCopy = async (targetWord: string, specificDefBlock?: string | string[]) => {
		if (!targetWord || !specificDefBlock) return;
		try {
			const { htmlContent, plainText } = getCopyText(targetWord, specificDefBlock);
			const blobHtml = new Blob([htmlContent], { type: "text/html" });
			const blobText = new Blob([plainText], { type: "text/plain" });
			await navigator.clipboard.write([new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })]);
			setToastMessage("Entry copied!");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
			setToastMessage("Failed to copy");
			setShowToast(true);
			setTimeout(() => setShowToast(false), 2000);
		}
	};

	const handleWordClick = (word: string) => {
		setView("search");
		setSearchQuery(word);
	};

	const scrollToEntry = (word: string) => {
		const el = searchResultRefs.current.get(word);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const handleLetterClick = (letter: string) => {
		setSelectedLetter(letter);
		setSelectedPrefix(null);
	};

	const themeClass = theme === "system"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme")
		: (theme === "dark" ? "dark-theme" : "light-theme");

	return (
		<div className={`dict-explorer seld-theme-vars ${themeClass}`} style={{ "--font-size-percent": `${fontSize}%` } as any}>
			{/* Left Sidebar */}
			<aside className="dict-sidebar">
				{/* <div className="dict-sidebar-header">
					<h2>SELD Explorer</h2>
				</div> */}
				<div className="dict-tabs">
					<button className={`dict-tab ${view === "browse" ? "active" : ""}`} onClick={() => setView("browse")}>
						Browse
					</button>
					<button className={`dict-tab ${view === "search" ? "active" : ""}`} onClick={() => setView("search")}>
						Search
					</button>
				</div>

				<div className="dict-sidebar-body custom-scroll">
					{view === "browse" && (
						<div className="browse-panel">
							<div className="alphabet-grid">
								{primaryLetters.map(letter => (
									<button
										key={letter}
										className={`alphabet-btn ${selectedLetter === letter ? "active" : ""}`}
										onClick={() => handleLetterClick(letter)}
									>
										{letter}
									</button>
								))}
							</div>

							{selectedLetter && secondaryPrefixes.length > 0 && (
								<div className="secondary-filter">
									<div className="secondary-label">Refine: {selectedLetter}…</div>
									<div className="secondary-grid">
										<button
											className={`secondary-btn ${selectedPrefix === null ? "active" : ""}`}
											onClick={() => setSelectedPrefix(null)}
										>
											All
										</button>
										{secondaryPrefixes.map(prefix => (
											<button
												key={prefix}
												className={`secondary-btn ${selectedPrefix === prefix ? "active" : ""}`}
												onClick={() => setSelectedPrefix(prefix)}
											>
												{prefix}
											</button>
										))}
									</div>
								</div>
							)}

							{selectedLetter && (
								<div className="browse-count">
									{filteredEntries.length} entries
								</div>
							)}
						</div>
					)}

					{view === "search" && (
						<div className="search-panel">
							<input
								type="text"
								className="dict-search-input"
								placeholder="Search dictionary..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								autoFocus
							/>
							<div className="search-scope-toggle">
								<button
									className={`scope-btn ${searchScope === "headwords" ? "active" : ""}`}
									onClick={() => setSearchScope("headwords")}
								>
									Headwords
								</button>
								<button
									className={`scope-btn ${searchScope === "fulltext" ? "active" : ""}`}
									onClick={() => setSearchScope("fulltext")}
								>
									Full Text
								</button>
							</div>

							{isSearching && <div className="search-status">Searching...</div>}

							<div className="search-results-list custom-scroll">
								{searchResults.map((entry, idx) => (
									<div
										key={idx}
										className="headword-item"
										onClick={() => scrollToEntry(entry.word)}
									>
										{entry.word}
									</div>
								))}
								{!isSearching && searchQuery.trim() && searchResults.length === 0 && (
									<div className="no-results">No results found</div>
								)}
							</div>
						</div>
					)}
				</div>
			</aside>

			{/* Main Content: Book View */}
			<main className="dict-book-view custom-scroll dynamic-font" ref={bookViewRef} onScroll={handleScroll}>
				<div className="book-view-inner">
					{visibleEntries.length === 0 && !isSearching && (
						<div className="dict-empty-state">
							{view === "browse"
								? "Select a letter from the alphabet to browse entries."
								: searchQuery.trim()
									? "No matching entries found."
									: "Type a search query to find entries."}
						</div>
					)}

					{visibleEntries.map((entry, idx) => {
						const defs = definitionCache.get(entry.word);
						return (
							<div
								key={`${entry.word}-${idx}`}
								className="book-entry-card"
								ref={el => { if (el) searchResultRefs.current.set(entry.word, el); }}
							>
								{defs ? (
									<DefinitionCard
										word={entry.word}
										definition={defs}
										transliterateHeadwords={transliterateHeadwords}
										transliterateDefinitions={transliterateDefinitions}
										onWordClick={handleWordClick}
										onSpeakClick={handleSpeak}
										onCopyClick={handleCopy}
										searchQuery={view === "search" ? searchQuery : undefined}
									/>
								) : (
									<div className="loading-card">
										<div className="loading-word">{entry.word}</div>
										<div className="loading-skeleton"></div>
									</div>
								)}
							</div>
						);
					})}

					{displayedCount < currentEntries.length && (
						<div className="load-more-indicator">Loading more entries...</div>
					)}
				</div>
			</main>

			{/* Toast */}
			{showToast && <div className="dict-toast">{toastMessage}</div>}
		</div>
	);
}
