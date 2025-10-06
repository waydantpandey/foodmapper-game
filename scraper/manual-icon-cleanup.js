#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class ManualIconCleanup {
  constructor() {
    this.deletedCount = 0;
    this.errors = [];
  }

  async listImagesInFolder(folderPath) {
    try {
      console.log(`🔍 Listing images in: ${folderPath}`);
      
      const result = await cloudinary.search
        .expression(`folder:${folderPath}/*`)
        .max_results(100)
        .execute();
      
      console.log(`📊 Found ${result.resources.length} images`);
      return result.resources;
    } catch (error) {
      console.error(`❌ Error listing images in ${folderPath}:`, error.message);
      return [];
    }
  }

  async getImageDetails(publicId) {
    try {
      const details = await cloudinary.api.resource(publicId);
      return {
        publicId,
        width: details.width,
        height: details.height,
        format: details.format,
        size: details.bytes,
        url: details.secure_url,
        alt: details.context?.alt || '',
        caption: details.context?.caption || ''
      };
    } catch (error) {
      console.error(`❌ Error getting details for ${publicId}:`, error.message);
      return null;
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

  async analyzeFolder(folderPath) {
    console.log(`\n🔍 Analyzing folder: ${folderPath}`);
    console.log('='.repeat(60));
    
    const images = await this.listImagesInFolder(folderPath);
    
    if (images.length === 0) {
      console.log('✅ No images found in this folder');
      return;
    }

    // Get detailed info for each image
    const imageDetails = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`[${i + 1}/${images.length}] Analyzing ${image.public_id}...`);
      
      const details = await this.getImageDetails(image.public_id);
      if (details) {
        imageDetails.push(details);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Display all images with details
    console.log('\n📋 All images in folder:');
    imageDetails.forEach((img, index) => {
      const aspectRatio = (img.width / img.height).toFixed(2);
      console.log(`\n${index + 1}. ${img.publicId}`);
      console.log(`   Size: ${img.width}x${img.height} (ratio: ${aspectRatio})`);
      console.log(`   Format: ${img.format}, Size: ${(img.size / 1024).toFixed(1)}KB`);
      console.log(`   Alt: "${img.alt}"`);
      console.log(`   Caption: "${img.caption}"`);
      console.log(`   URL: ${img.url}`);
    });

    return imageDetails;
  }

  async interactiveCleanup(folderPath) {
    const imageDetails = await this.analyzeFolder(folderPath);
    
    if (imageDetails.length === 0) {
      return;
    }

    console.log('\n🎯 Manual cleanup options:');
    console.log('1. Delete small images (< 200px)');
    console.log('2. Delete square images (aspect ratio close to 1:1)');
    console.log('3. Delete images with specific keywords');
    console.log('4. Delete all images in this folder');
    console.log('5. Skip this folder');
    
    // For automated cleanup, let's target common icon patterns
    const iconsToDelete = imageDetails.filter(img => {
      const aspectRatio = img.width / img.height;
      const isSmall = img.width < 200 || img.height < 200;
      const isSquare = aspectRatio > 0.8 && aspectRatio < 1.2;
      const hasIconKeywords = img.alt.toLowerCase().includes('icon') || 
                             img.alt.toLowerCase().includes('logo') ||
                             img.caption.toLowerCase().includes('icon') ||
                             img.caption.toLowerCase().includes('logo') ||
                             img.publicId.toLowerCase().includes('icon') ||
                             img.publicId.toLowerCase().includes('logo');
      
      return isSmall || (isSquare && img.width < 300) || hasIconKeywords;
    });

    if (iconsToDelete.length === 0) {
      console.log('✅ No obvious icons found in this folder');
      return;
    }

    console.log(`\n🚫 Found ${iconsToDelete.length} potential icons to delete:`);
    iconsToDelete.forEach((img, index) => {
      const aspectRatio = (img.width / img.height).toFixed(2);
      console.log(`${index + 1}. ${img.publicId} (${img.width}x${img.height}, ratio: ${aspectRatio})`);
      console.log(`   Alt: "${img.alt}"`);
    });

    console.log(`\n⚠️  About to delete ${iconsToDelete.length} potential icons...`);
    console.log('This action cannot be undone!\n');

    // Delete the identified icons
    for (let i = 0; i < iconsToDelete.length; i++) {
      const icon = iconsToDelete[i];
      console.log(`[${i + 1}/${iconsToDelete.length}] Deleting ${icon.publicId}...`);
      
      await this.deleteImage(icon.publicId);
      
      // Small delay to avoid rate limiting
      if (i < iconsToDelete.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`✅ Cleaned ${folderPath}: deleted ${iconsToDelete.length} potential icons`);
  }

  async cleanupAllFolders() {
    console.log('🚀 Manual Icon Cleanup');
    console.log('=====================\n');
    
    // Focus on the folders that are most likely to have icons
    const targetFolders = [
      'food-guessing-game/italy/bruschetta',
      'food-guessing-game/italy/margherita-pizza',
      'food-guessing-game/italy/spaghetti-carbonara',
      'food-guessing-game/italy/risotto',
      'food-guessing-game/italy/gelato',
      'food-guessing-game/italy/tiramisu',
      'food-guessing-game/italy/lasagna',
      'food-guessing-game/italy/osso-buco'
    ];

    for (const folder of targetFolders) {
      await this.interactiveCleanup(folder);
      
      // Small delay between folders
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${this.deletedCount} icons`);
    console.log(`❌ Failed to delete: ${this.errors.length} images`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error.publicId}: ${error.error}`);
      });
    }

    console.log('\n🎉 Manual icon cleanup complete!');
  }
}

async function main() {
  const cleaner = new ManualIconCleanup();

  try {
    await cleaner.cleanupAllFolders();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = ManualIconCleanup;



