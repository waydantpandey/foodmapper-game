const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkCloudinaryUploads() {
  try {
    console.log('🔍 Checking Cloudinary uploads...');
    
    // Check for images in the food-guessing-game folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 1000,
    });

    console.log(`📊 Found ${result.resources.length} images in Cloudinary`);
    
    if (result.resources.length > 0) {
      console.log('\n📸 Sample uploaded images:');
      result.resources.slice(0, 10).forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.public_id}`);
      });
      
      if (result.resources.length > 10) {
        console.log(`  ... and ${result.resources.length - 10} more images`);
      }
      
      // Group by country
      const countries = {};
      result.resources.forEach(resource => {
        const parts = resource.public_id.split('/');
        if (parts.length >= 2) {
          const country = parts[1];
          countries[country] = (countries[country] || 0) + 1;
        }
      });
      
      console.log('\n🌍 Images by country:');
      Object.entries(countries).forEach(([country, count]) => {
        console.log(`  ${country}: ${count} images`);
      });
      
    } else {
      console.log('❌ No images found in Cloudinary');
    }
    
  } catch (error) {
    console.error('❌ Error checking Cloudinary:', error);
  }
}

// Run the check
checkCloudinaryUploads();
