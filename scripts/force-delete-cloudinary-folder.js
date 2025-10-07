const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function forceDeleteCloudinaryFolder() {
  try {
    console.log('🔄 Force deleting food-guessing-game folder...');
    
    // First, try to delete any remaining resources in the folder
    const resourcesResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 1000,
    });

    if (resourcesResult.resources.length > 0) {
      console.log(`📦 Found ${resourcesResult.resources.length} remaining resources, deleting...`);
      
      const publicIds = resourcesResult.resources.map(resource => resource.public_id);
      
      // Delete in batches
      const batchSize = 100;
      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        await cloudinary.api.delete_resources(batch);
        console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(publicIds.length / batchSize)}`);
      }
    }

    // Try to delete the folder using different methods
    try {
      console.log('🗑️ Attempting to delete folder using delete_folder...');
      await cloudinary.api.delete_folder('food-guessing-game');
      console.log('✅ Folder deleted successfully');
    } catch (error) {
      console.log('⚠️ delete_folder failed, trying alternative method...');
      
      // Alternative: Delete all resources with the prefix
      try {
        console.log('🗑️ Attempting to delete all resources with prefix...');
        await cloudinary.api.delete_resources_by_prefix('food-guessing-game');
        console.log('✅ Resources deleted by prefix');
      } catch (error2) {
        console.log('⚠️ delete_resources_by_prefix also failed');
      }
    }

    // Verify deletion
    console.log('🔍 Verifying deletion...');
    const verifyResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 10,
    });

    if (verifyResult.resources.length === 0) {
      console.log('✅ food-guessing-game folder is now empty or deleted');
    } else {
      console.log(`⚠️ ${verifyResult.resources.length} resources still exist`);
    }
    
  } catch (error) {
    console.error('❌ Error force deleting folder:', error);
  }
}

// Run the deletion
forceDeleteCloudinaryFolder();
