import React, { useEffect, useState, useRef } from 'react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/dist/border.css';
import { checkCarterDictionary, getCarterUrl } from '../../utils/carter_fallback';

interface CarterFallbackLinkProps {
    searchTerm: string;
    className?: string;
}

export const CarterFallbackLink: React.FC<CarterFallbackLinkProps> = ({ searchTerm, className = '' }) => {
    const [isFound, setIsFound] = useState(false);
    const linkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        let isMounted = true;
        if (!searchTerm) {
            setIsFound(false);
            return;
        }

        checkCarterDictionary(searchTerm).then(found => {
            if (isMounted) {
                setIsFound(found);
            }
        });

        return () => { isMounted = false; };
    }, [searchTerm]);

    useEffect(() => {
        if (isFound && linkRef.current) {
            const instance = tippy(linkRef.current, {
                content: 'Online Carter Sinhala English Dictionary, University of Chicago',
                placement: 'top',
                theme: 'light-border',
                appendTo: () => {
                    const el = linkRef.current;
                    if (el) {
                        const root = el.closest('.seld-theme-vars');
                        if (root) return root as HTMLElement;
                    }
                    return document.body;
                }
            });

            return () => instance.destroy();
        }
    }, [isFound]);

    if (!isFound) return null;

    return (
        <div className={`carter-link-container ${className}`}>
            <style>
                {`
                .carter-link {
                    color: var(--accent);
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.9em;
                    font-weight: 500;
                    margin-top: 4px;
                }
                .carter-link:hover {
                    text-decoration: underline;
                }
                .carter-link-container {
                    margin-top: 8px;
                }
                `}
            </style>
            <a 
                ref={linkRef}
                href={getCarterUrl(searchTerm)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="carter-link"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Check online Carter Dictionary
            </a>
        </div>
    );
};
