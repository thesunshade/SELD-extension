import React, { useEffect, useRef, useState } from "react";
import tippy, { delegate } from "tippy.js";
import "tippy.js/dist/border.css";
import "tippy.js/dist/tippy.css";
import "./DefinitionCard.css";
import { StructuredDefinition } from "../../utils/stardict";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";
import { htmlToFormattedText } from "../../utils/styleTranslator";
import { checkBloom } from "../../utils/bloom-data";
import { CarterFallbackLink } from "./CarterFallbackLink";
import { useGlobalTooltips } from "./useGlobalTooltips";

const isSynthesized = (w?: string) => w && (w.includes(' -') || w.includes('- '));

interface DefinitionCardProps {
	word: string;
	definition: StructuredDefinition[];
	transliterateSinhala: boolean;
	onWordClick: (word: string, fallbackWord?: string) => void;
	onSpeakClick: (word: string) => void;
	onCopyClick: (copyData: { copyText: string; typeName: string }) => void;
	ttsWord?: string;     // Original query for synthesized matches
	searchQuery?: string;
	showExplorerLink?: boolean;
	onExplorerClick?: (word: string) => void;
	isFavorite?: boolean;
	favoritesList?: string[];
	onToggleFavorite?: (word: string) => void;
	autoExpandRefs?: boolean;
	isNested?: boolean;
}

const NestedDefinition: React.FC<{
	word: string;
	onWordClick: (word: string, fallbackWord?: string) => void;
	onSpeakClick: (word: string) => void;
	onCopyClick: (copyData: { copyText: string; typeName: string }) => void;
	transliterateSinhala: boolean;
	autoExpand: boolean;
	favoritesList?: string[];
	onToggleFavorite?: (word: string) => void;
	onExplorerClick?: (word: string) => void;
}> = ({ word, autoExpand, ...props }) => {
	const [isExpanded, setIsExpanded] = useState(autoExpand);
	const [nestedDef, setNestedDef] = useState<StructuredDefinition[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (isExpanded && !nestedDef && !loading) {
			setLoading(true);
			setError(false);
			import("../../utils/stardict").then(({ stardict }) => {
				stardict.getDefinition(word).then(def => {
					if (def && def.length > 0) {
						setNestedDef(def);
					} else {
						setError(true);
					}
					setLoading(false);
				}).catch(() => {
					setError(true);
					setLoading(false);
				});
			});
		}
	}, [isExpanded, word, nestedDef, loading]);

	return (
		<div className="nested-definition">
			<div className="nested-definition-header">
				<span className="nested-word-link" onClick={(e) => {
					e.stopPropagation();
					props.onWordClick(word);
				}}>
					{word}
				</span>
				{props.transliterateSinhala && /[\u0D80-\u0DFF]/.test(word) && (
					<span className="seld-transliteration" style={{ marginLeft: '4px', fontSize: '0.9em', opacity: 0.8 }}>
						[{transliterateSinhalaTxt(word)}]
					</span>
				)}
				<button
					className={`seld-btn seld-btn-ghost nested-toggle-btn ${isExpanded ? "expanded" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						setIsExpanded(!isExpanded);
					}}
				>
					<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="toggle-chevron">
						<polyline points="9 18 15 12 9 6"></polyline>
					</svg>
				</button>
			</div>
			{isExpanded && (
				<div className="nested-definition-content">
					{loading ? (
						<div className="nested-loading">
							<div className="skeleton-line shimmer"></div>
						</div>
					) : error ? (
						<div className="nested-error">Definition not found</div>
					) : nestedDef ? (
						<DefinitionCard
							{...props}
							word={word}
							definition={nestedDef}
							showExplorerLink={false}
							autoExpandRefs={autoExpand}
							isNested={true}
						/>
					) : null}
				</div>
			)}
		</div>
	);
};

const CopyOptionsButton = ({ word, definitionHtml, onCopyClick }: { word: string, definitionHtml: string | string[], onCopyClick: (data: { copyText: string, typeName: string }) => void }) => {
	const btnRef = useRef<HTMLButtonElement>(null);

	const handleOptionClick = (type: number) => {
		const joinedDef = Array.isArray(definitionHtml) ? definitionHtml.join("\n\n<hr/>\n\n") : definitionHtml;
		const plainDef = htmlToFormattedText(joinedDef, false);
		const mdDef = htmlToFormattedText(joinedDef, true);

		switch (type) {
			case 1:
				onCopyClick({ copyText: word, typeName: "Headword Only (Plain)" });
				break;
			case 2:
				onCopyClick({ copyText: plainDef, typeName: "Definition Only (Plain)" });
				break;
			case 3:
				onCopyClick({ copyText: mdDef, typeName: "Definition Only (Markdown)" });
				break;
			case 4:
				onCopyClick({ copyText: `${word}\n\n${plainDef}`, typeName: "Headword & Definition (Plain)" });
				break;
			case 5:
				onCopyClick({ copyText: `${word}\n\n${mdDef}`, typeName: "Headword & Definition (Markdown)" });
				break;
		}
	};

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
					// Hide global tooltips when this opens if any
					const openTippys = document.querySelectorAll('[data-tippy-root]');
					openTippys.forEach(t => {
						if (t !== inst.popper) {
							(t as any)._tippy?.hide();
						}
					});

					// Construct the DOM nodes natively to avoid React unmout bugs inside Vanilla Tippy
					const container = document.createElement('div');
					container.className = "abbrev-tippy-container";

					const createOption = (label: string, type: number) => {
						const btn = document.createElement('button');
						btn.className = "seld-btn seld-btn-ghost abbrev-tippy-option";
						btn.textContent = label;
						btn.onclick = () => {
							handleOptionClick(type);
							inst.hide();
						};
						return btn;
					};

					container.appendChild(createOption("Headword Only (Plain)", 1));
					container.appendChild(createOption("Definition Only (Plain)", 2));
					container.appendChild(createOption("Definition Only (Markdown)", 3));
					container.appendChild(createOption("Headword & Definition (Plain)", 4));
					container.appendChild(createOption("Headword & Definition (Markdown)", 5));

					inst.setContent(container);
				}
			});
			return () => instance.destroy();
		}
	}, [word, definitionHtml, onCopyClick]);

	return (
		<button
			ref={btnRef}
			title="Copy Formatting Options"
			className="seld-btn seld-btn-secondary seld-btn-icon-circle copy-button"
		>
			<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
				<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
			</svg>
		</button>
	);
};

export const DefinitionCard: React.FC<DefinitionCardProps> = ({
	word,
	definition,
	transliterateSinhala,
	onWordClick,
	onSpeakClick,
	onCopyClick,
	searchQuery,
	ttsWord,
	showExplorerLink,
	onExplorerClick,
	isFavorite,
	favoritesList,
	onToggleFavorite,
	autoExpandRefs = false,
	isNested = false
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	useGlobalTooltips(containerRef);

	useEffect(() => {
		let tippyInstances: any[] = [];
		let abbrevMap: Record<string, any> | null = null;
		let abortController = new AbortController();

		async function initTippy() {
			try {
				const url = browser.runtime.getURL("/abbreviations.json");
				const res = await fetch(url, { signal: abortController.signal });
				abbrevMap = await res.json();

				if (!containerRef.current || abortController.signal.aborted) {
					return;
				}

				// console.log("[Tippy] Initializing delegate on container:", containerRef.current);

				const instances = delegate(containerRef.current, {
					arrow: true,
					target: '.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .complexformtype',
					interactive: true,
					allowHTML: true,
					trigger: 'click', // show on click
					appendTo: () => {
						const el = containerRef.current;
						if (el) {
							const root = el.closest('.seld-theme-vars');
							if (root) return root as HTMLElement;
						}
						return document.body;
					},
					onShow(instance) {
						const el = instance.reference as HTMLElement;
						const rawText = el.textContent;
						if (!rawText) return false;

						const normalizedText = normalizeAbbrev(rawText);

						let groupName = Array.from(el.classList).find(c =>
							['partofspeech', 'usage', 'language', 'variantentrytype', 'ownertype_abbreviation', 'complexformtype'].includes(c)
						);
						if (!groupName) return false;
						if (!rawText || !abbrevMap) {
							return false;
						}

						const groupMap = abbrevMap[groupName];
						if (!groupMap) return false;

						// find match by normalized key
						const matchKey = Object.keys(groupMap).find(
							key => normalizeAbbrev(key) === normalizedText
						);

						if (!matchKey) {
							console.warn(`[Tippy] Failed match: "${rawText}" → "${normalizedText}" not found in group "${groupName}".`);
							return false;
						}

						const data = groupMap[matchKey];



						const content = document.createElement('div');

						// Header line with term and abbreviation
						const header = document.createElement('div');
						header.className = "abbrev-tippy-header";

						const strong = document.createElement('strong');
						strong.className = "abbrev-tippy-title";
						strong.textContent = data.fullTerm;

						const span = document.createElement('span');
						span.className = "abbrev-tippy-meta";
						span.textContent = ` (${data.abbreviation})`;

						header.appendChild(strong);
						header.appendChild(span);
						content.appendChild(header);

						// Description if available
						if (data.description) {
							const desc = document.createElement('div');
							desc.className = "abbrev-tippy-desc";
							desc.textContent = data.description;
							content.appendChild(desc);
						}

						// Close button
						const closeBtn = document.createElement('button');
						closeBtn.className = 'tippy-close-btn abbrev-tippy-close';

						const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
						svg.setAttribute('width', '14');
						svg.setAttribute('height', '14');
						svg.setAttribute('viewBox', '0 0 24 24');
						svg.setAttribute('fill', 'none');
						svg.setAttribute('stroke', 'currentColor');
						svg.setAttribute('strokeWidth', '2');

						const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
						path.setAttribute('d', 'M18 6L6 18M6 6l12 12');
						svg.appendChild(path);

						closeBtn.appendChild(svg);
						closeBtn.addEventListener('click', (e: MouseEvent) => {
							e.stopPropagation();
							instance.hide();
						});
						content.appendChild(closeBtn);

						instance.setContent(content);
					}
				});

				tippyInstances.push(instances);

			} catch (err) {
				if (!abortController.signal.aborted) {
					console.error("Failed to load abbreviations.json", err);
				}
			}
		}

		const normalizeAbbrev = (str: string) => {
			return str
				.trim()
				.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '') // strip leading/trailing punctuation + spaces
				.toLowerCase();
		};

		initTippy();

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const matched = target.closest('.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .complexformtype');

			if (matched && containerRef.current?.contains(matched)) {
				e.stopPropagation();
				e.preventDefault();
			}
		};

		if (containerRef.current) {
			containerRef.current.addEventListener('click', handleClick, false);
		}

		return () => {
			abortController.abort();
			tippyInstances.forEach(inst => {
				if (Array.isArray(inst)) inst.forEach(i => i.destroy());
				else inst.destroy();
			});
			if (containerRef.current) {
				containerRef.current.removeEventListener('click', handleClick, false);
			}
		};
	}, []);

	const renderTextWithClicks = (text: string, isRef: boolean = false) => {
		const tokens = text.split(/([^a-zA-Z\u0D80-\u0DFF\u200D\u200C]+)/).filter(Boolean);
		const elements: React.ReactNode[] = [];

		let i = 0;
		while (i < tokens.length) {
			const token = tokens[i];
			const isWord = /[a-zA-Z\u0D80-\u0DFF\u200D\u200C]/.test(token);
			const isSinhala = /[\u0D80-\u0DFF\u200D\u200C]/.test(token);
			const isEnglish = isWord && !isSinhala;

			if (isSinhala) {
				let lastSinhalaIndex = i;
				for (let j = i + 1; j < tokens.length; j++) {
					const nextToken = tokens[j];
					if (/[a-zA-Z\u0D80-\u0DFF]/.test(nextToken)) {
						if (/[\u0D80-\u0DFF]/.test(nextToken)) {
							lastSinhalaIndex = j;
						} else {
							break;
						}
					}
				}

				let phraseForTranslit = "";
				for (let k = i; k <= lastSinhalaIndex; k++) {
					const t = tokens[k];
					phraseForTranslit += t;
					if (/[a-zA-Z\u0D80-\u0DFF]/.test(t)) {
						let compoundSearchTarget = t;
						let hasCompound = false;

						// Try up to 4 words from the tokens array
						const compoundsText: string[] = [];
						let tokenWords: string[] = [];
						let wordIndices: number[] = [];
						for (let idx = 0; idx < tokens.length; idx++) {
							if (/[a-zA-Z\u0D80-\u0DFF]/.test(tokens[idx])) {
								tokenWords.push(tokens[idx]);
								wordIndices.push(idx);
							}
						}

						const wordIndexInTokens = wordIndices.indexOf(k);
						if (wordIndexInTokens !== -1) {
							for (let size = 4; size >= 2; size--) {
								for (let step = 0; step < size; step++) {
									const startIdx = wordIndexInTokens - step;
									const endIdx = startIdx + size - 1;
									if (startIdx >= 0 && endIdx < tokenWords.length) {
										compoundsText.push(tokenWords.slice(startIdx, endIdx + 1).join(' '));
									}
								}
							}
						}

						for (const c of compoundsText) {
							if (checkBloom(c)) {
								compoundSearchTarget = c;
								hasCompound = true;
								break;
							}
						}

						elements.push(
							isRef ? (
								<NestedDefinition
									key={k}
									word={compoundSearchTarget}
									autoExpand={autoExpandRefs}
									onWordClick={onWordClick}
									onSpeakClick={onSpeakClick}
									onCopyClick={onCopyClick}
									transliterateSinhala={transliterateSinhala}
									favoritesList={favoritesList}
									onToggleFavorite={onToggleFavorite}
									onExplorerClick={onExplorerClick}
								/>
							) : (
								<span
									key={k}
									className="clickable-word"
									onClick={e => {
										e.stopPropagation();
										onWordClick(compoundSearchTarget, hasCompound ? t : undefined);
									}}>
									{highlightText(t)}
								</span>
							)
						);
					} else {
						elements.push(<span key={k}>{t}</span>);
					}
				}

				if (transliterateSinhala && !isRef) {
					elements.push(
						<span key={`t-${i}`} className="seld-transliteration">
							{" "}
							[{transliterateSinhalaTxt(phraseForTranslit.trim())}]
						</span>
					);
				}

				i = lastSinhalaIndex + 1;
			} else if (isEnglish) {
				elements.push(
					isRef ? (
						<NestedDefinition
							key={i}
							word={token}
							autoExpand={autoExpandRefs}
							onWordClick={onWordClick}
							onSpeakClick={onSpeakClick}
							onCopyClick={onCopyClick}
							transliterateSinhala={transliterateSinhala}
							favoritesList={favoritesList}
							onToggleFavorite={onToggleFavorite}
							onExplorerClick={onExplorerClick}
						/>
					) : (
						<span
							key={i}
							className="clickable-word"
							onClick={e => {
								e.stopPropagation();
								onWordClick(token);
							}}>
							{highlightText(token)}
						</span>
					)
				);
				i++;
			} else {
				elements.push(<span key={i}>{token}</span>);
				i++;
			}
		}
		return elements;
	};

	// Helper to highlight simple search terms
	const highlightText = (text: string) => {
		if (!searchQuery) return text;

		// Simple case-insensitive highlight
		const regex = new RegExp(`(${searchQuery})`, 'gi');
		if (!regex.test(text)) return text;

		const parts = text.split(regex);
		return parts.map((part, index) =>
			regex.test(part) ? <span key={index} className="search-highlight">{part}</span> : part
		);
	};

	const renderHtmlDefinition = (html: string) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const styles = doc.querySelectorAll("style, script");
		styles.forEach(s => s.remove());

		const ABBREV_CLASSES = ["partofspeech", "usage", "language", "variantentrytype", "ownertype_abbreviation"];

		const convertNode = (node: Node, key: string, isAbbrev: boolean = false, isRef: boolean = false): React.ReactNode => {
			if (node.nodeType === Node.TEXT_NODE) {
				if (isAbbrev) {
					return <React.Fragment key={key}>{node.textContent}</React.Fragment>;
				}
				return <React.Fragment key={key}>{renderTextWithClicks(node.textContent || "", isRef)}</React.Fragment>;
			}
			if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;
				const tagName = element.tagName.toLowerCase();
				const nodeIsAbbrev = isAbbrev || Array.from(element.classList).some(c => ABBREV_CLASSES.includes(c));
				const nodeIsRef = isRef || element.classList.contains("referencedentry");
				const children = Array.from(element.childNodes).map((child, i) => convertNode(child, `${key}-${i}`, nodeIsAbbrev, nodeIsRef));

				if (element.style && element.style.color) {
					element.style.color = "";
				}

				switch (tagName) {
					case "br": return <br key={key} />;
					case "hr": return <hr key={key} className={element.className} />;
					case "b":
					case "strong": return <strong key={key} className={element.className}>{children}</strong>;
					case "i":
					case "em": return <em key={key} className={element.className}>{children}</em>;
					case "u": return <u key={key} className={element.className}>{children}</u>;
					case "p": return <p key={key} className={element.className}>{children}</p>;
					case "div": return <div key={key} className={element.className}>{children}</div>;
					case "span": return <span key={key} className={element.className}>{children}</span>;
					case "ul": return <ul key={key} className={element.className}>{children}</ul>;
					case "li": return <li key={key} className={element.className}>{children}</li>;
					case "font": return <span key={key} className={element.className}>{children}</span>;
					case "a":
						const wordToLink = element.textContent || "";
						return isRef ? (
							<NestedDefinition
								key={key}
								word={wordToLink}
								autoExpand={autoExpandRefs}
								onWordClick={onWordClick}
								onSpeakClick={onSpeakClick}
								onCopyClick={onCopyClick}
								transliterateSinhala={transliterateSinhala}
								favoritesList={favoritesList}
								onToggleFavorite={onToggleFavorite}
								onExplorerClick={onExplorerClick}
							/>
						) : (
							<span
								key={key}
								className="clickable-word"
								onClick={e => {
									e.stopPropagation();
									onWordClick(wordToLink);
								}}>
								{wordToLink}
							</span>
						);
					default: return <React.Fragment key={key}>{children}</React.Fragment>;
				}
			}
			return null;
		};
		return Array.from(doc.body.childNodes).map((node, i) => convertNode(node, `node-${i}`));
	};

	return (
		<div className={`definition-box${isNested ? " is-nested" : ""}`} ref={containerRef}>
			<h2 className="def-title">
				<div className="def-header-text-container">
					<div className="def-header-row">
						<span>{highlightText(word)}</span>
						{isSynthesized(word) && (
							<span
								className="synthesized-info-dot"
								data-tippy-content="This break down of the word is just an automatic guess based on existing entries in the dictionary. It may or may not be correct."
								data-tippy-delay="0"
							>
								i
							</span>
						)}
					</div>
					{transliterateSinhala && /[\u0D80-\u0DFF]/.test(word || "") && (
						<span className="seld-transliteration def-transliteration-header">
							{transliterateSinhalaTxt(word!)}
						</span>
					)}
				</div>
				<div className="global-actions">
					{showExplorerLink && definition.length === 1 && (
						<button
							className="seld-btn seld-btn-secondary seld-btn-icon-circle explorer-link-button"
							onClick={() => onExplorerClick?.(word!)}
							data-tippy-content="Show in Dictionary Explorer"
						>
							<svg
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="explorer-icon-svg"
							>
								<path d="M12 6C12 6 13.6875 5 16.5 5C19.3125 5 21 6 21 6V19C21 19 19.3125 18 16.5 18C13.6875 18 12 19 12 19V6Z" fill="currentColor" fillOpacity="0" strokeMiterlimit="10" />
								<path d="M3 6C3 6 4.6875 5 7.5 5C10.3125 5 12 6 12 6V19C12 19 10.3125 18 7.5 18C4.6875 18 3 19 3 19V6Z" fill="currentColor" fillOpacity="0" strokeMiterlimit="10" />
							</svg>
						</button>
					)}
					{definition.length === 1 && (
						<button
							className={`seld-btn seld-btn-secondary seld-btn-icon-circle favorite-button ${isFavorite || (favoritesList && favoritesList.includes(word!)) ? "active" : ""}`}
							onClick={() => onToggleFavorite?.(word!)}
							data-tippy-content={(isFavorite || (favoritesList && favoritesList.includes(word!))) ? "Remove from Favorites" : "Add to Favorites"}
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill={(isFavorite || (favoritesList && favoritesList.includes(word!))) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
							</svg>
						</button>
					)}
					{definition.length > 0 && (
						<>
							<a
								href={`https://jotform.com/260678150051452?q2_textbox0=${encodeURIComponent(word || "")}&q4_textbox2=${encodeURIComponent(window.location.href)}`}
								target="_blank"
								rel="noopener noreferrer"
								className="seld-btn seld-btn-secondary seld-btn-icon-circle report-button"
								data-tippy-content="Report an error"
							>
								<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
									<polyline points="22,6 12,13 2,6"></polyline>
								</svg>
							</a>
							<CopyOptionsButton
								word={word!}
								definitionHtml={(() => {
									if (definition.length > 1) {
										return definition.map(b => {
											const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
											const homographs = b.homographDefinitions.join("<hr/>");
											return `${header}${homographs}`;
										});
									}
									return definition[0].homographDefinitions;
								})()}
								onCopyClick={onCopyClick}
							/>
						</>
					)}
					<button className="seld-btn seld-btn-secondary seld-btn-icon-circle tts-button" onClick={() => onSpeakClick(ttsWord || word)} data-tippy-content="Speak word">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
							<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
						</svg>
					</button>
				</div>
			</h2>
			<div className="definition-content">
				{definition.length === 0 ? (
					<div className="not-found-message">
						<div className="not-found-text">Not in the SELD</div>
						<CarterFallbackLink searchTerm={word} />
					</div>
				) : (
					definition.map((block, bIdx) => (
						<div key={bIdx} className="synthesized-section">
							{definition.length > 1 && (
								<div className="synthesized-header">
									<div className="def-header-text-container">
										<div className="def-header-row">
											<span
												className="synthesized-header-text"
												onClick={() => {
													onWordClick(block.headword);
												}}
												data-tippy-content="Search this word">
												{highlightText(block.headword)}
											</span>
											{isSynthesized(block.headword) && (
												<span
													className="synthesized-info-dot"
													data-tippy-content="This break down of the word is just an automatic guess based on existing entries in the dictionary. It may or may not be correct."
													data-tippy-delay="0"
												>
													i
												</span>
											)}
										</div>
										{transliterateSinhala && /[\u0D80-\u0DFF]/.test(block.headword) && (
											<span className="seld-transliteration def-transliteration-header">
												{transliterateSinhalaTxt(block.headword)}
											</span>
										)}
									</div>
									<div className="header-actions-small">
										{showExplorerLink && (
											<button
												className="seld-btn seld-btn-secondary seld-btn-icon-circle explorer-link-button"
												onClick={() => onExplorerClick?.(block.headword)}
												data-tippy-content="Show in Dictionary Explorer"
											>
												<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="explorer-icon-svg">
													<path d="M12 6C12 6 13.6875 5 16.5 5C19.3125 5 21 6 21 6V19C21 19 19.3125 18 16.5 18C13.6875 18 12 19 12 19V6Z" fill="currentColor" fillOpacity="0" strokeMiterlimit="10" />
													<path d="M3 6C3 6 4.6875 5 7.5 5C10.3125 5 12 6 12 6V19C12 19 10.3125 18 7.5 18C4.6875 18 3 19 3 19V6Z" fill="currentColor" fillOpacity="0" strokeMiterlimit="10" />
												</svg>
											</button>
										)}
										<button
											className={`seld-btn seld-btn-secondary seld-btn-icon-circle favorite-button ${(favoritesList && favoritesList.includes(block.headword)) ? "active" : ""}`}
											onClick={() => onToggleFavorite?.(block.headword)}
											data-tippy-content={(favoritesList && favoritesList.includes(block.headword)) ? "Remove from Favorites" : "Add to Favorites"}
										>
											<svg viewBox="0 0 24 24" width="18" height="18" fill={(favoritesList && favoritesList.includes(block.headword)) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
											</svg>
										</button>
										<CopyOptionsButton
											word={block.headword}
											definitionHtml={block.homographDefinitions}
											onCopyClick={onCopyClick}
										/>
										<button className="seld-btn seld-btn-secondary seld-btn-icon-circle tts-button" onClick={() => onSpeakClick(block.headword)} data-tippy-content="Speak word">
											<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
												<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
												<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
											</svg>
										</button>
									</div>
								</div>
							)}

							{block.homographDefinitions.map((homograph, hIdx) => (
								<div key={hIdx}>
									{renderHtmlDefinition(homograph)}
									{hIdx < block.homographDefinitions.length - 1 && <hr className="homograph-separator" />}
								</div>
							))}

							{bIdx < definition.length - 1 && <hr className="synthesized-section-divider" />}
						</div>
					)))}
			</div>
		</div>
	);
}

export default DefinitionCard;
