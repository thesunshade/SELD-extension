import React, { useState } from 'react';

interface Vowel {
  trans: string;
  sinhala: string;
  suffix: string;
  diacritic: string;
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
  { trans: 'no vowel— ', sinhala: '්', suffix: '', diacritic: '\u0DCA' },
  { trans: 'a', sinhala: 'අ', suffix: 'a', diacritic: '' },
  { trans: 'ā', sinhala: 'ආ', suffix: 'ā', diacritic: '\u0DCF' },
  { trans: 'æ', sinhala: 'ඇ', suffix: 'æ', diacritic: '\u0DD0' },
  { trans: 'ǣ', sinhala: 'ඈ', suffix: 'ǣ', diacritic: '\u0DD1' },
  { trans: 'i', sinhala: 'ඉ', suffix: 'i', diacritic: '\u0DD2' },
  { trans: 'ī', sinhala: 'ඊ', suffix: 'ī', diacritic: '\u0DD3' },
  { trans: 'u', sinhala: 'උ', suffix: 'u', diacritic: '\u0DD4' },
  { trans: 'ū', sinhala: 'ඌ', suffix: 'ū', diacritic: '\u0DD6' },
  { trans: 'ṛi/ṛu', sinhala: 'ඍ', suffix: 'ṛ', diacritic: '\u0DD8' },
  { trans: 'ṛī/ṛū', sinhala: 'ඎ', suffix: 'ṝ', diacritic: '\u0DF2' },
  { trans: 'e', sinhala: 'එ', suffix: 'e', diacritic: '\u0DD9' },
  { trans: 'ē', sinhala: 'ඒ', suffix: 'ē', diacritic: '\u0DDA' },
  { trans: 'ai', sinhala: 'ඓ', suffix: 'ai', diacritic: '\u0DDB' },
  { trans: 'o', sinhala: 'ඔ', suffix: 'o', diacritic: '\u0DDC' },
  { trans: 'ō', sinhala: 'ඕ', suffix: 'ō', diacritic: '\u0DDD' },
  { trans: 'au', sinhala: 'ඖ', suffix: 'au', diacritic: '\u0DDE' },
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
      { trans: 'śh', sinhala: 'ශ' }, { trans: 'ṣh', sinhala: 'ෂ' }, { trans: 's', sinhala: 'ස' }, { trans: 'h', sinhala: 'හ' },
    ],
  },
];

export default function VowelModifierGrid() {
  const [selectedVowel, setSelectedVowel] = useState<Vowel>(VOWELS[1]); // Default to 'a'

  const renderTranslit = (c: Consonant) => {
    return c.trans + (selectedVowel.suffix);
  };

  const renderSinhala = (c: Consonant) => {
    return c.sinhala + selectedVowel.diacritic;
  };

  return (
    <div className="vowel-modifier-grid">
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

      <div className="consonant-container">
        <table>
          <tbody>
            {GROUPS.map((group, groupIndex) => (
              <tr key={groupIndex} className="sinhala">
                {group.consonants.map((c, colIndex) => (
                  <React.Fragment key={colIndex}>
                    <td className="translit-cell">
                      {renderTranslit(c)}
                    </td>
                    <td className="sinhala-cell">
                      {renderSinhala(c)}
                    </td>
                  </React.Fragment>
                ))}
                {/* Pad row if it has fewer than 6 consonants to maintain width consistency if needed */}
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
