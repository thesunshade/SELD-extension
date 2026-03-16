import React from "react";
import { StructuredDefinition } from "../../utils/stardict";
import { transliterateSinhala } from "../../utils/transliterate";
import { getFullEntryCopyData } from "../../utils/clipboard";

interface DefinitionCardProps {
	word: string;
	definition: StructuredDefinition[];
	transliterateHeadwords: boolean;
	transliterateDefinitions: boolean;
	onWordClick: (word: string) => void;
	onSpeakClick: (word: string) => void;
	onCopyClick: (targetWord: string, specificDefBlock?: string | string[]) => void;
	searchQuery?: string; // Optional search query for highlighting
	ttsWord?: string;     // Original query for synthesized matches
}

export const DefinitionCard: React.FC<DefinitionCardProps> = ({
	word,
	definition,
	transliterateHeadwords,
	transliterateDefinitions,
	onWordClick,
	onSpeakClick,
	onCopyClick,
	searchQuery,
	ttsWord
}) => {

	const renderTextWithClicks = (text: string) => {
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
						elements.push(
							<span
								key={k}
								className="clickable-word"
								onClick={e => {
									e.stopPropagation();
									onWordClick(t);
								}}>
								{highlightText(t)}
							</span>
						);
					} else {
						elements.push(<span key={k}>{t}</span>);
					}
				}

				if (transliterateDefinitions) {
					elements.push(
						<span key={`t-${i}`} className="seld-transliteration">
							{" "}
							[{transliterateSinhala(phraseForTranslit.trim())}]
						</span>
					);
				}

				i = lastSinhalaIndex + 1;
			} else if (isEnglish) {
				elements.push(
					<span
						key={i}
						className="clickable-word"
						onClick={e => {
							e.stopPropagation();
							onWordClick(token);
						}}>
						{highlightText(token)}
					</span>
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
			regex.test(part) ? <span key={index} style={{ backgroundColor: 'rgba(255, 255, 0, 0.4)' }}>{part}</span> : part
		);
	};

	const renderHtmlDefinition = (html: string) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const styles = doc.querySelectorAll("style, script");
		styles.forEach(s => s.remove());

		const convertNode = (node: Node, key: string): React.ReactNode => {
			if (node.nodeType === Node.TEXT_NODE) return <React.Fragment key={key}>{renderTextWithClicks(node.textContent || "")}</React.Fragment>;
			if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;
				const tagName = element.tagName.toLowerCase();
				const children = Array.from(element.childNodes).map((child, i) => convertNode(child, `${key}-${i}`));

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
					case "p": return <p key={key} className={element.className} style={{ color: "inherit" }}>{children}</p>;
					case "div": return <div key={key} className={element.className} style={{ color: "inherit" }}>{children}</div>;
					case "span": return <span key={key} className={element.className} style={{ color: "inherit" }}>{children}</span>;
					case "ul": return <ul key={key} className={element.className}>{children}</ul>;
					case "li": return <li key={key} className={element.className} style={{ color: "inherit" }}>{children}</li>;
					case "font": return <span key={key} className={element.className} style={{ color: "inherit" }}>{children}</span>;
					default: return <React.Fragment key={key}>{children}</React.Fragment>;
				}
			}
			return null;
		};
		return Array.from(doc.body.childNodes).map((node, i) => convertNode(node, `node-${i}`));
	};

	return (
		<div className="definition-box">
			<h2 className="def-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<span>{word}</span>
					{transliterateHeadwords && /[\u0D80-\u0DFF]/.test(word || "") && (
						<span className="seld-transliteration" style={{ fontSize: "0.6em", fontWeight: "normal", opacity: 0.8, marginTop: "2px" }}>
							{transliterateSinhala(word!)}
						</span>
					)}
				</div>
				<div className="global-actions" style={{ display: "flex", gap: "8px" }}>
					<a
						href={`https://jotform.com/260678150051452?q2_textbox0=${encodeURIComponent(word || "")}&q4_textbox2=${encodeURIComponent(window.location.href)}&existingDefinition=${encodeURIComponent(getFullEntryCopyData(word!, definition!).plainText)}`}
						target="_blank"
						rel="noopener noreferrer"
						className="report-button"
						title="Report an error"
					>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
							<polyline points="22,6 12,13 2,6"></polyline>
						</svg>
					</a>
					<button
						className="copy-button"
						onClick={() => {
							let allDefsHtml: string[] = [];
							if (definition.length > 1) {
								allDefsHtml = definition.map(b => {
									const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
									const homographs = b.homographDefinitions.join("<hr/>");
									return `${header}${homographs}`;
								});
							} else {
								allDefsHtml = definition[0].homographDefinitions;
							}
							onCopyClick(word!, allDefsHtml);
						}}
						title="Copy full entry">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
							<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
						</svg>
					</button>
					<button className="tts-button" onClick={() => onSpeakClick(ttsWord || word)} title="Speak word">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
							<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
						</svg>
					</button>
				</div>
			</h2>
			<div className="definition-content">
				{definition.map((block, bIdx) => (
					<div key={bIdx} className="synthesized-section" style={{ marginBottom: bIdx < definition.length - 1 ? "16px" : "0" }}>
						{definition.length > 1 && (
							<div className="synthesized-header">
								<div style={{ display: "flex", flexDirection: "column" }}>
									<span
										className="synthesized-header-text"
										onClick={() => {
											onWordClick(block.headword);
										}}
										title="Search this word">
										{block.headword}
									</span>
									{transliterateHeadwords && /[\u0D80-\u0DFF]/.test(block.headword) && (
										<span className="seld-transliteration" style={{ fontSize: "0.8em", fontWeight: "normal", opacity: 0.8, marginTop: "2px" }}>
											{transliterateSinhala(block.headword)}
										</span>
									)}
								</div>
								<div style={{ display: "flex", gap: "8px", opacity: 0.8, transform: "scale(0.85)" }}>
									<button className="copy-button" onClick={() => onCopyClick(block.headword, block.homographDefinitions)} title="Copy entry">
										<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
											<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
										</svg>
									</button>
									<button className="tts-button" onClick={() => onSpeakClick(block.headword)} title="Speak word">
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
								{hIdx < block.homographDefinitions.length - 1 && <hr className="homograph-separator" style={{ margin: "8px 0" }} />}
							</div>
						))}

						{bIdx < definition.length - 1 && <hr style={{ margin: "16px 0", border: "none", borderTop: "2px dashed var(--border-color)" }} />}
					</div>
				))}
			</div>
		</div>
	);
}

export default DefinitionCard;
