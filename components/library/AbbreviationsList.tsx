import React, { useEffect, useState } from 'react';
import './AbbreviationsList.css';

interface Abbreviation {
  fullTerm: string;
  abbreviation: string;
  description: string;
}

interface AbbreviationsListProps {
  /**
   * The top-level key from abbreviations.json.
   * e.g. list="complexformtype"
   */
  list?: string;
  /**
   * Support for any dynamic boolean attributes.
   * e.g. <AbbreviationsList language /> sets props.language to true.
   */
  [key: string]: any;
}

/**
 * A component that displays a collection of abbreviation cards for book chapters.
 * Data is sourced from public/abbreviations.json.
 */
export default function AbbreviationsList(props: AbbreviationsListProps) {
  const [data, setData] = useState<Abbreviation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which category to show outside of useEffect for stable dependencies
  let category = props.list;
  if (!category) {
    category = Object.keys(props).find(key => props[key] === true);
  }

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        const url = browser.runtime.getURL("/abbreviations.json");
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();

        if (isMounted) {
          if (category && json[category]) {
            const group = json[category];
            const items: Abbreviation[] = Object.values(group);
            
            // Deduplicate items based on the lowercase combination of fullTerm and abbreviation
            // This is necessary because some keys in JSON map to the same term (e.g. "Sanskrit" and "San.")
            const uniqueMap = new Map<string, Abbreviation>();
            for (const item of items) {
              const key = `${item.fullTerm.toLowerCase()}|${item.abbreviation.toLowerCase()}`;
              // Prefer entries with descriptions if duplicates exist
              if (!uniqueMap.has(key) || (item.description && !uniqueMap.get(key)!.description)) {
                uniqueMap.set(key, item);
              }
            }
            
            const uniqueItems = Array.from(uniqueMap.values());
            
            // Sort by fullTerm (headword) as requested
            uniqueItems.sort((a, b) => a.fullTerm.localeCompare(b.fullTerm));
            
            setData(uniqueItems);
          } else {
            setError(`Category "${category}" not found in abbreviations data.`);
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error("Failed to load abbreviations.json:", err);
          setError("Failed to load abbreviations data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [category]);

  if (loading) {
    return <div className="abbreviation-loading">Loading abbreviations...</div>;
  }

  if (error || data.length === 0) {
    return (
      <div className="abbreviation-empty">
        {error || "No abbreviations found for this category."}
      </div>
    );
  }

  return (
    <div className="abbreviations-container">
      {data.map((item, index) => (
        <div key={`${item.fullTerm}-${index}`} className="abbreviation-card">
          <div className="abbreviation-header">
            <span className="abbreviation-full-term">{item.fullTerm}</span>
            <span className="abbreviation-italic">({item.abbreviation})</span>
          </div>
          {item.description && (
            <div className="abbreviation-description">
              {item.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
