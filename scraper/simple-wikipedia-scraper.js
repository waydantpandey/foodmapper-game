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

class SimpleWikipediaScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Simple Wikipedia Scraper');
    console.log('===========================\n');
    
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
      console.log(`🔍 Trying direct URL: ${directUrl}`);
      
      await this.page.goto(directUrl, {
        waitUntil: 'networkidle2'
      });

      // Wait for page to load
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
        console.log(`📸 Found ${images.length} images`);
        return await this.uploadImages(images, food);
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
      console.log(`🔍 Searching for: ${food.name}`);
      
      // Search on Wikipedia
      await this.page.goto(`https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(food.name)}`, {
        waitUntil: 'networkidle2'
      });

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try to find the main article link
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
        
        // Navigate to the article
        await this.page.goto(`https://en.wikipedia.org${articleLink}`, {
          waitUntil: 'networkidle2'
        });

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract images
        const images = await this.extractImagesFromCurrentPage();
        
        if (images.length > 0) {
          console.log(`📸 Found ${images.length} images`);
          return await this.uploadImages(images, food);
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
          // Convert to high-resolution version
          const highResUrl = img.src.replace(/\/\d+px-/, '/800px-');
          
          // Basic filtering - only exclude obvious non-food items
          const alt = (img.alt || '').toLowerCase();
          const title = (img.title || '').toLowerCase();
          const src = img.src.toLowerCase();
          
          // Only exclude very obvious non-food items
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

  async uploadImages(images, food) {
    try {
      // Upload up to 3 images
      const uploadedImages = [];
      for (let i = 0; i < Math.min(images.length, 3); i++) {
        try {
          const imageUrl = images[i].url;
          const uploadedImage = await this.uploadImageToCloudinary(imageUrl, food.name, food.location, i);
          if (uploadedImage) {
            uploadedImages.push(uploadedImage);
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
        dish: food
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${food.name}:`, error.message);
      return { success: false, images: [], error: error.message };
    }
  }

  async uploadImageToCloudinary(imageUrl, dishName, countryName, imageIndex) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
        const folder = `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${dishName.toLowerCase().replace(/\s+/g, '-')}`;

        const result = await cloudinary.uploader.upload(imageUrl, {
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
      
      // Small delay between dishes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate report
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log('\n📊 TEST RESULTS');
    console.log('===============\n');
    console.log(`✅ Successfully scraped: ${successful.length} dishes`);
    console.log(`❌ Failed to scrape: ${failed.length} dishes`);
    console.log(`📸 Total images uploaded: ${successful.reduce((sum, r) => sum + r.images.length, 0)}`);
    
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
      path.join(__dirname, 'simple-scraping-results.json'), 
      JSON.stringify(testData, null, 2)
    );
    
    console.log('\n💾 Results saved to: simple-scraping-results.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new SimpleWikipediaScraper();
  
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

module.exports = SimpleWikipediaScraper;



