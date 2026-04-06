import React from 'react';
export const metadata = { title: "Usage" };
import AbbreviationsList from '../../../components/library/AbbreviationsList';

// Using a named export inside the component or default export? We'll rely on the filename / meta for title in TSX, since it doesn't have frontmatter.

export default function Usage() {
  return (
    <div>
      <h2>Usage</h2>
      <p>As with all languages, Sinhala has vocabulary that is restricted to specific situations. Additionaly there are two broad categories often referred to as Written Sinhala and Spoken Sinhala.</p>
      <AbbreviationsList usage />
    </div>
  );
}
