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
    const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
    const buffers = [];
    
    for (const size of sizes) {
      // Create a dark purple square background with rounded corners
      const backgroundBuffer = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 26, g: 17, b: 42, alpha: 1 } // #1A112A dark purple from nickname screen
        }
      })
      .png()
      .toBuffer();

      // Create rounded corners mask
      const roundedMask = await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([{
        input: Buffer.from(`<svg width="${size}" height="${size}">
          <rect width="${size}" height="${size}" rx="${size * 0.15}" ry="${size * 0.15}" fill="white"/>
        </svg>`),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();

      // Resize logo to full size (no reduction) - let it crop if needed
      const logoBuffer = await sharp(logoPath)
        .resize(size, size, { 
          fit: 'cover', // Use cover to fill the entire space, cropping if needed
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Composite: background + logo + rounded mask
      const buffer = await sharp(backgroundBuffer)
        .composite([
          {
            input: logoBuffer,
            gravity: 'center'
          },
          {
            input: roundedMask,
            blend: 'dest-in'
          }
        ])
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
