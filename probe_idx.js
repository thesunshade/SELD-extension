const fs = require('fs');

const idxData = fs.readFileSync('./SELD/SELD.idx');
console.log('Index file size:', idxData.length);

// Read first word
let i = 0;
while (i < idxData.length && idxData[i] !== 0) {
    i++;
}
const wordBytes = idxData.slice(0, i);
const word = wordBytes.toString('utf8');
console.log('First word:', word);

// In version 3.0.0, word is followed by \0, then offset (32bit or 64bit), then size (32bit)
// The ifo says version=3.0.0, idxoffsetbits=32 (default if missing, or 64)
const offset = idxData.readUInt32BE(i + 1);
const size = idxData.readUInt32BE(i + 5);
console.log('Offset (32bit):', offset);
console.log('Size (32bit):', size);

if (i + 9 <= idxData.length) {
    const nextI = i + 9;
    let j = nextI;
    while (j < idxData.length && idxData[j] !== 0) {
        j++;
    }
    const word2 = idxData.slice(nextI, j).toString('utf8');
    console.log('Second word:', word2);
}
