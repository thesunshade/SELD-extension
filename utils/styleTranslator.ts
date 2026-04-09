export const htmlToFormattedText = (html: string, asMarkdown: boolean): string => {
	const doc = new DOMParser().parseFromString(html, "text/html");

	const processNode = (node: Node, parentBold: boolean = false, parentItalic: boolean = false): string => {
		if (node.nodeType === Node.TEXT_NODE) {
			return node.textContent || "";
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const element = node as HTMLElement;
			const tagName = element.tagName.toLowerCase();
			let text = "";

			if (element.classList.contains("clickable-word")) {
				Array.from(node.childNodes).forEach(child => text += processNode(child, parentBold, parentItalic));
				return text;
			}

			if (element.classList.contains("examplescontents")) {
				let childExamples = Array.from(element.children).filter(child => child.classList.contains("examplescontent"));
				let prefix = "";
				if (childExamples.length > 1) {
					prefix = "Examples:\n";
				} else if (childExamples.length === 1) {
					prefix = "Example:\n";
				}
				
				text += prefix;
				Array.from(node.childNodes).forEach(child => text += processNode(child, parentBold, parentItalic));
				return "\n\n" + text + "\n\n";
			}

			if (element.classList.contains("examplescontent")) {
				Array.from(node.childNodes).forEach(child => text += processNode(child, parentBold, parentItalic));
				if (asMarkdown) {
					return `- ${text.trim()}\n`;
				}
				return text + "\n";
			}

			let elementBold = tagName === "b" || tagName === "strong" || element.style.fontWeight === "bold";
			let elementItalic = tagName === "i" || tagName === "em" || element.style.fontStyle === "italic" || tagName === "u";

			// Some elements use inline styles to override
			if (element.style.fontWeight === "normal") elementBold = false;
			if (element.style.fontStyle === "normal") elementItalic = false;

			const isBold = parentBold || elementBold;
			const isItalic = parentItalic || elementItalic;

			Array.from(node.childNodes).forEach(child => text += processNode(child, isBold, isItalic));

			if (tagName === "br") return "\n";
			if (tagName === "p" || tagName === "div" || tagName === "li") {
				text = text + "\n";
			}
			if (tagName === "hr") {
				return "\n\n---\n\n";
			}

			if (asMarkdown) {
				const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
				if (match) {
					const [, leading, content, trailing] = match;
					if (content.length > 0) {
						const introducesBold = isBold && !parentBold;
						const introducesItalic = isItalic && !parentItalic;

						if (introducesBold && introducesItalic) {
							text = `${leading}**_${content}_**${trailing}`;
						} else if (introducesBold) {
							text = `${leading}**${content}**${trailing}`;
						} else if (introducesItalic) {
							text = `${leading}_${content}_${trailing}`;
						}
					}
				}
			}

			return text;
		}

		return "";
	};

	let result = processNode(doc.body);
	
	if (asMarkdown) {
		// Strip out nested/redundant stylistic encodings just in case
		result = result.replace(/_{2,}/g, "_");
		result = result.replace(/\*{3,}/g, "**");
	}

	// Cleanup multiple newlines that might result from block conversions
	result = result.replace(/\n{3,}/g, "\n\n").trim();
	return result;
};
