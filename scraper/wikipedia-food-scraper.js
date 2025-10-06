#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const cloudinary = require('cloudinary').v2;

class WikipediaFoodScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.downloadedImages = new Set();
    this.uploadedImages = new Set();
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
      api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
    });
  }

  async init() {
    console.log('🚀 Starting Wikipedia Food Scraper...');
    this.browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async scrapeFoodImages(foodName, maxImages = 5) {
    try {
      console.log(`🔍 Searching for images of: ${foodName}`);
      
      // Search for the food on Wikipedia
      const searchUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(foodName)}`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Debug: Check what's on the page
      const pageTitle = await this.page.title();
      console.log(`🔍 Search page title: ${pageTitle}`);
      
      // Try to find the main article link
      const articleLink = await this.page.evaluate(() => {
        // Try multiple selectors for search results
        const firstResult = document.querySelector('.mw-search-result-heading a') || 
                           document.querySelector('.searchresult a') ||
                           document.querySelector('.mw-search-results a');
        return firstResult ? firstResult.href : null;
      });

      if (!articleLink) {
        // Try direct Wikipedia URL as fallback
        const directUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(foodName)}`;
        console.log(`🔄 Trying direct URL: ${directUrl}`);
        
        try {
          await this.page.goto(directUrl, { waitUntil: 'networkidle2' });
          const directTitle = await this.page.title();
          if (!directTitle.includes('Wikipedia does not have an article')) {
            console.log(`✅ Found direct article: ${directTitle}`);
            return await this.extractImagesFromCurrentPage();
          }
        } catch (error) {
          console.log(`❌ Direct URL failed: ${error.message}`);
        }
        
        console.log(`❌ No Wikipedia article found for: ${foodName}`);
        return [];
      }

      console.log(`📖 Found article: ${articleLink}`);
      await this.page.goto(articleLink, { waitUntil: 'networkidle2' });

      return await this.extractImagesFromCurrentPage();

    } catch (error) {
      console.error(`❌ Error scraping ${foodName}:`, error.message);
      return [];
    }
  }

  async extractImagesFromCurrentPage() {
    // Extract image URLs from the current page
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
          // Convert to high-resolution version
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
          } else {
            console.log(`🚫 Filtered out: ${alt || title || 'unnamed'} (${img.width}x${img.height})`);
          }
        }
      });
      
      return images;
    });

    console.log(`📸 Found ${imageUrls.length} food images (filtered out non-food images)`);
    return imageUrls;
  }

  async uploadImageToCloudinary(imageUrl, foodName, imageIndex) {
    return new Promise(async (resolve, reject) => {
      const fileName = `${foodName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
      const publicId = `food-guessing-game/Wikipedia/${foodName}/${fileName}`;
      
      // Skip if already uploaded
      if (this.uploadedImages.has(publicId)) {
        console.log(`⏭️  Skipping ${fileName} (already uploaded)`);
        resolve({
          publicId: publicId,
          secureUrl: `https://res.cloudinary.com/dwav84wrk/image/upload/${publicId}.jpg`
        });
        return;
      }

      try {
        console.log(`☁️  Uploading ${fileName} to Cloudinary...`);
        
        const result = await cloudinary.uploader.upload(imageUrl, {
          public_id: publicId,
          folder: `food-guessing-game/Wikipedia/${foodName}`,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 800, height: 600, crop: 'limit' }
          ]
        });

        this.uploadedImages.add(publicId);
        console.log(`✅ Uploaded: ${fileName} -> ${result.secure_url}`);
        
        resolve({
          publicId: result.public_id,
          secureUrl: result.secure_url,
          fileName: fileName
        });
      } catch (error) {
        console.log(`❌ Failed to upload ${fileName}:`, error.message);
        resolve(null);
      }
    });
  }

  async downloadImage(imageUrl, foodName, imageIndex) {
    return new Promise((resolve, reject) => {
      const fileName = `${foodName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
      const filePath = path.join(__dirname, 'downloaded_images', fileName);
      
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Skip if already downloaded
      if (this.downloadedImages.has(fileName)) {
        console.log(`⏭️  Skipping ${fileName} (already downloaded)`);
        resolve(filePath);
        return;
      }

      // Add proper headers to avoid 403 errors
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://en.wikipedia.org/'
        }
      };

      const file = fs.createWriteStream(filePath);
      
      https.get(imageUrl, options, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            this.downloadedImages.add(fileName);
            console.log(`✅ Downloaded: ${fileName}`);
            resolve(filePath);
          });
        } else {
          console.log(`❌ Failed to download ${fileName}: ${response.statusCode}`);
          resolve(null);
        }
      }).on('error', (err) => {
        console.log(`❌ Error downloading ${fileName}:`, err.message);
        resolve(null);
      });
    });
  }

  async scrapeMultipleFoods(foodList, maxImagesPerFood = 3) {
    const results = {};
    
    for (const foodName of foodList) {
      console.log(`\n🍽️  Processing: ${foodName}`);
      const images = await this.scrapeFoodImages(foodName, maxImagesPerFood);
      
      if (images.length > 0) {
        results[foodName] = [];
        
        for (let i = 0; i < images.length; i++) {
          const uploadResult = await this.uploadImageToCloudinary(images[i].url, foodName, i);
          if (uploadResult) {
            results[foodName].push({
              cloudinaryUrl: uploadResult.secureUrl,
              publicId: uploadResult.publicId,
              fileName: uploadResult.fileName,
              originalUrl: images[i].url,
              alt: images[i].alt,
              title: images[i].title
            });
          }
        }
        
        console.log(`✅ Uploaded ${results[foodName].length} images to Cloudinary for ${foodName}`);
      } else {
        console.log(`❌ No images found for ${foodName}`);
      }
      
      // Small delay to be respectful to Wikipedia
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Generate Google Drive upload script
  generateUploadScript(results) {
    let script = `#!/bin/bash
# Google Drive Upload Script
# Generated by Wikipedia Food Scraper

echo "🚀 Starting Google Drive upload..."

`;
    
    Object.entries(results).forEach(([foodName, images]) => {
      script += `echo "📁 Creating folder for ${foodName}"\n`;
      script += `# Create folder: ${foodName}\n\n`;
      
      images.forEach((image, index) => {
        script += `echo "📤 Cloudinary URL: ${image.cloudinaryUrl}"\n`;
        script += `# Public ID: ${image.publicId}\n`;
        script += `# File: ${image.fileName}\n\n`;
      });
    });
    
    return script;
  }
}

// Example usage
async function main() {
  const scraper = new WikipediaFoodScraper();
  
  try {
    await scraper.init();
    
    // List of foods to scrape (you can modify this)
    const foodsToScrape = [
      'Margherita pizza',
      'Carbonara',
      'Risotto',
      'Gelato',
      'Tiramisu',
      'Lasagne',
      'Osso buco',
      'Bruschetta'
    ];
    
    console.log(`🎯 Scraping images for ${foodsToScrape.length} foods...`);
    const results = await scraper.scrapeMultipleFoods(foodsToScrape, 3);
    
    // Save results to JSON
    const resultsPath = path.join(__dirname, 'scraping_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${resultsPath}`);
    
    // Generate upload script
    const uploadScript = scraper.generateUploadScript(results);
    const scriptPath = path.join(__dirname, 'upload_to_google_drive.sh');
    fs.writeFileSync(scriptPath, uploadScript);
    console.log(`📜 Upload script generated: ${scriptPath}`);
    
    console.log('\n🎉 Scraping complete!');
    console.log('Next steps:');
    console.log('1. Review downloaded images in ./downloaded_images/');
    console.log('2. Upload images to Google Drive');
    console.log('3. Update your Google Sheet with new image links');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = WikipediaFoodScraper;
