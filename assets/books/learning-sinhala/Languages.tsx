import React from 'react';
import AbbreviationsList from '../../../components/library/AbbreviationsList';

// Using a named export inside the component or default export? We'll rely on the filename / meta for title in TSX, since it doesn't have frontmatter.

export default function Languages() {
  return (
    <div>
      <h2>Languages</h2>
      <p>As with all languages, Sinhala has vocabulary that comes from or is influenced by various languages</p>
      <AbbreviationsList language />
    </div>
  );
}
