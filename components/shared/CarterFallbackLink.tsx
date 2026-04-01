import React, { useEffect, useState, useRef } from 'react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
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
                theme: 'light-border' // or whatever theme is standard in this app
            });

            return () => instance.destroy();
        }
    }, [isFound]);

    if (!isFound) return null;

    return (
        <div className={`mt-2 ${className}`}>
            <a 
                ref={linkRef}
                href={getCarterUrl(searchTerm)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Check online Carter Dictionary
            </a>
        </div>
    );
};
