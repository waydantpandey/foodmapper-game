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

class MassWikipediaScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.foodsData = [];
    this.scrapedCount = 0;
    this.totalCount = 0;
    this.errors = [];
    this.results = [];
  }

  async init() {
    console.log('🚀 Mass Wikipedia Scraper');
    console.log('========================\n');
    
    // Load foods data
    this.foodsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/foods.json'), 'utf8'));
    this.totalCount = this.foodsData.length;
    
    console.log(`📊 Loaded ${this.totalCount} dishes from ${this.getUniqueCountries().length} countries`);
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  getUniqueCountries() {
    const countries = [...new Set(this.foodsData.map(food => food.location))];
    return countries.sort();
  }

  getFoodsByCountry(country) {
    return this.foodsData.filter(food => food.location === country);
  }

  async scrapeFood(food) {
    try {
      console.log(`\n🍽️  Scraping: ${food.name} (${food.location})`);
      console.log('='.repeat(60));
      
      // Try different search strategies
      const searchTerms = [
        food.name,
        `${food.name} food`,
        `${food.name} dish`,
        `${food.name} ${food.location}`,
        `${food.name} recipe`
      ];

      let images = [];
      
      for (const searchTerm of searchTerms) {
        console.log(`🔍 Searching: "${searchTerm}"`);
        
        try {
          // Search on Wikipedia
          await this.page.goto(`https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(searchTerm)}`, {
            waitUntil: 'networkidle2'
          });

          // Wait for search results
          await this.page.waitForTimeout(2000);

          // Try to find the main article link
          const articleLink = await this.page.evaluate(() => {
            // Look for the first result that's not a disambiguation page
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
            await this.page.waitForTimeout(2000);

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

      // Upload images to Cloudinary
      const uploadedImages = [];
      for (let i = 0; i < Math.min(images.length, 5); i++) { // Limit to 5 images per dish
        try {
          const imageUrl = images[i].url;
          const uploadedImage = await this.uploadImageToCloudinary(imageUrl, food.name, food.location, i);
          if (uploadedImage) {
            uploadedImages.push(uploadedImage);
            console.log(`✅ Uploaded image ${i + 1}/${Math.min(images.length, 5)}`);
          }
        } catch (error) {
          console.log(`❌ Failed to upload image ${i + 1}: ${error.message}`);
        }
      }

      this.scrapedCount++;
      console.log(`✅ Successfully scraped ${food.name}: ${uploadedImages.length} images uploaded`);

      return {
        success: true,
        images: uploadedImages,
        dish: food,
        searchTerms: searchTerms
      };

    } catch (error) {
      console.error(`❌ Error scraping ${food.name}:`, error.message);
      this.errors.push({ dish: food.name, error: error.message });
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
        console.error(`❌ Upload failed for ${dishName}:`, error.message);
        reject(error);
      }
    });
  }

  async scrapeAllFoods() {
    console.log('🚀 Starting mass Wikipedia scraping...\n');
    
    const countries = this.getUniqueCountries();
    console.log(`🌍 Countries to process: ${countries.join(', ')}\n`);

    for (const country of countries) {
      const foods = this.getFoodsByCountry(country);
      console.log(`\n🌍 Processing ${country} (${foods.length} dishes)`);
      console.log('='.repeat(50));

      for (const food of foods) {
        const result = await this.scrapeFood(food);
        this.results.push(result);
        
        // Progress update
        const progress = ((this.scrapedCount + this.errors.length) / this.totalCount * 100).toFixed(1);
        console.log(`📊 Progress: ${progress}% (${this.scrapedCount + this.errors.length}/${this.totalCount})`);
        
        // Small delay between dishes
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await this.generateReport();
  }

  async generateReport() {
    console.log('\n📊 MASS SCRAPING REPORT');
    console.log('========================\n');
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`✅ Successfully scraped: ${successful.length} dishes`);
    console.log(`❌ Failed to scrape: ${failed.length} dishes`);
    console.log(`📸 Total images uploaded: ${successful.reduce((sum, r) => sum + r.images.length, 0)}`);
    
    // Group by country
    const byCountry = {};
    this.results.forEach(result => {
      const country = result.dish.location;
      if (!byCountry[country]) {
        byCountry[country] = { successful: 0, failed: 0, images: 0 };
      }
      if (result.success) {
        byCountry[country].successful++;
        byCountry[country].images += result.images.length;
      } else {
        byCountry[country].failed++;
      }
    });
    
    console.log('\n📊 Results by Country:');
    Object.entries(byCountry).forEach(([country, stats]) => {
      console.log(`  ${country}: ${stats.successful} successful, ${stats.failed} failed, ${stats.images} images`);
    });
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Dishes:');
      failed.forEach(result => {
        console.log(`  - ${result.dish.name} (${result.dish.location}): ${result.error}`);
      });
    }
    
    // Save results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      totalDishes: this.totalCount,
      successful: successful.length,
      failed: failed.length,
      totalImages: successful.reduce((sum, r) => sum + r.images.length, 0),
      byCountry: byCountry,
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'mass-scraping-report.json'), 
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n💾 Report saved to: mass-scraping-report.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new MassWikipediaScraper();
  
  try {
    await scraper.init();
    await scraper.scrapeAllFoods();
  } catch (error) {
    console.error('❌ Mass scraping failed:', error);
  } finally {
    await scraper.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = MassWikipediaScraper;




