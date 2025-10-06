#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class SpecificIconRemoval {
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

  isHookIcon(image) {
    // Look for images that might be the hook icon
    // These are typically small, have unusual aspect ratios, or are very small files
    
    const aspectRatio = image.width / image.height;
    
    // Check for very small images (likely icons)
    const isVerySmall = image.width < 100 || image.height < 100;
    
    // Check for very small file sizes (icons are usually small)
    const isVerySmallFile = image.size < 10000; // Less than 10KB
    
    // Check for unusual aspect ratios (not typical food photo ratios)
    const isUnusualRatio = aspectRatio < 0.5 || aspectRatio > 2;
    
    // Check for very small width or height
    const isTiny = image.width < 50 || image.height < 50;
    
    // Check for PNG format with very small size (common for icons)
    const isSmallPng = image.format === 'png' && image.size < 20000;
    
    // Check for very small JPG with unusual ratio
    const isSmallJpgUnusual = image.format === 'jpg' && image.size < 15000 && (aspectRatio < 0.7 || aspectRatio > 1.5);
    
    return isVerySmall || isVerySmallFile || isUnusualRatio || isTiny || isSmallPng || isSmallJpgUnusual;
  }

  async removeHookIcons() {
    console.log('🚀 Specific Hook Icon Removal');
    console.log('=============================\n');
    
    // Target the bruschetta folder specifically first
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
      console.log(`\n🔍 Checking folder: ${folder}`);
      console.log('='.repeat(50));
      
      const images = await this.listImagesInFolder(folder);
      
      if (images.length === 0) {
        console.log('✅ No images found in this folder');
        continue;
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
        console.log(`   URL: ${img.url}`);
      });

      // Identify potential hook icons
      const hookIcons = imageDetails.filter(img => this.isHookIcon(img));
      
      if (hookIcons.length === 0) {
        console.log('\n✅ No hook icons found in this folder');
        continue;
      }

      console.log(`\n🚫 Found ${hookIcons.length} potential hook icons to delete:`);
      hookIcons.forEach((img, index) => {
        const aspectRatio = (img.width / img.height).toFixed(2);
        console.log(`\n${index + 1}. ${img.publicId}`);
        console.log(`   Size: ${img.width}x${img.height} (ratio: ${aspectRatio})`);
        console.log(`   Format: ${img.format}, Size: ${(img.size / 1024).toFixed(1)}KB`);
        console.log(`   URL: ${img.url}`);
      });

      console.log(`\n⚠️  About to delete ${hookIcons.length} potential hook icons...`);
      console.log('This action cannot be undone!\n');

      // Delete the identified hook icons
      for (let i = 0; i < hookIcons.length; i++) {
        const icon = hookIcons[i];
        console.log(`[${i + 1}/${hookIcons.length}] Deleting ${icon.publicId}...`);
        
        await this.deleteImage(icon.publicId);
        
        // Small delay to avoid rate limiting
        if (i < hookIcons.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`✅ Cleaned ${folder}: deleted ${hookIcons.length} potential hook icons`);
      
      // Small delay between folders
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${this.deletedCount} hook icons`);
    console.log(`❌ Failed to delete: ${this.errors.length} images`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error.publicId}: ${error.error}`);
      });
    }

    console.log('\n🎉 Hook icon removal complete!');
  }
}

async function main() {
  const remover = new SpecificIconRemoval();

  try {
    await remover.removeHookIcons();
  } catch (error) {
    console.error('❌ Hook icon removal failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = SpecificIconRemoval;



