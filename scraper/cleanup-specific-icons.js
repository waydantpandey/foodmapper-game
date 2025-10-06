#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class SpecificIconCleaner {
  constructor() {
    this.deletedCount = 0;
    this.errors = [];
  }

  async listImagesInFolder(folderPath) {
    try {
      console.log(`🔍 Searching in folder: ${folderPath}`);
      
      const result = await cloudinary.search
        .expression(`folder:${folderPath}/*`)
        .max_results(100)
        .execute();
      
      return result.resources;
    } catch (error) {
      console.error(`❌ Error listing images in ${folderPath}:`, error.message);
      return [];
    }
  }

  isIconOrLogo(image) {
    const publicId = image.public_id.toLowerCase();
    const alt = (image.context?.alt || '').toLowerCase();
    const caption = (image.context?.caption || '').toLowerCase();
    
    // Check for specific icon/logo patterns
    const iconPatterns = [
      'wikimedia', 'commons', 'wikibooks', 'wikipedia',
      'logo', 'icon', 'symbol', 'emblem', 'badge',
      'transparent', 'background', 'pattern'
    ];
    
    const hasIconKeyword = iconPatterns.some(pattern => 
      publicId.includes(pattern) || 
      alt.includes(pattern) || 
      caption.includes(pattern)
    );
    
    // Check if it's a small image (likely an icon)
    const isSmall = image.width < 200 || image.height < 200;
    
    // Check for common icon file patterns
    const isIconFile = publicId.includes('icon') || 
                      publicId.includes('logo') || 
                      publicId.includes('symbol') ||
                      publicId.includes('badge');
    
    return hasIconKeyword || (isSmall && isIconFile);
  }

  async analyzeImage(image) {
    try {
      // Get detailed image info
      const details = await cloudinary.api.resource(image.public_id);
      
      return {
        publicId: image.public_id,
        width: details.width,
        height: details.height,
        format: details.format,
        size: details.bytes,
        alt: image.context?.alt || '',
        caption: image.context?.caption || '',
        isIcon: this.isIconOrLogo(image)
      };
    } catch (error) {
      console.error(`❌ Error analyzing ${image.public_id}:`, error.message);
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

  async cleanupFolder(folderPath) {
    console.log(`\n🧹 Cleaning folder: ${folderPath}`);
    console.log('='.repeat(50));
    
    const images = await this.listImagesInFolder(folderPath);
    
    if (images.length === 0) {
      console.log('✅ No images found in this folder');
      return;
    }

    console.log(`📊 Found ${images.length} images in folder`);

    // Analyze each image
    const imageDetails = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`[${i + 1}/${images.length}] Analyzing ${image.public_id}...`);
      
      const details = await this.analyzeImage(image);
      if (details) {
        imageDetails.push(details);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Identify icons and logos
    const iconsToDelete = imageDetails.filter(img => img.isIcon);
    
    if (iconsToDelete.length === 0) {
      console.log('✅ No icons or logos found in this folder');
      return;
    }

    console.log(`\n🚫 Found ${iconsToDelete.length} icons/logos to delete:`);
    iconsToDelete.forEach((img, index) => {
      console.log(`${index + 1}. ${img.publicId} (${img.width}x${img.height}, ${img.format})`);
      console.log(`   Alt: "${img.alt}"`);
      console.log(`   Caption: "${img.caption}"`);
    });

    console.log(`\n⚠️  About to delete ${iconsToDelete.length} icons/logos...`);
    console.log('This action cannot be undone!\n');

    // Delete icons
    for (let i = 0; i < iconsToDelete.length; i++) {
      const icon = iconsToDelete[i];
      console.log(`[${i + 1}/${iconsToDelete.length}] Deleting ${icon.publicId}...`);
      
      await this.deleteImage(icon.publicId);
      
      // Small delay to avoid rate limiting
      if (i < iconsToDelete.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ Cleaned ${folderPath}: deleted ${iconsToDelete.length} icons/logos`);
  }

  async cleanupAllFolders() {
    console.log('🚀 Specific Icon Cleaner');
    console.log('========================\n');
    
    // Get all folders
    const folders = await this.getAllFolders();
    
    if (folders.length === 0) {
      console.log('✅ No folders found');
      return;
    }

    console.log(`📁 Found ${folders.length} folders to check`);

    // Clean each folder
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      await this.cleanupFolder(folder);
      
      // Small delay between folders
      if (i < folders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully deleted: ${this.deletedCount} icons/logos`);
    console.log(`❌ Failed to delete: ${this.errors.length} images`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error.publicId}: ${error.error}`);
      });
    }

    console.log('\n🎉 Icon cleanup complete!');
  }

  async getAllFolders() {
    try {
      const result = await cloudinary.api.sub_folders('food-guessing-game');
      const folders = [];
      
      // Get all country folders
      for (const country of result.folders) {
        const countryPath = `food-guessing-game/${country.name}`;
        const subResult = await cloudinary.api.sub_folders(countryPath);
        
        // Get all dish folders within each country
        for (const dish of subResult.folders) {
          folders.push(`${countryPath}/${dish.name}`);
        }
      }
      
      return folders;
    } catch (error) {
      console.error('❌ Error getting folders:', error.message);
      return [];
    }
  }
}

async function main() {
  const cleaner = new SpecificIconCleaner();

  try {
    await cleaner.cleanupAllFolders();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = SpecificIconCleaner;



