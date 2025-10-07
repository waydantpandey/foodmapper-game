const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  try {
    const logoPath = path.join(__dirname, '../public/logo.png');
    const outputPath = path.join(__dirname, '../public/favicon.ico');
    
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error('Logo file not found at:', logoPath);
      return;
    }

    console.log('Generating favicon from logo...');
    
    // Create multiple sizes for the favicon
    const sizes = [16, 32, 48, 64, 128, 256];
    const buffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(logoPath)
        .resize(size, size, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toBuffer();
      
      buffers.push({ size, buffer });
      console.log(`Generated ${size}x${size} icon`);
    }
    
    // For now, let's just copy the largest size as favicon.ico
    // Most browsers will handle PNG files with .ico extension
    const largestBuffer = buffers[buffers.length - 1].buffer;
    fs.writeFileSync(outputPath, largestBuffer);
    
    console.log('Favicon generated successfully!');
    console.log('Favicon saved to:', outputPath);
    
    // Also create individual size files for better browser support
    for (const { size, buffer } of buffers) {
      const sizePath = path.join(__dirname, `../public/favicon-${size}x${size}.png`);
      fs.writeFileSync(sizePath, buffer);
    }
    
    console.log('Individual favicon sizes created!');
    
  } catch (error) {
    console.error('Error generating favicon:', error);
  }
}

generateFavicon();
