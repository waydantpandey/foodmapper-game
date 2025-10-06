#!/usr/bin/env node

const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class TestAddMoreImages {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🧪 Test: Adding More Images to Existing Dishes');
    console.log('==============================================\n');
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async checkExistingImages(dishName, countryName) {
    try {
      console.log(`🔍 Checking existing images for ${dishName} (${countryName})...`);
      
      const folder = `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${dishName.toLowerCase().replace(/\s+/g, '-')}`;
      
      const result = await cloudinary.search.expression(`folder:${folder}`).execute();
      
      console.log(`📸 Found ${result.resources.length} existing images:`);
      result.resources.forEach((img, index) => {
        console.log(`  ${index + 1}. ${img.public_id} (${img.width}x${img.height})`);
      });
      
      return result.resources.length;
    } catch (error) {
      console.error(`❌ Error checking existing images: ${error.message}`);
      return 0;
    }
  }

  async scrapeAdditionalImages(dishName, countryName, startIndex) {
    try {
      console.log(`\n🌐 Scraping additional images for ${dishName}...`);
      
      // Try direct Wikipedia URL
      const directUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(dishName)}`;
      
      await this.page.goto(directUrl, {
        waitUntil: 'networkidle2'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract images
      const images = await this.extractImagesFromCurrentPage();
      
      if (images.length > 0) {
        console.log(`📸 Found ${images.length} images from Wikipedia`);
        return await this.uploadAdditionalImages(images, dishName, countryName, startIndex);
      } else {
        console.log('❌ No images found');
        return { success: false, images: [], error: 'No images found' };
      }

    } catch (error) {
      console.error(`❌ Scraping failed: ${error.message}`);
      return { success: false, images: [], error: error.message };
    }
  }

  async extractImagesFromCurrentPage() {
    const imageUrls = await this.page.evaluate(() => {
      const images = [];
      const imgElements = document.querySelectorAll('.infobox img, .thumb img, .gallery img, .mw-parser-output img');

      imgElements.forEach(img => {
        if (img.src && img.src.includes('upload.wikimedia.org')) {
          const highResUrl = img.src.replace(/\/\d+px-/, '/800px-');
          
          const alt = (img.alt || '').toLowerCase();
          const title = (img.title || '').toLowerCase();
          const src = img.src.toLowerCase();
          
          const isObviousNonFood = src.includes('commons-logo') || 
                                 src.includes('wikimedia-logo') ||
                                 src.includes('wikibooks-logo') ||
                                 alt.includes('commons logo') ||
                                 alt.includes('wikimedia logo') ||
                                 (img.width < 50 || img.height < 50);
          
          if (!isObviousNonFood) {
            images.push({
              url: highResUrl,
              alt: img.alt || '',
              title: img.title || '',
              width: img.width,
              height: img.height
            });
          }
        }
      });
      return images;
    });
    return imageUrls;
  }

  async uploadAdditionalImages(images, dishName, countryName, startIndex) {
    try {
      const uploadedImages = [];
      
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        try {
          const imageUrl = images[i].url;
          
          // Download image
          const imageBuffer = await this.downloadImageFromUrl(imageUrl);
          
          // Upload to Cloudinary
          const cloudinaryImage = await this.uploadImageToCloudinary(
            imageBuffer, 
            dishName, 
            countryName, 
            startIndex + i
          );
          
          if (cloudinaryImage) {
            uploadedImages.push(cloudinaryImage);
            console.log(`✅ Uploaded additional image ${startIndex + i + 1} (${i + 1}/${Math.min(images.length, 3)})`);
          }
        } catch (error) {
          console.log(`❌ Failed to upload image ${startIndex + i + 1}: ${error.message}`);
        }
      }

      console.log(`✅ Successfully uploaded ${uploadedImages.length} additional images for ${dishName}`);
      return {
        success: true,
        images: uploadedImages,
        dish: { name: dishName, location: countryName },
        source: 'wikipedia'
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${dishName}:`, error.message);
      return { success: false, images: [], error: error.message };
    }
  }

  async downloadImageFromUrl(imageUrl) {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const client = imageUrl.startsWith('https') ? https : http;
      
      client.get(imageUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`));
          return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  async uploadImageToCloudinary(imageBuffer, dishName, countryName, imageIndex) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
        const folder = `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${dishName.toLowerCase().replace(/\s+/g, '-')}`;

        const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${imageBuffer.toString('base64')}`, {
          public_id: fileName,
          folder: folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 800, height: 600, crop: 'limit' }
          ]
        });

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          folder: folder,
          fileName: fileName
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async testAddMoreImages() {
    console.log('🧪 Testing: Adding more images to existing dishes\n');
    
    // Test with dishes that already have images
    const testDishes = [
      { name: 'Kibbeh', location: 'Lebanon' },
      { name: 'Pad Thai', location: 'Thailand' }
    ];

    for (const food of testDishes) {
      console.log(`\n🍽️  Testing: ${food.name} (${food.location})`);
      console.log('='.repeat(50));
      
      // Check existing images
      const existingCount = await this.checkExistingImages(food.name, food.location);
      
      if (existingCount > 0) {
        // Scrape additional images
        const result = await this.scrapeAdditionalImages(food.name, food.location, existingCount);
        
        if (result.success) {
          console.log(`\n✅ Successfully added ${result.images.length} more images to ${food.name}`);
          console.log(`📊 Total images now: ${existingCount + result.images.length}`);
        } else {
          console.log(`❌ Failed to add more images to ${food.name}: ${result.error}`);
        }
      } else {
        console.log(`⚠️  No existing images found for ${food.name}, skipping...`);
      }
      
      // Small delay between dishes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n🎉 Test completed!');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const tester = new TestAddMoreImages();
  
  try {
    await tester.init();
    await tester.testAddMoreImages();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = TestAddMoreImages;



