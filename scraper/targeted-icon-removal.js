#!/usr/bin/env node

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwav84wrk',
  api_key: process.env.CLOUDINARY_API_KEY || '589773693657812',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'V2qOKwLBhCEhjaIm8ex7AgwEdhY'
});

class TargetedIconRemoval {
  constructor() {
    this.deletedCount = 0;
    this.errors = [];
  }

  async searchForIcons() {
    try {
      console.log('🔍 Searching for Wikimedia Commons and Wikibooks icons...');
      
      // Search for images that might be icons based on various criteria
      const searches = [
        // Search by folder structure
        'folder:food-guessing-game/*/*',
        // Search for small images
        'width<200',
        // Search for square images
        'aspect_ratio:1',
        // Search for PNG files (often used for icons)
        'format:png',
        // Search for very small file sizes
        'bytes<50000'
      ];

      const allResults = [];
      
      for (const search of searches) {
        try {
          const result = await cloudinary.search
            .expression(search)
            .max_results(100)
            .execute();
          
          console.log(`📊 Found ${result.resources.length} images with search: ${search}`);
          allResults.push(...result.resources);
        } catch (error) {
          console.log(`⚠️  Search failed for "${search}": ${error.message}`);
        }
      }

      // Remove duplicates
      const uniqueResults = allResults.filter((img, index, self) => 
        index === self.findIndex(t => t.public_id === img.public_id)
      );

      console.log(`📊 Total unique images found: ${uniqueResults.length}`);
      return uniqueResults;
    } catch (error) {
      console.error('❌ Error searching for icons:', error.message);
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
        caption: details.context?.caption || '',
        folder: publicId.split('/').slice(0, -1).join('/')
      };
    } catch (error) {
      console.error(`❌ Error getting details for ${publicId}:`, error.message);
      return null;
    }
  }

  isLikelyIcon(image) {
    const aspectRatio = image.width / image.height;
    
    // Check for very small images
    const isVerySmall = image.width < 100 || image.height < 100;
    
    // Check for square images (common for icons)
    const isSquare = aspectRatio > 0.9 && aspectRatio < 1.1;
    
    // Check for very small file sizes (icons are usually small)
    const isSmallFile = image.size < 20000; // Less than 20KB
    
    // Check for PNG format (common for icons with transparency)
    const isPng = image.format === 'png';
    
    // Check for unusual aspect ratios (very wide or very tall)
    const isUnusualRatio = aspectRatio < 0.3 || aspectRatio > 3;
    
    // Check for very small width or height
    const isVeryNarrow = image.width < 50 || image.height < 50;
    
    // Check for very large aspect ratio (banner-like)
    const isBannerLike = aspectRatio > 4 || aspectRatio < 0.25;
    
    return isVerySmall || (isSquare && isSmallFile) || isUnusualRatio || isVeryNarrow || isBannerLike;
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

  async removeIcons() {
    console.log('🚀 Targeted Icon Removal');
    console.log('========================\n');
    
    // Search for potential icons
    const allImages = await this.searchForIcons();
    
    if (allImages.length === 0) {
      console.log('✅ No images found to analyze');
      return;
    }

    // Get detailed info for each image
    console.log('\n🔍 Analyzing images for icon characteristics...');
    const imageDetails = [];
    
    for (let i = 0; i < allImages.length; i++) {
      const image = allImages[i];
      console.log(`[${i + 1}/${allImages.length}] Analyzing ${image.public_id}...`);
      
      const details = await this.getImageDetails(image.public_id);
      if (details) {
        imageDetails.push(details);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Identify likely icons
    const iconsToDelete = imageDetails.filter(img => this.isLikelyIcon(img));
    
    if (iconsToDelete.length === 0) {
      console.log('✅ No icons identified for deletion');
      return;
    }

    console.log(`\n🚫 Found ${iconsToDelete.length} potential icons to delete:`);
    iconsToDelete.forEach((img, index) => {
      const aspectRatio = (img.width / img.height).toFixed(2);
      console.log(`\n${index + 1}. ${img.publicId}`);
      console.log(`   Folder: ${img.folder}`);
      console.log(`   Size: ${img.width}x${img.height} (ratio: ${aspectRatio})`);
      console.log(`   Format: ${img.format}, Size: ${(img.size / 1024).toFixed(1)}KB`);
      console.log(`   Alt: "${img.alt}"`);
      console.log(`   URL: ${img.url}`);
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

    console.log('\n🎉 Targeted icon removal complete!');
  }
}

async function main() {
  const remover = new TargetedIconRemoval();

  try {
    await remover.removeIcons();
  } catch (error) {
    console.error('❌ Icon removal failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = TargetedIconRemoval;




