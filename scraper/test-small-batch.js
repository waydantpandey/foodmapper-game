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

class TestSmallBatch {
  constructor() {
    this.browser = null;
    this.page = null;
    this.foodsData = [];
    this.results = [];
  }

  async init() {
    console.log('🧪 Test Small Batch Scraper');
    console.log('===========================\n');
    
    // Load foods data
    this.foodsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/foods.json'), 'utf8'));
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  getFoodsByCountry(country) {
    return this.foodsData.filter(food => food.location === country);
  }

  async scrapeFood(food) {
    try {
      console.log(`\n🍽️  Scraping: ${food.name} (${food.location})`);
      
      // Try different search strategies
      const searchTerms = [
        food.name,
        `${food.name} food`,
        `${food.name} dish`,
        `${food.name} ${food.location}`
      ];

      let images = [];
      
      for (const searchTerm of searchTerms) {
        try {
          console.log(`🔍 Searching: "${searchTerm}"`);
          
          // Search on Wikipedia
          await this.page.goto(`https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(searchTerm)}`, {
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
            const extractedImages = await this.extractImagesFromCurrentPage();
            
            if (extractedImages.length > 0) {
              console.log(`📸 Found ${extractedImages.length} images`);
              images = extractedImages;
              break; // Stop searching if we found images
            }
          }
        } catch (error) {
          console.log(`⚠️  Search failed for "${searchTerm}": ${error.message}`);
          continue;
        }
      }

      if (images.length === 0) {
        console.log('❌ No images found for this dish');
        return { success: false, images: [], error: 'No images found' };
      }

      // Upload images to Cloudinary (limit to 2 images per dish for testing)
      const uploadedImages = [];
      for (let i = 0; i < Math.min(images.length, 2); i++) {
        try {
          const imageUrl = images[i].url;
          const uploadedImage = await this.uploadImageToCloudinary(imageUrl, food.name, food.location, i);
          if (uploadedImage) {
            uploadedImages.push(uploadedImage);
            console.log(`✅ Uploaded image ${i + 1}/${Math.min(images.length, 2)}`);
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
      console.error(`❌ Error scraping ${food.name}:`, error.message);
      return { success: false, images: [], error: error.message };
    }
  }

  async extractImagesFromCurrentPage() {
    const imageUrls = await this.page.evaluate(() => {
      const images = [];
      const imgElements = document.querySelectorAll('.infobox img, .thumb img, .gallery img');

      // Keywords to filter out non-food images
      const excludeKeywords = [
        'wikimedia', 'commons', 'wikibooks', 'wikipedia', 'logo', 'icon', 'symbol',
        'flag', 'banner', 'header', 'footer', 'button', 'arrow', 'star', 'badge',
        'medal', 'award', 'trophy', 'certificate', 'diagram', 'chart', 'graph',
        'map', 'location', 'pin', 'marker', 'sign', 'signage', 'text', 'font',
        'typography', 'letter', 'number', 'digit', 'character', 'symbol', 'emblem',
        'crest', 'coat', 'arms', 'seal', 'stamp', 'watermark', 'transparent',
        'background', 'pattern', 'texture', 'border', 'frame', 'outline',
        'wikidata', 'wikisource', 'wiktionary', 'wikiquote', 'wikinews', 'wikiversity',
        'wikivoyage', 'wikispecies', 'wikimediafoundation', 'creativecommons',
        'cc-by', 'cc-by-sa', 'public domain', 'pd-', 'fair use', 'fairuse',
        'screenshot', 'interface', 'ui', 'button', 'menu', 'toolbar', 'sidebar'
      ];

      imgElements.forEach(img => {
        if (img.src && img.src.includes('upload.wikimedia.org')) {
          const highResUrl = img.src.replace(/\/\d+px-/, '/800px-');
          const alt = (img.alt || '').toLowerCase();
          const title = (img.title || '').toLowerCase();
          const src = img.src.toLowerCase();
          
          // Check if image should be excluded
          const shouldExclude = excludeKeywords.some(keyword => 
            alt.includes(keyword) || title.includes(keyword) || src.includes(keyword)
          );
          
          // Additional checks for common non-food patterns
          const isTransparentIcon = src.includes('transparent') || 
                                  src.includes('icon') || 
                                  src.includes('logo') ||
                                  alt.includes('icon') ||
                                  alt.includes('logo');
          
          const isSmallImage = img.width < 150 || img.height < 150;
          
          const isSvgOrIcon = src.includes('.svg') || 
                            src.includes('icon') || 
                            src.includes('symbol') ||
                            alt.includes('svg') ||
                            alt.includes('icon');
          
          // Check for Wikimedia Commons specific patterns
          const isCommonsLogo = src.includes('commons-logo') || 
                               src.includes('wikimedia-logo') ||
                               src.includes('wikibooks-logo') ||
                               alt.includes('commons') ||
                               alt.includes('wikimedia');
          
          // Check for very small or very large images (likely not food)
          const isUnusualSize = img.width < 100 || img.height < 100 || 
                               img.width > 2000 || img.height > 2000;
          
          // Check for aspect ratio (icons are often square or very wide/tall)
          const aspectRatio = img.width / img.height;
          const isUnusualAspectRatio = aspectRatio < 0.5 || aspectRatio > 3;
          
          // Check for common non-food file patterns
          const isNonFoodFile = src.includes('logo') || 
                               src.includes('icon') || 
                               src.includes('symbol') ||
                               src.includes('badge') ||
                               src.includes('emblem') ||
                               src.includes('banner') ||
                               src.includes('header') ||
                               src.includes('footer');
          
          if (!shouldExclude && !isTransparentIcon && !isSmallImage && !isSvgOrIcon && 
              !isCommonsLogo && !isUnusualSize && !isUnusualAspectRatio && !isNonFoodFile) {
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

  async testSmallBatch() {
    console.log('🧪 Testing with small batch of countries...\n');
    
    // Test with just a few countries first
    const testCountries = ['Lebanon', 'Ethiopia', 'Peru'];
    
    for (const country of testCountries) {
      const foods = this.getFoodsByCountry(country);
      console.log(`\n🌍 Testing ${country} (${foods.length} dishes)`);
      console.log('='.repeat(50));

      for (const food of foods.slice(0, 2)) { // Test only first 2 dishes per country
        const result = await this.scrapeFood(food);
        this.results.push(result);
        
        // Small delay between dishes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate test report
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log('\n📊 TEST RESULTS');
    console.log('===============\n');
    console.log(`✅ Successfully scraped: ${successful.length} dishes`);
    console.log(`❌ Failed to scrape: ${failed.length} dishes`);
    console.log(`📸 Total images uploaded: ${successful.reduce((sum, r) => sum + r.images.length, 0)}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Dishes:');
      failed.forEach(result => {
        if (result.dish) {
          console.log(`  - ${result.dish.name} (${result.dish.location}): ${result.error}`);
        } else {
          console.log(`  - Unknown dish: ${result.error}`);
        }
      });
    }
    
    // Save test results
    const testData = {
      timestamp: new Date().toISOString(),
      testCountries: testCountries,
      successful: successful.length,
      failed: failed.length,
      totalImages: successful.reduce((sum, r) => sum + r.images.length, 0),
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'test-scraping-results.json'), 
      JSON.stringify(testData, null, 2)
    );
    
    console.log('\n💾 Test results saved to: test-scraping-results.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const tester = new TestSmallBatch();
  
  try {
    await tester.init();
    await tester.testSmallBatch();
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = TestSmallBatch;
