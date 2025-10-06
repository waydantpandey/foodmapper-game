#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class WikipediaFolderCleaner {
  constructor() {
    this.deletedCount = 0;
    this.errors = [];
  }

  async listWikipediaImages() {
    try {
      console.log('🔍 Searching for Wikipedia folder images...');
      
      const result = await cloudinary.search
        .expression('folder:food-guessing-game/Wikipedia/*')
        .max_results(500)
        .execute();
      
      console.log(`📊 Found ${result.resources.length} images in Wikipedia folder`);
      return result.resources;
    } catch (error) {
      console.error('❌ Error listing Wikipedia images:', error.message);
      return [];
    }
  }

  async deleteImage(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`✅ Deleted: ${publicId}`);
      this.deletedCount++;
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${publicId}:`, error.message);
      this.errors.push({ publicId, error: error.message });
      return false;
    }
  }

  async deleteWikipediaFolder() {
    console.log('🗑️  Starting Wikipedia folder cleanup...\n');
    
    // List all images in Wikipedia folder
    const images = await this.listWikipediaImages();
    
    if (images.length === 0) {
      console.log('✅ No Wikipedia images found to delete');
      return;
    }

    console.log('\n📋 Images to delete:');
    images.forEach((img, index) => {
      console.log(`${index + 1}. ${img.public_id}`);
    });

    console.log(`\n⚠️  About to delete ${images.length} images from Wikipedia folder...`);
    console.log('This action cannot be undone!\n');

    // Delete images one by one
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`[${i + 1}/${images.length}] Deleting ${image.public_id}...`);
      
      await this.deleteImage(image.public_id);
      
      // Add small delay to avoid rate limiting
      if (i < images.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${this.deletedCount} images`);
    console.log(`❌ Failed to delete: ${this.errors.length} images`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error.publicId}: ${error.error}`);
      });
    }

    // Try to delete the folder itself (if empty)
    try {
      console.log('\n🗂️  Attempting to delete empty Wikipedia folder...');
      await cloudinary.api.delete_folder('food-guessing-game/Wikipedia');
      console.log('✅ Wikipedia folder deleted successfully');
    } catch (error) {
      console.log('⚠️  Could not delete folder (may not be empty or may not exist):', error.message);
    }

    console.log('\n🎉 Wikipedia folder cleanup complete!');
  }

  async listRemainingWikipediaImages() {
    console.log('\n🔍 Checking for any remaining Wikipedia images...');
    
    const result = await cloudinary.search
      .expression('folder:food-guessing-game/Wikipedia/*')
      .max_results(100)
      .execute();
    
    if (result.resources.length === 0) {
      console.log('✅ No Wikipedia images remaining');
    } else {
      console.log(`⚠️  ${result.resources.length} Wikipedia images still exist:`);
      result.resources.forEach(img => {
        console.log(`  - ${img.public_id}`);
      });
    }
  }
}

async function main() {
  const cleaner = new WikipediaFolderCleaner();

  try {
    console.log('🚀 Wikipedia Folder Cleaner');
    console.log('==========================\n');
    
    // Delete Wikipedia folder images
    await cleaner.deleteWikipediaFolder();
    
    // Check for any remaining images
    await cleaner.listRemainingWikipediaImages();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = WikipediaFolderCleaner;




