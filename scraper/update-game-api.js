#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Cloudinary configuration
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dwav84wrk',
  api_key: '589773693657812',
  api_secret: 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

// Path to the API file
const API_FILE = '../src/app/api/foods/route.ts';

async function updateGameAPI() {
  try {
    console.log('🔄 Updating game API with new Cloudinary images...');
    
    // Get all images from Cloudinary
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game/',
      max_results: 1000
    });
    
    console.log(`📸 Found ${result.resources.length} images in Cloudinary`);
    
    // Group images by dish
    const dishImages = {};
    
    result.resources.forEach(resource => {
      // Extract dish name from public_id
      // Format: food-guessing-game/{country}/{dish}/{dish}_{number}.{ext}
      const parts = resource.public_id.split('/');
      if (parts.length >= 4) {
        const country = parts[1];
        const dish = parts[2];
        const fileName = parts[3];
        
        // Skip if this looks like a folder name or invalid structure
        if (fileName.includes('food-guessing-game') || !fileName.includes('_')) {
          return;
        }
        
        // Extract dish name from filename (remove _number.ext)
        const dishName = fileName.replace(/_\d+\.(jpg|png|jpeg)$/i, '');
        const cleanDishName = dishName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Skip if dish name is too short or looks invalid
        if (cleanDishName.length < 3 || cleanDishName.includes('food-guessing-game')) {
          return;
        }
        
        if (!dishImages[cleanDishName]) {
          dishImages[cleanDishName] = [];
        }
        
        dishImages[cleanDishName].push(resource.secure_url);
      }
    });
    
    console.log(`🍽️  Found images for ${Object.keys(dishImages).length} dishes`);
    
    // Read current API file
    let apiContent = fs.readFileSync(API_FILE, 'utf8');
    
    // Find the cloudinaryImages object
    const cloudinaryImagesMatch = apiContent.match(/const cloudinaryImages: \{ \[key: string\]: string\[\] \} = \{([\s\S]*?)\};/);
    
    if (cloudinaryImagesMatch) {
      // Generate new cloudinaryImages object
      let newCloudinaryImages = 'const cloudinaryImages: { [key: string]: string[] } = {\n';
      
      Object.entries(dishImages).forEach(([dishName, urls]) => {
        newCloudinaryImages += `  '${dishName}': [\n`;
        urls.forEach(url => {
          newCloudinaryImages += `    '${url}',\n`;
        });
        newCloudinaryImages += `  ],\n`;
      });
      
      newCloudinaryImages += '};';
      
      // Replace the cloudinaryImages object
      apiContent = apiContent.replace(
        /const cloudinaryImages: \{ \[key: string\]: string\[\] \} = \{[\s\S]*?\};/,
        newCloudinaryImages
      );
      
      // Write updated API file
      fs.writeFileSync(API_FILE, apiContent);
      
      console.log('✅ Game API updated successfully!');
      console.log(`📊 Updated ${Object.keys(dishImages).length} dishes with ${result.resources.length} total images`);
      
      // Show some examples
      console.log('\n📋 Sample dishes with images:');
      Object.entries(dishImages).slice(0, 5).forEach(([dishName, urls]) => {
        console.log(`  - ${dishName}: ${urls.length} images`);
      });
      
    } else {
      console.log('❌ Could not find cloudinaryImages object in API file');
    }
    
  } catch (error) {
    console.error('❌ Error updating game API:', error.message);
  }
}

// Run the update
updateGameAPI();
