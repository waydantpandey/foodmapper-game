const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function deleteAllCloudinaryImages() {
  try {
    console.log('🔄 Starting deletion of all Cloudinary images...');
    
    // List all resources in the food-guessing-game folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 1000,
    });

    console.log(`📊 Found ${result.resources.length} images to delete`);

    if (result.resources.length === 0) {
      console.log('✅ No images found in Cloudinary');
      return;
    }

    // Extract public IDs
    const publicIds = result.resources.map(resource => resource.public_id);
    
    console.log('🗑️ Deleting images in batches of 100...');
    
    // Delete in batches of 100 (Cloudinary API limit)
    const batchSize = 100;
    let totalDeleted = 0;
    let totalNotFound = 0;
    
    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(publicIds.length / batchSize)} (${batch.length} images)...`);
      
      try {
        const deleteResult = await cloudinary.api.delete_resources(batch);
        
        const deletedCount = Object.values(deleteResult.deleted).reduce((sum, count) => sum + count, 0);
        const notFoundCount = deleteResult.not_found ? deleteResult.not_found.length : 0;
        
        totalDeleted += deletedCount;
        totalNotFound += notFoundCount;
        
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed: ${deletedCount} deleted, ${notFoundCount} not found`);
        
        // Add a small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
    
    console.log('✅ Deletion completed!');
    console.log(`📊 Total deleted: ${totalDeleted} images`);
    console.log(`📊 Total not found: ${totalNotFound} images`);
    
  } catch (error) {
    console.error('❌ Error deleting Cloudinary images:', error);
  }
}

// Run the deletion
deleteAllCloudinaryImages();
