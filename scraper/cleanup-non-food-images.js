#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class NonFoodImageCleaner {
  constructor() {
    this.deletedCount = 0;
    this.errors = [];
    this.nonFoodKeywords = [
      'wikimedia', 'commons', 'wikibooks', 'wikipedia', 'logo', 'icon', 'symbol',
      'flag', 'banner', 'header', 'footer', 'button', 'arrow', 'star', 'badge',
      'medal', 'award', 'trophy', 'certificate', 'diagram', 'chart', 'graph',
      'map', 'location', 'pin', 'marker', 'sign', 'signage', 'text', 'font',
      'typography', 'letter', 'number', 'digit', 'character', 'symbol', 'emblem',
      'crest', 'coat', 'arms', 'seal', 'stamp', 'watermark', 'transparent',
      'background', 'pattern', 'texture', 'border', 'frame', 'outline'
    ];
  }

  isNonFoodImage(publicId, alt, title) {
    const text = `${publicId} ${alt || ''} ${title || ''}`.toLowerCase();
    
    // Check for non-food keywords
    const hasNonFoodKeyword = this.nonFoodKeywords.some(keyword => 
      text.includes(keyword)
    );
    
    // Check for common non-food patterns
    const isTransparentIcon = text.includes('transparent') || 
                            text.includes('icon') || 
                            text.includes('logo');
    
    const isSvgOrSymbol = text.includes('.svg') || 
                         text.includes('symbol') ||
                         text.includes('emblem');
    
    return hasNonFoodKeyword || isTransparentIcon || isSvgOrSymbol;
  }

  async listAllFoodImages() {
    try {
      console.log('🔍 Searching for all food images...');
      
      const result = await cloudinary.search
        .expression('folder:food-guessing-game/*/*')
        .max_results(500)
        .execute();
      
      console.log(`📊 Found ${result.resources.length} total images`);
      return result.resources;
    } catch (error) {
      console.error('❌ Error listing images:', error.message);
      return [];
    }
  }

  async identifyNonFoodImages(images) {
    const nonFoodImages = [];
    
    console.log('\n🔍 Analyzing images for non-food content...');
    
    images.forEach(image => {
      const isNonFood = this.isNonFoodImage(
        image.public_id, 
        image.context?.alt || '', 
        image.context?.caption || ''
      );
      
      if (isNonFood) {
        nonFoodImages.push(image);
        console.log(`🚫 Non-food image: ${image.public_id}`);
      }
    });
    
    return nonFoodImages;
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

  async cleanupNonFoodImages() {
    console.log('🧹 Starting non-food image cleanup...\n');
    
    // Get all images
    const allImages = await this.listAllFoodImages();
    
    if (allImages.length === 0) {
      console.log('✅ No images found to analyze');
      return;
    }

    // Identify non-food images
    const nonFoodImages = await this.identifyNonFoodImages(allImages);
    
    if (nonFoodImages.length === 0) {
      console.log('✅ No non-food images found to delete');
      return;
    }

    console.log(`\n📋 Found ${nonFoodImages.length} non-food images to delete:`);
    nonFoodImages.forEach((img, index) => {
      console.log(`${index + 1}. ${img.public_id}`);
    });

    console.log(`\n⚠️  About to delete ${nonFoodImages.length} non-food images...`);
    console.log('This action cannot be undone!\n');

    // Delete non-food images
    for (let i = 0; i < nonFoodImages.length; i++) {
      const image = nonFoodImages[i];
      console.log(`[${i + 1}/${nonFoodImages.length}] Deleting ${image.public_id}...`);
      
      await this.deleteImage(image.public_id);
      
      // Add small delay to avoid rate limiting
      if (i < nonFoodImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${this.deletedCount} non-food images`);
    console.log(`❌ Failed to delete: ${this.errors.length} images`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error.publicId}: ${error.error}`);
      });
    }

    console.log('\n🎉 Non-food image cleanup complete!');
  }

  async listRemainingImages() {
    console.log('\n🔍 Checking remaining images...');
    
    const result = await cloudinary.search
      .expression('folder:food-guessing-game/*/*')
      .max_results(100)
      .execute();
    
    console.log(`📊 Total remaining images: ${result.resources.length}`);
    
    // Group by folder
    const folderCounts = {};
    result.resources.forEach(img => {
      const folder = img.public_id.split('/').slice(0, -1).join('/');
      folderCounts[folder] = (folderCounts[folder] || 0) + 1;
    });
    
    console.log('\n📁 Images by folder:');
    Object.entries(folderCounts).forEach(([folder, count]) => {
      console.log(`  ${folder}: ${count} images`);
    });
  }
}

async function main() {
  const cleaner = new NonFoodImageCleaner();

  try {
    console.log('🚀 Non-Food Image Cleaner');
    console.log('=========================\n');
    
    // Clean up non-food images
    await cleaner.cleanupNonFoodImages();
    
    // List remaining images
    await cleaner.listRemainingImages();
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = NonFoodImageCleaner;




