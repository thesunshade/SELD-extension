import React from 'react';
import AbbreviationsList from '../../../components/library/AbbreviationsList';

// Using a named export inside the component or default export? We'll rely on the filename / meta for title in TSX, since it doesn't have frontmatter.

export default function Partofspeech() {
  return (
    <div>
      <h2>Parts of Speech</h2>
      <p>Some parts of speech corrispond well to those found in English, e.g. noun, verb, adjective. However some terms are different from their English usage, e.g. infinitive.</p>
      <p>When viewing a definition, click on the abbreviation to see the explainations.</p>
      <AbbreviationsList partofspeech />
    </div>
  );
}
