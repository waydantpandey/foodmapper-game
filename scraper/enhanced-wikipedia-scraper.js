#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const cloudinary = require('cloudinary').v2;
const { google } = require('googleapis');
const csv = require('csv-parser');
const csvWriter = require('csv-writer').createObjectCsvWriter;

class EnhancedWikipediaScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.downloadedImages = new Set();
    this.uploadedImages = new Set();
    this.googleSheets = null;
    this.sheetsId = null;
    this.csvData = [];

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
      api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
    });

    // Configure Google Sheets API
    this.setupGoogleSheets();
  }

  async setupGoogleSheets() {
    try {
      // You'll need to set up Google Sheets API credentials
      // Create a service account and download the JSON key file
      const auth = new google.auth.GoogleAuth({
        keyFile: path.join(__dirname, 'google-service-account.json'), // You'll need to add this file
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.googleSheets = google.sheets({ version: 'v4', auth });
      this.sheetsId = process.env.GOOGLE_SHEETS_ID; // Set this in your .env
    } catch (error) {
      console.log('⚠️ Google Sheets not configured. Will only upload to Cloudinary.');
      console.log('To enable Google Sheets integration:');
      console.log('1. Create a Google Cloud project');
      console.log('2. Enable Google Sheets API');
      console.log('3. Create a service account and download JSON key');
      console.log('4. Set GOOGLE_SHEETS_ID environment variable');
    }
  }

  async init() {
    console.log('🚀 Starting Enhanced Wikipedia Food Scraper...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultNavigationTimeout(60000);
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async loadExistingData() {
    console.log('📊 Loading existing Google Sheets data...');
    
    // Try to load from Google Sheets first
    if (this.googleSheets && this.sheetsId) {
      try {
        const response = await this.googleSheets.spreadsheets.values.get({
          spreadsheetId: this.sheetsId,
          range: 'A:Z' // Get all columns
        });
        
        const rows = response.data.values;
        if (rows && rows.length > 1) {
          const headers = rows[0];
          this.csvData = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            return obj;
          });
          console.log(`✅ Loaded ${this.csvData.length} dishes from Google Sheets`);
          return;
        }
      } catch (error) {
        console.log('⚠️ Could not load from Google Sheets, trying local CSV...');
      }
    }

    // Fallback to local CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'foods_data.csv');
    if (fs.existsSync(csvPath)) {
      return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            this.csvData = results;
            console.log(`✅ Loaded ${this.csvData.length} dishes from local CSV`);
            resolve();
          })
          .on('error', reject);
      });
    } else {
      console.log('⚠️ No existing data found. Will create new entries.');
      this.csvData = [];
    }
  }

  async findDishInData(dishName) {
    return this.csvData.find(dish => 
      dish['Dish Name'] && dish['Dish Name'].toLowerCase() === dishName.toLowerCase()
    );
  }

  async getNextImageNumber(dishData) {
    let maxNum = 0;
    for (let i = 1; i <= 10; i++) {
      const url = dishData[`Image URL ${i}`];
      if (url && url.trim() !== '') {
        maxNum = i;
      }
    }
    return maxNum + 1;
  }

  async scrapeFoodImages(foodName, maxImages = 5) {
    try {
      console.log(`🔍 Searching for images of: ${foodName}`);
      const searchUrl = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(foodName)}`;
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });

      const articleLink = await this.page.evaluate(() => {
        const firstResult = document.querySelector('.mw-search-result-heading a') ||
                           document.querySelector('.searchresult a') ||
                           document.querySelector('.mw-search-results a');
        return firstResult ? firstResult.href : null;
      });

      if (!articleLink) {
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

  async uploadImageToCloudinary(imageUrl, dishName, countryName, imageIndex) {
    return new Promise(async (resolve, reject) => {
      const fileName = `${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
      const folder = `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${dishName.toLowerCase().replace(/\s+/g, '-')}`;
      const publicId = `${folder}/${fileName}`;

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
          folder: folder,
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

  async uploadToGoogleDrive(imageUrl, dishName, countryName, imageIndex) {
    // This would require Google Drive API setup
    // For now, we'll generate the expected folder structure and file names
    const fileName = `${dishName} ${imageIndex + 1}.jpg`;
    const folderPath = `Food Guessing Game/${countryName}/${dishName}`;
    
    console.log(`📁 Google Drive: ${folderPath}/${fileName}`);
    console.log(`🔗 Image URL: ${imageUrl}`);
    
    return {
      folderPath,
      fileName,
      imageUrl
    };
  }

  async updateGoogleSheets(dishData, newImageUrls) {
    if (!this.googleSheets || !this.sheetsId) {
      console.log('⚠️ Google Sheets not configured, skipping update');
      return;
    }

    try {
      // Find the row index for this dish
      const rowIndex = this.csvData.findIndex(dish => 
        dish['Dish Name'] === dishData['Dish Name']
      );

      if (rowIndex === -1) {
        console.log(`❌ Dish ${dishData['Dish Name']} not found in Google Sheets`);
        return;
      }

      // Prepare the update data
      const updates = [];
      newImageUrls.forEach((imageUrl, index) => {
        const columnIndex = 3 + index; // Image URL columns start at column D (index 3)
        updates.push({
          range: `Sheet1!${String.fromCharCode(65 + columnIndex)}${rowIndex + 2}`, // +2 because sheets are 1-indexed and we skip header
          values: [[imageUrl]]
        });
      });

      // Batch update
      await this.googleSheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.sheetsId,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });

      console.log(`✅ Updated Google Sheets for ${dishData['Dish Name']} with ${newImageUrls.length} new images`);
    } catch (error) {
      console.error(`❌ Failed to update Google Sheets:`, error.message);
    }
  }

  async scrapeAndUpdateDish(dishName, countryName, maxImages = 3) {
    console.log(`\n🍽️  Processing: ${dishName} (${countryName})`);
    
    // Find existing dish data
    const dishData = await this.findDishInData(dishName);
    if (!dishData) {
      console.log(`❌ Dish ${dishName} not found in existing data`);
      return;
    }

    // Get next image number
    const nextImageNumber = await this.getNextImageNumber(dishData);
    console.log(`📊 Next image number: ${nextImageNumber}`);

    // Scrape images from Wikipedia
    const images = await this.scrapeFoodImages(dishName, maxImages);
    
    if (images.length === 0) {
      console.log(`❌ No images found for ${dishName}`);
      return;
    }

    const newImageUrls = [];
    const googleDriveUploads = [];

    // Upload to Cloudinary and prepare Google Drive data
    for (let i = 0; i < images.length; i++) {
      const imageIndex = nextImageNumber + i - 1;
      const uploadResult = await this.uploadImageToCloudinary(
        images[i].url, 
        dishName, 
        countryName, 
        imageIndex
      );
      
      if (uploadResult) {
        newImageUrls.push(uploadResult.secureUrl);
        
        // Prepare Google Drive upload data
        const gdriveData = await this.uploadToGoogleDrive(
          uploadResult.secureUrl,
          dishName,
          countryName,
          imageIndex
        );
        googleDriveUploads.push(gdriveData);
      }
    }

    // Update Google Sheets
    if (newImageUrls.length > 0) {
      await this.updateGoogleSheets(dishData, newImageUrls);
    }

    // Generate Google Drive upload script
    this.generateGoogleDriveScript(googleDriveUploads, dishName, countryName);

    console.log(`✅ Processed ${dishName}: ${newImageUrls.length} new images`);
    return {
      dishName,
      countryName,
      newImageUrls,
      googleDriveUploads
    };
  }

  generateGoogleDriveScript(uploads, dishName, countryName) {
    const scriptPath = path.join(__dirname, `google_drive_upload_${dishName.replace(/\s+/g, '_')}.sh`);
    
    let script = `#!/bin/bash
# Google Drive Upload Script for ${dishName}
# Generated by Enhanced Wikipedia Scraper

echo "🚀 Starting Google Drive upload for ${dishName}..."

`;

    uploads.forEach((upload, index) => {
      script += `echo "📁 Creating folder: ${upload.folderPath}"\n`;
      script += `# Upload: ${upload.fileName}\n`;
      script += `# URL: ${upload.imageUrl}\n\n`;
    });

    script += `echo "✅ Google Drive upload script generated for ${dishName}"\n`;

    fs.writeFileSync(scriptPath, script);
    console.log(`📜 Generated Google Drive script: ${scriptPath}`);
  }

  async scrapeMultipleDishes(dishList, maxImagesPerDish = 3) {
    const results = {};

    for (const { dishName, countryName } of dishList) {
      const result = await this.scrapeAndUpdateDish(dishName, countryName, maxImagesPerDish);
      if (result) {
        results[dishName] = result;
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }

    return results;
  }

  async saveResults(results) {
    const resultsPath = path.join(__dirname, 'enhanced_scraping_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}`);
  }
}

async function main() {
  const scraper = new EnhancedWikipediaScraper();

  try {
    await scraper.init();
    await scraper.loadExistingData();

    // Define dishes to scrape (you can modify this list)
    const dishesToScrape = [
      { dishName: 'Margherita Pizza', countryName: 'Italy' },
      { dishName: 'Spaghetti Carbonara', countryName: 'Italy' },
      { dishName: 'Risotto', countryName: 'Italy' },
      { dishName: 'Gelato', countryName: 'Italy' },
      { dishName: 'Tiramisu', countryName: 'Italy' },
      { dishName: 'Lasagna', countryName: 'Italy' },
      { dishName: 'Osso Buco', countryName: 'Italy' },
      { dishName: 'Bruschetta', countryName: 'Italy' }
    ];

    console.log(`🎯 Scraping images for ${dishesToScrape.length} dishes...`);
    const results = await scraper.scrapeMultipleDishes(dishesToScrape, 3);

    await scraper.saveResults(results);

    console.log('\n🎉 Enhanced scraping complete!');
    console.log('\nNext steps:');
    console.log('1. Review the generated Google Drive upload scripts');
    console.log('2. Upload images to Google Drive using the scripts');
    console.log('3. Google Sheets should be automatically updated');
    console.log('4. Update your API with the new Cloudinary URLs');

  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = EnhancedWikipediaScraper;
