import React, { useState } from 'react';

interface Vowel {
  trans: string;
  sinhala: string;
  suffix: string;
  diacritic: string;
  highlight?: string[];
}

interface Modifier {
  id: string;
  label: string;
  sinhala: string;
  suffix: string;
  diacritic: string;
  highlight?: string[];
}

interface Consonant {
  trans: string;
  sinhala: string;
}

interface ConsonantGroup {
  name: string;
  consonants: Consonant[];
}

const VOWELS: Vowel[] = [
  { trans: 'no vowel— ', sinhala: '්', suffix: '', diacritic: '\u0DCA', highlight: ['kh', 'ṅ', 'c', 'jh', 'ṭ', 'ḍ', 'n̆ḍ', 'dh', 'b', 'm', 'm̆b', 'v'] },
  { trans: 'a', sinhala: 'අ', suffix: 'a', diacritic: '' },
  { trans: 'ā', sinhala: 'ආ', suffix: 'ā', diacritic: '\u0DCF' },
  { trans: 'æ', sinhala: 'ඇ', suffix: 'æ', diacritic: '\u0DD0', highlight: ['r'] },
  { trans: 'ǣ', sinhala: 'ඈ', suffix: 'ǣ', diacritic: '\u0DD1', highlight: ['r'] },
  { trans: 'i', sinhala: 'ඉ', suffix: 'i', diacritic: '\u0DD2', highlight: ['kh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ṭ', 'ḍ', 'n̆ḍ', 'dh', 'b', 'm', 'm̆b', 'v'] },
  { trans: 'ī', sinhala: 'ඊ', suffix: 'ī', diacritic: '\u0DD3', highlight: ['kh', 'ṅ', 'c', 'ch', 'j', 'jh', 'ṭ', 'ḍ', 'n̆ḍ', 'dh', 'b', 'm', 'm̆b', 'v'] },
  { trans: 'u', sinhala: 'උ', suffix: 'u', diacritic: '\u0DD4', highlight: ['k', 'g', 'n̆g', 'ñ', 'jñ', 't', 'd', 'n̆d', 'bh', 'r', 'ḷ', 'śh'] },
  { trans: 'ū', sinhala: 'ඌ', suffix: 'ū', diacritic: '\u0DD6', highlight: ['k', 'g', 'n̆g', 'ñ', 'jñ', 't', 'd', 'n̆d', 'bh', 'r', 'ḷ', 'śh'] },
  { trans: 'ṛi/ṛu', sinhala: 'ඍ', suffix: 'ṛ', diacritic: '\u0DD8' },
  { trans: 'ṛī/ṛū', sinhala: 'ඎ', suffix: 'ṝ', diacritic: '\u0DF2' },
  { trans: 'e', sinhala: 'එ', suffix: 'e', diacritic: '\u0DD9' },
  { trans: 'ē', sinhala: 'ඒ', suffix: 'ē', diacritic: '\u0DDA', highlight: ['kh', 'ṅ', 'c', 'jh', 'ṭ', 'ḍ', 'n̆ḍ', 'dh', 'b', 'm', 'm̆b', 'v'] },
  { trans: 'ai', sinhala: 'ඓ', suffix: 'ai', diacritic: '\u0DDB' },
  { trans: 'o', sinhala: 'ඔ', suffix: 'o', diacritic: '\u0DDC' },
  { trans: 'ō', sinhala: 'ඕ', suffix: 'ō', diacritic: '\u0DDD' },
  { trans: 'au', sinhala: 'ඖ', suffix: 'au', diacritic: '\u0DDE' },
];

const MODIFIERS: Modifier[] = [
  { id: 'yanshaya', label: 'ya', sinhala: '්‍ය', suffix: 'y', diacritic: '\u0DCA\u200D\u0DBA' },
  { id: 'rakaranshaya', label: 'ra', sinhala: '්‍ර', suffix: 'r', diacritic: '\u0DCA\u200D\u0DBB', highlight: ['ñ', 'jñ', 'd', 'n̆d'] },
];

const GROUPS: ConsonantGroup[] = [
  {
    name: 'Gutturals',
    consonants: [
      { trans: 'k', sinhala: 'ක' }, { trans: 'kh', sinhala: 'ඛ' }, { trans: 'g', sinhala: 'ග' }, { trans: 'gh', sinhala: 'ඝ' }, { trans: 'ṅ', sinhala: 'ඞ' }, { trans: 'n̆g', sinhala: 'ඟ' },
    ],
  },
  {
    name: 'Palatals',
    consonants: [
      { trans: 'c', sinhala: 'ච' }, { trans: 'ch', sinhala: 'ඡ' }, { trans: 'j', sinhala: 'ජ' }, { trans: 'jh', sinhala: 'ඣ' }, { trans: 'ñ', sinhala: 'ඤ' }, { trans: 'jñ', sinhala: 'ඥ' },
    ],
  },
  {
    name: 'Cerebrals',
    consonants: [
      { trans: 'ṭ', sinhala: 'ට' }, { trans: 'ṭh', sinhala: 'ඨ' }, { trans: 'ḍ', sinhala: 'ඩ' }, { trans: 'ḍh', sinhala: 'ඪ' }, { trans: 'ṇ', sinhala: 'ණ' }, { trans: 'n̆ḍ', sinhala: 'ඬ' },
    ],
  },
  {
    name: 'Dentals',
    consonants: [
      { trans: 't', sinhala: 'ත' }, { trans: 'th', sinhala: 'ථ' }, { trans: 'd', sinhala: 'ද' }, { trans: 'dh', sinhala: 'ධ' }, { trans: 'n', sinhala: 'න' }, { trans: 'n̆d', sinhala: 'ඳ' },
    ],
  },
  {
    name: 'Labials',
    consonants: [
      { trans: 'p', sinhala: 'ප' }, { trans: 'ph', sinhala: 'ඵ' }, { trans: 'b', sinhala: 'බ' }, { trans: 'bh', sinhala: 'භ' }, { trans: 'm', sinhala: 'ම' }, { trans: 'm̆b', sinhala: 'ඹ' },
    ],
  },
  {
    name: 'Semivowels',
    consonants: [
      { trans: 'y', sinhala: 'ය' }, { trans: 'r', sinhala: 'ර' }, { trans: 'ḷ', sinhala: 'ළ' }, { trans: 'l', sinhala: 'ල' }, { trans: 'v', sinhala: 'ව' },
    ],
  },
  {
    name: 'Sibilants & Aspiration',
    consonants: [
      { trans: 'ś', sinhala: 'ශ' }, { trans: 'ṣ', sinhala: 'ෂ' }, { trans: 's', sinhala: 'ස' }, { trans: 'h', sinhala: 'හ' },
    ],
  },
];

export default function VowelModifierGrid() {
  const [selectedVowel, setSelectedVowel] = useState<Vowel>(VOWELS[1]); // Default to 'a'
  const [activeModifier, setActiveModifier] = useState<Modifier | null>(null);

  const toggleModifier = (mod: Modifier) => {
    setActiveModifier(activeModifier?.id === mod.id ? null : mod);
  };

  const renderTranslit = (c: Consonant) => {
    if (c.trans === 'r' && activeModifier?.id === 'rakaranshaya') return '';
    return c.trans + (activeModifier ? activeModifier.suffix : '') + selectedVowel.suffix;
  };

  const renderSinhala = (c: Consonant) => {
    if (c.trans === 'r' && activeModifier?.id === 'rakaranshaya') return '';
    return c.sinhala + (activeModifier ? activeModifier.diacritic : '') + selectedVowel.diacritic;
  };

  return (
    <div className="vowel-modifier-grid">
      <div className="interaction-area">
        <div className="vowel-section">

          <div className="vowel-buttons">
            {VOWELS.map((v) => (
              <button
                key={v.trans}
                className={`seld-btn seld-btn-secondary sinhala ${selectedVowel.trans === v.trans ? 'active' : ''}`}
                onClick={() => setSelectedVowel(v)}
              >
                {v.trans} {v.sinhala}
              </button>
            ))}
          </div>
        </div>

        <div className="modifier-section">

          <div className="modifier-buttons">
            {MODIFIERS.map((m) => (
              <button
                key={m.id}
                className={`seld-btn seld-btn-secondary sinhala ${activeModifier?.id === m.id ? 'active' : ''}`}
                onClick={() => toggleModifier(m)}
              >
                {m.label} {m.sinhala}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="consonant-container">
        <table>
          <tbody>
            {GROUPS.map((group, groupIndex) => (
              <tr key={groupIndex} className="sinhala">
                {group.consonants.map((c, colIndex) => {
                  const isHighlighted = (selectedVowel.highlight?.includes(c.trans)) || (activeModifier?.highlight?.includes(c.trans));
                  return (
                    <React.Fragment key={colIndex}>
                      <td className={`translit-cell ${isHighlighted ? 'highlight' : ''}`}>
                        {renderTranslit(c)}
                      </td>
                      <td className={`sinhala-cell ${isHighlighted ? 'highlight' : ''}`}>
                        {renderSinhala(c)}
                      </td>
                    </React.Fragment>
                  );
                })}
                {Array.from({ length: 6 - group.consonants.length }).map((_, i) => (
                  <React.Fragment key={`pad-${i}`}>
                    <td></td>
                    <td></td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
