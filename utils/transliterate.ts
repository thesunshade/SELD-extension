export function transliterateSinhala(text: string): string {
	const vowelMapping: Record<string, string> = {
		අ: "a",
		ආ: "ā",
		ඇ: "æ",
		ඈ: "ǣ",
		ඉ: "i",
		ඊ: "ī",
		උ: "u",
		ඌ: "ū",
		ඍ: "ṛ",
		ඎ: "ṝ",
		ඏ: "ḷ",
		ඐ: "ḹ",
		එ: "e",
		ඒ: "ē",
		ඓ: "ai",
		ඔ: "o",
		ඕ: "ō",
		ඖ: "au",
	};

	const consonantMapping: Record<string, string> = {
		ක: "k",
		ඛ: "kh",
		ග: "g",
		ඝ: "gh",
		ඞ: "ṅ",
		ඟ: "n̆g",
		ච: "c",
		ඡ: "ch",
		ජ: "j",
		ඣ: "jh",
		ඤ: "ñ",
		ඥ: "jñ",
		ඦ: "n̆j",
		ට: "ṭ",
		ඨ: "ṭh",
		ඩ: "ḍ",
		ඪ: "ḍh",
		ණ: "ṇ",
		ඬ: "n̆ḍ",
		ත: "t",
		ථ: "th",
		ද: "d",
		ධ: "dh",
		න: "n",
		ඳ: "n̆d",
		ප: "p",
		ඵ: "ph",
		බ: "b",
		භ: "bh",
		ම: "m",
		ඹ: "n̆b",
		ය: "y",
		ර: "r",
		ල: "l",
		ව: "v",
		ශ: "ś",
		ෂ: "ṣ",
		ස: "s",
		හ: "h",
		ළ: "ḷ",
		ෆ: "f",
	};

	const diacriticMapping: Record<string, string> = {
		"\u0DCA": "",
		"\u0DCF": "ā",
		"\u0DD0": "æ",
		"\u0DD1": "ǣ",
		"\u0DD2": "i",
		"\u0DD3": "ī",
		"\u0DD4": "u",
		"\u0DD6": "ū",
		"\u0DD8": "ṛ",
		"\u0DD9": "e",
		"\u0DDA": "ē",
		"\u0DDB": "ai",
		"\u0DDC": "o",
		"\u0DDD": "ō",
		"\u0DDE": "au",
	};

	let result = "";
	for (let i = 0; i < text.length; i++) {
		let char = text[i];
		let nextChar = text[i + 1];

		if (vowelMapping[char]) {
			result += vowelMapping[char];
		} else if (consonantMapping[char]) {
			let baseTranslit = consonantMapping[char];

			if (nextChar === "ං") {
				result += baseTranslit + "aṃ";
				i++;
			} else if (nextChar === "ඃ") {
				result += baseTranslit + "aḥ";
				i++;
			} else if (nextChar === "\u0DCA") {
				result += baseTranslit;
				i++;
			} else if (nextChar && diacriticMapping[nextChar] !== undefined) {
				result += baseTranslit + diacriticMapping[nextChar];
				i++;
			} else {
				result += baseTranslit + "a";
			}
		} else if (char === "ං") {
			result += "ṃ";
		} else if (char === "ඃ") {
			result += "ḥ";
		} else {
			result += char;
		}
	}
	return result;
}
