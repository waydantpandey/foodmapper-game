#!/usr/bin/env node

const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary').v2;
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const GoogleSheetsUpdater = require('./google-sheets-updater');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class FullComprehensiveScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.drive = null;
    this.sheetsUpdater = null;
    this.foodsData = [];
    this.scrapedCount = 0;
    this.totalCount = 0;
    this.errors = [];
    this.results = [];
    this.googleDriveImages = new Map();
    this.batchSize = 10;
  }

  async init() {
    console.log('🚀 Full Comprehensive Scraper');
    console.log('=============================\n');
    
    // Load foods data
    this.foodsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/foods.json'), 'utf8'));
    this.totalCount = this.foodsData.length;
    
    console.log(`📊 Loaded ${this.totalCount} dishes from ${this.getUniqueCountries().length} countries`);
    
    // Initialize Google APIs
    await this.initGoogleAPIs();
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async initGoogleAPIs() {
    try {
      // Load credentials
      const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
      
      // Initialize Google Drive API
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.drive = google.drive({ version: 'v3', auth });
      
      // Initialize Google Sheets updater
      this.sheetsUpdater = new GoogleSheetsUpdater();
      await this.sheetsUpdater.init();
      
      console.log('✅ Google APIs initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google APIs:', error.message);
      console.log('Please ensure credentials.json exists in the scraper folder');
      throw error;
    }
  }

  getUniqueCountries() {
    const countries = [...new Set(this.foodsData.map(food => food.location))];
    return countries.sort();
  }

  async checkGoogleDriveImages() {
    console.log('🔍 Checking Google Drive for existing images...');
    
    try {
      // Search for food-guessing-game folder
      const response = await this.drive.files.list({
        q: "name='food-guessing-game' and mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)'
      });

      if (response.data.files.length === 0) {
        console.log('❌ No food-guessing-game folder found in Google Drive');
        return;
      }

      const mainFolderId = response.data.files[0].id;
      console.log(`📁 Found main folder: ${mainFolderId}`);

      // Get all country folders
      const countryFolders = await this.drive.files.list({
        q: `'${mainFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      console.log(`🌍 Found ${countryFolders.data.files.length} country folders`);

      // Process each country folder
      for (const countryFolder of countryFolders.data.files) {
        const countryName = countryFolder.name;
        console.log(`\n📍 Processing ${countryName}...`);

        // Get dish folders within this country
        const dishFolders = await this.drive.files.list({
          q: `'${countryFolder.id}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)'
        });

        for (const dishFolder of dishFolders.data.files) {
          const dishName = dishFolder.name;
          const key = `${countryName}|${dishName}`;

          // Get images in this dish folder
          const images = await this.drive.files.list({
            q: `'${dishFolder.id}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, webViewLink, webContentLink)'
          });

          if (images.data.files.length > 0) {
            console.log(`  📸 Found ${images.data.files.length} images for ${dishName}`);
            this.googleDriveImages.set(key, {
              country: countryName,
              dish: dishName,
              folderId: dishFolder.id,
              images: images.data.files
            });
          }
        }
      }

      console.log(`\n📊 Total dishes with Google Drive images: ${this.googleDriveImages.size}`);
    } catch (error) {
      console.error('❌ Error checking Google Drive:', error.message);
    }
  }

  async scrapeFood(food) {
    try {
      console.log(`\n🍽️  [${this.scrapedCount + this.errors.length + 1}/${this.totalCount}] Scraping: ${food.name} (${food.location})`);
      
      // Check if we already have Google Drive images for this dish
      const key = `${food.location}|${food.name}`;
      const existingImages = this.googleDriveImages.get(key);
      
      if (existingImages) {
        console.log(`📁 Found ${existingImages.images.length} existing Google Drive images`);
        return await this.processExistingGoogleDriveImages(existingImages, food);
      }

      // Always scrape from Wikipedia to get more images
      return await this.scrapeFromWikipedia(food);

    } catch (error) {
      console.error(`❌ Error processing ${food.name}:`, error.message);
      this.errors.push({ dish: food.name, error: error.message });
      return { success: false, images: [], error: error.message };
    }
  }

  async processExistingGoogleDriveImages(existingImages, food) {
    try {
      console.log(`🔄 Processing existing Google Drive images for ${food.name}...`);
      
      const uploadedImages = [];
      
      for (let i = 0; i < existingImages.images.length; i++) {
        const driveImage = existingImages.images[i];
        
        try {
          // Download image from Google Drive
          const imageBuffer = await this.downloadImageFromDrive(driveImage.id);
          
          // Upload to Cloudinary
          const cloudinaryImage = await this.uploadImageToCloudinary(
            imageBuffer, 
            food.name, 
            food.location, 
            i
          );
          
          if (cloudinaryImage) {
            uploadedImages.push(cloudinaryImage);
            console.log(`✅ Processed image ${i + 1}/${existingImages.images.length}`);
            
            // Rename in Google Drive
            await this.renameImageInDrive(
              driveImage.id, 
              `${food.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}.jpg`
            );
          }
        } catch (error) {
          console.log(`❌ Failed to process image ${i + 1}: ${error.message}`);
        }
      }

      console.log(`✅ Successfully processed ${uploadedImages.length} existing images for ${food.name}`);
      
      // Also scrape Wikipedia for additional images
      console.log(`🌐 Scraping Wikipedia for additional images for ${food.name}...`);
      const wikipediaResult = await this.scrapeFromWikipedia(food, uploadedImages.length);
      
      if (wikipediaResult.success && wikipediaResult.images.length > 0) {
        console.log(`📸 Found ${wikipediaResult.images.length} additional images from Wikipedia`);
        uploadedImages.push(...wikipediaResult.images);
      }

      this.scrapedCount++;
      
      // Update Google Sheets
      if (uploadedImages.length > 0) {
        await this.sheetsUpdater.updateOrAddDish(
          food.name, 
          food.location, 
          uploadedImages.map(img => img.url)
        );
      }
      
      return {
        success: true,
        images: uploadedImages,
        dish: food,
        source: 'google_drive_and_wikipedia'
      };

    } catch (error) {
      console.error(`❌ Error processing existing images for ${food.name}:`, error.message);
      this.errors.push({ dish: food.name, error: error.message });
      return { success: false, images: [], error: error.message };
    }
  }

  async scrapeFromWikipedia(food, startIndex = 0) {
    try {
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
        return await this.searchAndScrape(food, startIndex);
      }

      // Extract images
      const images = await this.extractImagesFromCurrentPage();
      
      if (images.length > 0) {
        console.log(`📸 Found ${images.length} images from Wikipedia`);
        return await this.uploadImagesFromWikipedia(images, food, startIndex);
      } else {
        console.log('❌ No images found, trying search...');
        return await this.searchAndScrape(food, startIndex);
      }

    } catch (error) {
      console.log(`❌ Direct URL failed: ${error.message}`);
      return await this.searchAndScrape(food, startIndex);
    }
  }

  async searchAndScrape(food, startIndex = 0) {
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
          return await this.uploadImagesFromWikipedia(images, food, startIndex);
        }
      }

      console.log('❌ No images found for this dish');
      return { success: false, images: [], error: 'No images found' };

    } catch (error) {
      console.error(`❌ Search failed: ${error.message}`);
      this.errors.push({ dish: food.name, error: error.message });
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

  async uploadImagesFromWikipedia(images, food, startIndex = 0) {
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
            startIndex + i
          );
          
          if (cloudinaryImage) {
            uploadedImages.push(cloudinaryImage);
            console.log(`✅ Uploaded image ${startIndex + i + 1} (${i + 1}/${Math.min(images.length, 3)})`);
            
            // Upload to Google Drive
            await this.uploadImageToGoogleDrive(
              imageBuffer,
              food.name,
              food.location,
              startIndex + i
            );
          }
        } catch (error) {
          console.log(`❌ Failed to upload image ${startIndex + i + 1}: ${error.message}`);
        }
      }

      this.scrapedCount++;
      console.log(`✅ Successfully scraped ${food.name}: ${uploadedImages.length} images uploaded`);
      
      // Update Google Sheets
      if (uploadedImages.length > 0) {
        await this.sheetsUpdater.updateOrAddDish(
          food.name, 
          food.location, 
          uploadedImages.map(img => img.url)
        );
      }
      
      return {
        success: true,
        images: uploadedImages,
        dish: food,
        source: 'wikipedia'
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${food.name}:`, error.message);
      this.errors.push({ dish: food.name, error: error.message });
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

  async downloadImageFromDrive(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'stream' });
      
      return new Promise((resolve, reject) => {
        const chunks = [];
        response.data.on('data', (chunk) => chunks.push(chunk));
        response.data.on('end', () => resolve(Buffer.concat(chunks)));
        response.data.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download from Drive: ${error.message}`);
    }
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

  async uploadImageToGoogleDrive(imageBuffer, dishName, countryName, imageIndex) {
    try {
      const fileName = `${dishName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${imageIndex + 1}.jpg`;
      
      // Find or create country folder
      const countryFolderId = await this.findOrCreateFolder(
        'food-guessing-game',
        countryName
      );
      
      // Find or create dish folder
      const dishFolderId = await this.findOrCreateFolder(
        countryFolderId,
        dishName
      );
      
      // Upload image
      const fileMetadata = {
        name: fileName,
        parents: [dishFolderId]
      };
      
      const file = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType: 'image/jpeg',
          body: imageBuffer
        },
        fields: 'id'
      });
      
      console.log(`📁 Uploaded to Google Drive: ${fileName}`);
      return file.data.id;
    } catch (error) {
      console.error(`❌ Failed to upload to Google Drive: ${error.message}`);
      throw error;
    }
  }

  async findOrCreateFolder(parentId, folderName) {
    try {
      // If parentId is a string like 'food-guessing-game', search for it first
      if (typeof parentId === 'string' && !parentId.startsWith('1')) {
        const searchResponse = await this.drive.files.list({
          q: `name='${parentId}' and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)'
        });
        
        if (searchResponse.data.files.length > 0) {
          parentId = searchResponse.data.files[0].id;
        } else {
          // Create the parent folder first (in root)
          const parentMetadata = {
            name: parentId,
            mimeType: 'application/vnd.google-apps.folder'
          };
          
          const parentFolder = await this.drive.files.create({
            resource: parentMetadata,
            fields: 'id'
          });
          
          parentId = parentFolder.data.id;
        }
      }

      // Search for existing folder
      const response = await this.drive.files.list({
        q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create new folder
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      };

      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      throw new Error(`Failed to find/create folder: ${error.message}`);
    }
  }

  async renameImageInDrive(fileId, newName) {
    try {
      await this.drive.files.update({
        fileId: fileId,
        resource: { name: newName }
      });
      console.log(`📝 Renamed in Google Drive: ${newName}`);
    } catch (error) {
      console.error(`❌ Failed to rename in Google Drive: ${error.message}`);
    }
  }

  async scrapeBatch(dishes) {
    console.log(`\n🔄 Processing batch of ${dishes.length} dishes`);
    console.log('='.repeat(50));

    for (const food of dishes) {
      const result = await this.scrapeFood(food);
      this.results.push(result);
      
      // Progress update
      const progress = ((this.scrapedCount + this.errors.length) / this.totalCount * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${this.scrapedCount + this.errors.length}/${this.totalCount})`);
      
      // Small delay between dishes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async scrapeAllFoods() {
    console.log('🚀 Starting full comprehensive scraping...\n');
    
    // Check existing Google Drive images first
    await this.checkGoogleDriveImages();
    
    // Process dishes in batches
    for (let i = 0; i < this.foodsData.length; i += this.batchSize) {
      const batch = this.foodsData.slice(i, i + this.batchSize);
      console.log(`\n🔄 Batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(this.foodsData.length / this.batchSize)}`);
      
      await this.scrapeBatch(batch);
      
      // Break between batches
      if (i + this.batchSize < this.foodsData.length) {
        console.log('\n⏸️  Taking a 10-second break between batches...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    await this.generateReport();
  }

  async generateReport() {
    console.log('\n📊 FULL COMPREHENSIVE SCRAPING REPORT');
    console.log('=====================================\n');
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`✅ Successfully processed: ${successful.length} dishes`);
    console.log(`❌ Failed to process: ${failed.length} dishes`);
    console.log(`📸 Total images processed: ${successful.reduce((sum, r) => sum + r.images.length, 0)}`);
    
    // Group by source
    const fromGoogleDrive = successful.filter(r => r.source === 'google_drive');
    const fromWikipedia = successful.filter(r => r.source === 'wikipedia');
    
    console.log(`📁 From Google Drive: ${fromGoogleDrive.length} dishes`);
    console.log(`🌐 From Wikipedia: ${fromWikipedia.length} dishes`);
    
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
      fromGoogleDrive: fromGoogleDrive.length,
      fromWikipedia: fromWikipedia.length,
      byCountry: byCountry,
      results: this.results
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'full-comprehensive-report.json'), 
      JSON.stringify(reportData, null, 2)
    );
    
    console.log('\n💾 Report saved to: full-comprehensive-report.json');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const scraper = new FullComprehensiveScraper();
  
  try {
    await scraper.init();
    await scraper.scrapeAllFoods();
  } catch (error) {
    console.error('❌ Full scraping failed:', error);
  } finally {
    await scraper.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = FullComprehensiveScraper;
