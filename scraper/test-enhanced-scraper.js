#!/usr/bin/env node

const EnhancedWikipediaScraper = require('./enhanced-wikipedia-scraper');

async function testScraper() {
  console.log('🧪 Testing Enhanced Wikipedia Scraper\n');
  
  const scraper = new EnhancedWikipediaScraper();
  
  try {
    await scraper.init();
    
    // Test with a single dish first
    const testDish = { dishName: 'Margherita Pizza', countryName: 'Italy' };
    
    console.log('🔍 Testing with:', testDish.dishName);
    
    // Test scraping images
    const images = await scraper.scrapeFoodImages(testDish.dishName, 2);
    console.log(`📸 Found ${images.length} images`);
    
    if (images.length > 0) {
      console.log('✅ Scraping works!');
      
      // Test Cloudinary upload (just one image)
      const uploadResult = await scraper.uploadImageToCloudinary(
        images[0].url,
        testDish.dishName,
        testDish.countryName,
        0
      );
      
      if (uploadResult) {
        console.log('✅ Cloudinary upload works!');
        console.log('🔗 URL:', uploadResult.secureUrl);
      } else {
        console.log('❌ Cloudinary upload failed');
      }
    } else {
      console.log('❌ No images found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await scraper.close();
  }
  
  console.log('\n🎉 Test complete!');
  console.log('\nNext steps:');
  console.log('1. Set up Google Sheets integration: node setup-google-integration.js');
  console.log('2. Add new columns: node google-sheets-updater.js');
  console.log('3. Run full scraper: node enhanced-wikipedia-scraper.js');
}

testScraper().catch(console.error);



