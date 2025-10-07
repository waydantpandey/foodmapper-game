const { v2: cloudinary } = require('cloudinary');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function verifyCloudinaryCleanup() {
  try {
    console.log('🔍 Verifying Cloudinary cleanup...');
    
    // Check for any remaining resources
    const resourcesResult = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'food-guessing-game',
      max_results: 1000,
    });

    console.log(`📊 Remaining resources in food-guessing-game folder: ${resourcesResult.resources.length}`);
    
    if (resourcesResult.resources.length > 0) {
      console.log('⚠️ Some resources still exist:');
      resourcesResult.resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.public_id}`);
      });
    } else {
      console.log('✅ No resources found in food-guessing-game folder');
    }

    // Check for any remaining folders
    const foldersResult = await cloudinary.api.root_folders();
    console.log(`📊 Remaining folders: ${foldersResult.folders.length}`);
    
    if (foldersResult.folders.length > 0) {
      console.log('⚠️ Some folders still exist:');
      foldersResult.folders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder.name}`);
      });
    } else {
      console.log('✅ No folders found');
    }

    // Check total resources in account
    const allResourcesResult = await cloudinary.api.resources({
      type: 'upload',
      max_results: 1000,
    });

    console.log(`📊 Total resources in Cloudinary account: ${allResourcesResult.resources.length}`);
    
    if (allResourcesResult.resources.length === 0) {
      console.log('🎉 Cloudinary account is completely clean!');
    } else {
      console.log('ℹ️ Other resources exist in the account (not food-guessing-game related)');
    }
    
  } catch (error) {
    console.error('❌ Error verifying Cloudinary cleanup:', error);
  }
}

// Run the verification
verifyCloudinaryCleanup();
