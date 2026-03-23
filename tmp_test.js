import { normalizeSinhala } from './utils/normalization.js';

const q = 'පීරන්';
const w = 'පීරනවා';

console.log('Query:', q, 'Normalized:', normalizeSinhala(q));
console.log('Word:', w, 'Normalized:', normalizeSinhala(w));
console.log('Starts with?', normalizeSinhala(w).startsWith(normalizeSinhala(q)));
