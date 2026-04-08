import React, { useState } from 'react';


const AlphabetSets = () => {
	const [activeSet, setActiveSet] = useState('amiśra');

	const sets = {
		amiśra: [
			'අ', 'ආ', 'ඇ', 'ඈ', 'ඉ', 'ඊ', 'උ', 'ඌ', 'එ', 'ඒ', 'ඔ', 'ඕ',
			'ක', 'ග', 'ජ', 'ට', 'ඩ', 'ණ', 'ත', 'ද', 'න', 'ප', 'බ', 'ම',
			'ය', 'ර', 'ළ', 'ල', 'ව', 'ස', 'හ', 'ං'
		],
		miśra: [
			'අ', 'ආ', 'ඇ', 'ඈ', 'ඉ', 'ඊ', 'උ', 'ඌ', 'ඍ', 'ඎ', 'එ', 'ඒ', 'ඓ', 'ඔ', 'ඕ', 'ඖ',
			'ක', 'ඛ', 'ග', 'ඝ', 'ඞ', 'ඟ', 'ච', 'ඡ', 'ජ', 'ඣ', 'ඤ', 'ඥ', 'ඦ',
			'ට', 'ඨ', 'ඩ', 'ඪ', 'ණ', 'ඬ', 'ත', 'ථ', 'ද', 'ධ', 'න', 'ඳ', 'ප', 'ඵ', 'බ', 'භ', 'ම', 'ඹ',
			'ය', 'ර', 'ළ', 'ල', 'ව', 'ශ', 'ෂ', 'ස', 'හ', 'ං'
		],
		modern: [
			'අ', 'ආ', 'ඇ', 'ඈ', 'ඉ', 'ඊ', 'උ', 'ඌ', 'එ', 'ඒ', 'ඓ', 'ඔ', 'ඕ', 'ඖ',
			'ක', 'ග', 'ච', 'ජ', 'ට', 'ඩ', 'ණ', 'ත', 'ද', 'න', 'ප', 'බ', 'ම', 'ය', 'ර', 'ල', 'ව', 'ස', 'හ', 'ං', 'ෆ'
		],
		obsolete: ['ඏ', 'ඐ', 'ඍ', 'ඎ', 'ඦ']
	};

	const getCellClass = (content) => {
		if (!content || content.trim() === "") return "";
		const isMember = sets[activeSet].some(char => content.includes(char));
		return isMember ? "emphasized" : "de-emphasized";
	};

	// 02.අමිශ්‍ර සිංහල හෝඩිය

	// 03.මිශ්‍ර සිංහල හෝඩිය

	// 04.නූතන සිංහල හෝඩිය

	return (
		<div className="alphabet-container seld-theme-vars">
			<div >
				<div className="controls">
					{['amiśra', 'miśra', 'modern', 'obsolete'].map((set) => (
						<button
							key={set}
							className={`seld-btn seld-btn-secondary ${activeSet === set ? 'active' : ''}`}
							onClick={() => setActiveSet(set)}
						>
							{set.charAt(0).toUpperCase() + set.slice(1)}
						</button>
					))}
				</div>
				<div id="description" className='description'>
					The Pure Sinhala Alphabet (අමිශ්‍ර සිංහල හෝඩිය) contains no letters used in other languages.
				</div>
				<section className="chart-section">
					<table>
						<tbody>
							<tr className="sinhala">
								{["a අ", "ā ආ", "æ ඇ", "ǣ ඈ", "i ඉ", "ī ඊ", "u උ", "ū ඌ"].map(v => (
									<td key={v} className={getCellClass(v)}>{v}</td>
								))}
							</tr>
						</tbody>
					</table>

					<table className="wide-table">
						<tbody>
							<tr className="sinhala">
								<td className={getCellClass("ඍ")}>ṛi/ṛu ඍ</td>
								<td className={getCellClass("ඎ")}>ṛī/ṛū ඎ</td>
								<td className={getCellClass("ඏ")}>ඏ</td>
								<td className={getCellClass("ඐ")}>ඐ</td>
							</tr>
						</tbody>
					</table>

					<table>
						<tbody>
							<tr className="sinhala">
								{["e එ", "ē ඒ", "ai ඓ", "o ඔ", "ō ඕ", "au ඖ"].map(v => (
									<td key={v} className={getCellClass(v)}>{v}</td>
								))}
							</tr>
						</tbody>
					</table>
				</section>

				<section className="chart-section">
					<table>
						<tbody>
							{[
								{ label: "Gutturals", cells: ["ka ක", "kha ඛ", "ga ග", "gha ඝ", "ṅa ඞ", "n̆ga ඟ"] },
								{ label: "Palatals", cells: ["ca ච", "cha ඡ", "ja ජ", "jha ඣ", "ña ඤ/ඥ", "ඦ"] },
								{ label: "Cerebrals", cells: ["ṭa ට", "ṭha ඨ", "ḍa ඩ", "ḍha ඪ", "ṇa ණ", "n̆ḍ ඬ"] },
								{ label: "Dentals", cells: ["ta ත", "tha ථ", "da ද", "dha ධ", "na න", "n̆da ඳ"] },
								{ label: "Labials", cells: ["pa ප", "pha ඵ", "ba බ", "bha භ", "ma ම", "m̆ba ඹ"] }
							].map(row => (
								<tr key={row.label} className="sinhala">
									{row.cells.map((c, i) => (
										<td key={i} className={getCellClass(c)}>{c}</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="chart-section">
					<table>
						<tbody>
							<tr className="sinhala">
								{["ya ය", "ra ර", "ḷa ළ", "la ල", "va ව"].map(v => (
									<td key={v} className={getCellClass(v)}>{v}</td>
								))}
							</tr>
						</tbody>
					</table>

					<table className="split-table">
						<tbody>
							<tr className="sinhala">
								{["śha ශ", "ṣha ෂ", "sa ස"].map(v => <td key={v} className={getCellClass(v)}>{v}</td>)}
								<td className={getCellClass("ha හ")}>ha හ</td>

								<td className={getCellClass("ං")}>ṁ ං</td>
								<td className={getCellClass("ෆ")}>f ෆ</td>
							</tr>
						</tbody>
					</table>
				</section>
			</div>
		</div>
	);
};

export default AlphabetSets;