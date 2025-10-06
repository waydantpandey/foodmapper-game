#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class APIUpdater {
  constructor() {
    this.apiPath = path.join(__dirname, '../src/app/api/foods/route.ts');
    this.reportPath = path.join(__dirname, 'batch-scraping-report.json');
  }

  async loadScrapingReport() {
    try {
      if (!fs.existsSync(this.reportPath)) {
        console.log('❌ No scraping report found. Please run the batch scraper first.');
        return null;
      }
      
      const reportData = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
      console.log(`📊 Loaded scraping report: ${reportData.successful} successful, ${reportData.failed} failed`);
      return reportData;
    } catch (error) {
      console.error('❌ Error loading scraping report:', error.message);
      return null;
    }
  }

  generateCloudinaryMapping(reportData) {
    const cloudinaryImages = {};
    
    reportData.results.forEach(result => {
      if (result.success && result.images.length > 0) {
        const dishName = result.dish.name;
        const imageUrls = result.images.map(img => img.url);
        
        cloudinaryImages[dishName] = imageUrls;
      }
    });
    
    return cloudinaryImages;
  }

  async updateAPI(cloudinaryImages) {
    try {
      console.log('📝 Updating API with scraped images...');
      
      // Read current API file
      let apiContent = fs.readFileSync(this.apiPath, 'utf8');
      
      // Find the cloudinaryImages object
      const startMarker = 'const cloudinaryImages = {';
      const endMarker = '};';
      
      const startIndex = apiContent.indexOf(startMarker);
      const endIndex = apiContent.indexOf(endMarker, startIndex) + endMarker.length;
      
      if (startIndex === -1 || endIndex === -1) {
        console.log('❌ Could not find cloudinaryImages object in API file');
        return false;
      }
      
      // Generate new cloudinaryImages object
      const newCloudinaryImages = this.formatCloudinaryImages(cloudinaryImages);
      
      // Replace the cloudinaryImages object
      const before = apiContent.substring(0, startIndex);
      const after = apiContent.substring(endIndex);
      
      const newApiContent = before + newCloudinaryImages + after;
      
      // Write updated API file
      fs.writeFileSync(this.apiPath, newApiContent);
      
      console.log('✅ API updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Error updating API:', error.message);
      return false;
    }
  }

  formatCloudinaryImages(cloudinaryImages) {
    let result = 'const cloudinaryImages = {\n';
    
    Object.entries(cloudinaryImages).forEach(([dishName, urls]) => {
      result += `  '${dishName}': [\n`;
      urls.forEach(url => {
        result += `    '${url}',\n`;
      });
      result += `  ],\n`;
    });
    
    result += '};';
    return result;
  }

  async update() {
    console.log('🚀 API Updater');
    console.log('==============\n');
    
    // Load scraping report
    const reportData = await this.loadScrapingReport();
    if (!reportData) {
      return;
    }
    
    // Generate cloudinary mapping
    const cloudinaryImages = this.generateCloudinaryMapping(reportData);
    
    console.log(`📊 Generated mapping for ${Object.keys(cloudinaryImages).length} dishes`);
    
    // Update API
    const success = await this.updateAPI(cloudinaryImages);
    
    if (success) {
      console.log('\n🎉 API update complete!');
      console.log(`✅ Updated ${Object.keys(cloudinaryImages).length} dishes with Wikipedia images`);
    } else {
      console.log('\n❌ API update failed');
    }
  }
}

async function main() {
  const updater = new APIUpdater();
  await updater.update();
}

if (require.main === module) {
  main();
}

module.exports = APIUpdater;




