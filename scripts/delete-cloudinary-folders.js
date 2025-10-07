const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function deleteAllCloudinaryFolders() {
  try {
    console.log('🔄 Starting deletion of all Cloudinary folders...');
    
    // List all folders
    const foldersResult = await cloudinary.api.root_folders();
    
    console.log(`📊 Found ${foldersResult.folders.length} folders to delete`);
    
    if (foldersResult.folders.length === 0) {
      console.log('✅ No folders found in Cloudinary');
      return;
    }

    // Delete each folder
    for (const folder of foldersResult.folders) {
      try {
        console.log(`🗑️ Deleting folder: ${folder.name}`);
        
        // Delete all resources in the folder first
        const resourcesResult = await cloudinary.api.resources({
          type: 'upload',
          prefix: folder.name,
          max_results: 1000,
        });

        if (resourcesResult.resources.length > 0) {
          console.log(`📦 Found ${resourcesResult.resources.length} resources in ${folder.name}, deleting...`);
          
          // Delete resources in batches
          const batchSize = 100;
          const publicIds = resourcesResult.resources.map(resource => resource.public_id);
          
          for (let i = 0; i < publicIds.length; i += batchSize) {
            const batch = publicIds.slice(i, i + batchSize);
            await cloudinary.api.delete_resources(batch);
            console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(publicIds.length / batchSize)}`);
          }
        }

        // Delete the folder itself
        await cloudinary.api.delete_folder(folder.name);
        console.log(`✅ Folder ${folder.name} deleted successfully`);
        
      } catch (error) {
        console.error(`❌ Error deleting folder ${folder.name}:`, error.message);
      }
    }
    
    console.log('✅ All folders deletion completed!');
    
  } catch (error) {
    console.error('❌ Error deleting Cloudinary folders:', error);
  }
}

// Run the deletion
deleteAllCloudinaryFolders();
