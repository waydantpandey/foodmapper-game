#!/usr/bin/env node

const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class TestSimpleScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🧪 Test Simple Comprehensive Scraper');
    console.log('====================================\n');
    console.log('This test will:');
    console.log('✅ Scrape Wikipedia for 5 sample dishes');
    console.log('✅ Upload to Cloudinary with proper folder structure');
    console.log('✅ Generate Google Drive upload scripts');
    console.log('✅ Generate Google Sheets update data');
    console.log('❌ No Google API setup required!\n');
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async scrapeFood(food) {
    try {
      console.log(`\n🍽️  Scraping: ${food.name} (${food.location})`);
      
      // Try direct Wikipedia URL first
      const directUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(food.name)}`;
      
      await this.page.goto(directUrl, {
        waitUntil: 'networkidle2'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if page exists and is not a disambiguation page
      const pageTitle = await this.page.evaluate(() => {
        return document.querySelector('h1.firstHeading')?.textContent || '';
      });

      if (pageTitle.includes('disambiguation') || pageTitle.includes('List')) {
        console.log('⚠️  Disambiguation page, trying search...');
        return await this.searchAndScrape(food);
      }

      // Extract images
      const images = await this.extractImagesFromCurrentPage();
      
      if (images.length > 0) {
        console.log(`📸 Found ${images.length} images from Wikipedia`);
        return await this.uploadImagesFromWikipedia(images, food);
      } else {
        console.log('❌ No images found, trying search...');
        return await this.searchAndScrape(food);
      }

    } catch (error) {
      console.log(`❌ Direct URL failed: ${error.message}`);
      return await this.searchAndScrape(food);
    }
  }

  async searchAndScrape(food) {
    try {
      console.log(`🔍 Searching Wikipedia for: ${food.name}`);
      
      await this.page.goto(`https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(food.name)}`, {
        waitUntil: 'networkidle2'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const articleLink = await this.page.evaluate(() => {
        const results = document.querySelectorAll('.mw-search-result-heading a');
        for (const link of results) {
          const href = link.getAttribute('href');
          const text = link.textContent.toLowerCase();
          if (href && href.startsWith('/wiki/') && 
              !text.includes('disambiguation') && 
              !text.includes('list') &&
              !text.includes('category')) {
            return href;
          }
        }
        return null;
      });

      if (articleLink) {
        console.log(`📖 Found article: ${articleLink}`);
        
        await this.page.goto(`https://en.wikipedia.org${articleLink}`, {
          waitUntil: 'networkidle2'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        const images = await this.extractImagesFromCurrentPage();
        
        if (images.length > 0) {
          console.log(`📸 Found ${images.length} images from Wikipedia`);
          return await this.uploadImagesFromWikipedia(images, food);
        }
      }

      console.log('❌ No images found for this dish');
      return { success: false, images: [], error: 'No images found' };

    } catch (error) {
      console.error(`❌ Search failed: ${error.message}`);
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

  async uploadImagesFromWikipedia(images, food) {
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
            food.name, 
            food.location, 
            i
          );
          
          if (cloudinaryImage) {
            uploadedImages.push(cloudinaryImage);
            console.log(`✅ Uploaded image ${i + 1}/${Math.min(images.length, 3)}`);
          }
        } catch (error) {
          console.log(`❌ Failed to upload image ${i + 1}: ${error.message}`);
        }
      }

      console.log(`✅ Successfully scraped ${food.name}: ${uploadedImages.length} images uploaded`);
      
      return {
        success: true,
        images: uploadedImages,
        dish: food,
        source: 'wikipedia'
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${food.name}:`, error.message);
      return { success: false, images: [], error: error.message };
    }
  }

  async downloadImageFromUrl(imageUrl) {
    const https = require('https');
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const client = imageUrl.startsWith('https') ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://en.wikipedia.org/',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };
      
      client.get(imageUrl, options, (response) => {
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

  async generateGoogleDriveScript(food, images) {
    const scriptContent = `#!/bin/bash
# Google Drive Upload Script for ${food.name} (${food.location})
# Generated on ${new Date().toISOString()}

echo "📁 Uploading ${food.name} images to Google Drive..."

# Create folder structure
FOLDER_ID=$(gcloud drive files create --name="${food.name}" --mime-type="application/vnd.google-apps.folder" --parents="food-guessing-game/${food.location}" --format="value(id)")
echo "Created folder: $FOLDER_ID"

# Upload images
${images.map((img, index) => `echo "Uploading ${img.fileName}..."
gcloud drive files upload "${img.fileName}" --parents="$FOLDER_ID" --name="${img.fileName}"`).join('\n')}

echo "✅ Upload complete for ${food.name}"
`;

    const scriptPath = path.join(__dirname, `test_google_drive_upload_${food.name.replace(/\s+/g, '_')}.sh`);
    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`📝 Generated Google Drive script: ${scriptPath}`);
  }

  async generateGoogleSheetsData(food, images) {
    const sheetsData = {
      dish: food.name,
      country: food.location,
      imageUrls: images.map(img => img.url),
      cloudinaryUrls: images.map(img => img.url),
      folder: images[0]?.folder || '',
      timestamp: new Date().toISOString()
    };

    const dataPath = path.join(__dirname, `test_google_sheets_${food.name.replace(/\s+/g, '_')}.json`);
    fs.writeFileSync(dataPath, JSON.stringify(sheetsData, null, 2));
    console.log(`📊 Generated Google Sheets data: ${dataPath}`);
  }

  async testWithSampleDishes() {
    console.log('🧪 Testing with sample dishes...\n');
    
    // Test with a few specific dishes
    const testDishes = [
      { name: 'Kibbeh', location: 'Lebanon' },
      { name: 'Fattoush', location: 'Lebanon' },
      { name: 'Injera', location: 'Ethiopia' },
      { name: 'Lomo Saltado', location: 'Peru' },
      { name: 'Pad Thai', location: 'Thailand' }
    ];

    for (const food of testDishes) {
      const result = await this.scrapeFood(food);
      this.results.push(result);
      
      // Generate Google Drive script and Sheets data
      if (result.success && result.images.length > 0) {
        await this.generateGoogleDriveScript(food, result.images);
        await this.generateGoogleSheetsData(food, result.images);
      }
      
      // Small delay between dishes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate report
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log('\n📊 TEST RESULTS');
    console.log('===============\n');
    console.log(`✅ Successfully processed: ${successful.length} dishes`);
    console.log(`❌ Failed to process: ${failed.length} dishes`);
    console.log(`📸 Total images processed: ${successful.reduce((sum, r) => sum + r.images.length, 0)}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Successful Dishes:');
      successful.forEach(result => {
        console.log(`  - ${result.dish.name} (${result.dish.location}): ${result.images.length} images`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Dishes:');
      failed.forEach(result => {
        console.log(`  - ${result.dish.name} (${result.dish.location}): ${result.error}`);
      });
    }
    
    // Save results
    const testData = {
      timestamp: new Date().toISOString(),
      successful: successful.length,
      failed: failed.length,
      totalImages: successful.reduce((sum, r) => sum + r.images.length, 0),
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-simple-results.json'), 
      JSON.stringify(testData, null, 2)
    );
    
    console.log('\n💾 Results saved to: test-simple-results.json');
    console.log('\n📁 Generated files:');
    console.log('  - Google Drive upload scripts: test_google_drive_upload_*.sh');
    console.log('  - Google Sheets data: test_google_sheets_*.json');
    console.log('  - Test results: test-simple-results.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new TestSimpleScraper();
  
  try {
    await scraper.init();
    await scraper.testWithSampleDishes();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await scraper.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = TestSimpleScraper;
