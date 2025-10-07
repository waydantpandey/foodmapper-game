const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function generateFoodDatabase() {
  try {
    console.log('🔄 Generating food database from Cloudinary...');
    
    // Get all images from Cloudinary
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 1000,
    });

    console.log(`📊 Found ${result.resources.length} images in Cloudinary`);
    
    // Group images by country and food
    const foodsByCountry = {};
    
    result.resources.forEach(resource => {
      const parts = resource.public_id.split('/');
      if (parts.length >= 3) {
        const country = parts[1];
        const food = parts[2];
        
        if (!foodsByCountry[country]) {
          foodsByCountry[country] = {};
        }
        
        if (!foodsByCountry[country][food]) {
          foodsByCountry[country][food] = [];
        }
        
        foodsByCountry[country][food].push({
          id: resource.public_id,
          url: resource.secure_url,
          width: resource.width,
          height: resource.height
        });
      }
    });
    
    // Convert to the format expected by the game
    const foods = [];
    let foodId = 1;
    
    Object.entries(foodsByCountry).forEach(([country, countryFoods]) => {
      Object.entries(countryFoods).forEach(([foodName, images]) => {
        // Convert food name back to proper format
        const properFoodName = foodName.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        
        foods.push({
          id: foodId++,
          name: properFoodName,
          country: country.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          images: images.map(img => img.url),
          imageCount: images.length
        });
      });
    });
    
    console.log(`📊 Generated ${foods.length} foods`);
    
    // Save to JSON file
    const outputPath = path.join(__dirname, '../data/foods-database.json');
    fs.writeFileSync(outputPath, JSON.stringify(foods, null, 2));
    
    console.log(`💾 Saved to: ${outputPath}`);
    
    // Show sample data
    console.log('\n📋 Sample foods:');
    foods.slice(0, 5).forEach(food => {
      console.log(`  ${food.name} (${food.country}) - ${food.imageCount} images`);
    });
    
    // Show statistics
    const countries = [...new Set(foods.map(food => food.country))];
    console.log(`\n📊 Statistics:`);
    console.log(`  Countries: ${countries.length}`);
    console.log(`  Total foods: ${foods.length}`);
    console.log(`  Total images: ${result.resources.length}`);
    console.log(`  Average images per food: ${(result.resources.length / foods.length).toFixed(1)}`);
    
    return foods;
    
  } catch (error) {
    console.error('❌ Error generating food database:', error);
  }
}

// Run the generation
generateFoodDatabase();
