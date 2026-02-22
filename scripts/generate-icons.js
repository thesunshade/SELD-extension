const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = path.join(__dirname, '../assets/icon.png');
const outputDir = path.join(__dirname, '../public');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [16, 32, 48, 128];

async function generateIcons() {
    try {
        for (const size of sizes) {
            const outputPath = path.join(outputDir, `icon-${size}.png`);
            await sharp(inputImagePath)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            console.log(`Generated ${outputPath}`);
        }
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
