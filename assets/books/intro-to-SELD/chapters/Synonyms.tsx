import React from 'react';


export const metadata = { title: "Lexical Relations" };

export default function AdvancedUsage() {
  return (
    <div>
      <h2 id="synonyms">Synonyms</h2>
      <ul>
        <li><strong>Synonyms should be grammatically equivalent.</strong> That means that in a sentence you should be able to substitute one for the other and the sentence should be grammatically correct.   </li>
        <li>Synonyms should generally <strong>match in degree</strong>. For example <em>large</em> and <em>gigantic</em> are not synonyms even though they both describe size.   </li>
        <li>Synonyms <strong>need not match in usage</strong>. For example, <em>father</em> and <em>dad</em> are synonyms even though one is more formal than the other. </li>
      </ul>
      <h2 id="compare-relationships">Compare Relationships</h2>
      <p>Unlike synonyms, compare relationships are completely unstructured. They are useful when the Sinhala meaning of two words is completely different even when the English words may be synonyms. It can also show contrasting words when they are not antonyms. </p>

    </div>
  );
}
