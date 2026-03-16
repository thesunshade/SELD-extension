import React from 'react';

interface HighlighterProps {
  text: string;
  searchTerm: string;
}

/**
 * Reusable component to bold search terms within a string.
 * Case-insensitive matching.
 */
export const Highlighter: React.FC<HighlighterProps> = ({ text, searchTerm }) => {
  if (!searchTerm || !searchTerm.trim()) {
    return <>{text}</>;
  }

  // Escape regex special characters to avoid invalid regex patterns
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use a negative lookahead to ensure we don't match if it's followed by a Sinhala combining mark
  // This prevents splitting a character cluster (e.g. කොට within කොටා)
  const regex = new RegExp(`(${escapedSearchTerm})(?![\\u0DCA-\\u0DF3\\u200D\\u200C])`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong key={i} className="seld-highlight-bold">{part}</strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

export default Highlighter;
