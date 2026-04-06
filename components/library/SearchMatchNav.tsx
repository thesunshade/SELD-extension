import React from 'react';

interface SearchMatchNavProps {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Floating navigator for search matches within a chapter.
 * Borrowing styles from HistoryNav and Library Search.
 */
export default function SearchMatchNav({ currentIndex, totalCount, onPrev, onNext }: SearchMatchNavProps) {
  if (totalCount === 0) return null;

  const displayIndex = currentIndex === -1 ? 0 : currentIndex + 1;

  return (
    <div className="library-search-match-nav">
      <div className="match-counter">
        <span className="current">{displayIndex}</span>
        <span className="separator">of</span>
        <span className="total">{totalCount}</span>
      </div>
      <div className="match-nav-buttons">
        <button 
          className="seld-btn seld-btn-secondary match-nav-btn" 
          onClick={onPrev}
          title="Previous Match"
          disabled={totalCount <= 1}
        >
          &lt;
        </button>
        <button 
          className="seld-btn seld-btn-secondary match-nav-btn" 
          onClick={onNext}
          title="Next Match"
          disabled={totalCount <= 1}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}
