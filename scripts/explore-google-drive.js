const { google } = require('googleapis');
const path = require('path');

async function exploreGoogleDrive() {
  try {
    console.log('🔍 Exploring Google Drive folder structure...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const GOOGLE_DRIVE_FOLDER_ID = '1Pb8d2TrAldcd0oq9huT7hzLaN7Elf_Zw';

    console.log('📁 Listing all files in the Google Drive folder...');
    
    // List all files in the folder
    const filesResponse = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents`,
      fields: 'files(id, name, mimeType, parents)',
    });

    console.log(`📊 Found ${filesResponse.data.files.length} files in the folder`);
    
    // Group by type
    const images = filesResponse.data.files.filter(file => file.mimeType.startsWith('image/'));
    const folders = filesResponse.data.files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
    const otherFiles = filesResponse.data.files.filter(file => 
      !file.mimeType.startsWith('image/') && file.mimeType !== 'application/vnd.google-apps.folder'
    );

    console.log(`\n📸 Images (${images.length}):`);
    images.forEach((image, index) => {
      console.log(`  ${index + 1}. ${image.name}`);
    });

    console.log(`\n📁 Folders (${folders.length}):`);
    folders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder.name} (ID: ${folder.id})`);
    });

    console.log(`\n📄 Other files (${otherFiles.length}):`);
    otherFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.mimeType})`);
    });

    // If there are folders, explore them
    if (folders.length > 0) {
      console.log('\n🔍 Exploring subfolders...');
      
      for (const folder of folders.slice(0, 3)) { // Limit to first 3 folders
        console.log(`\n📁 Contents of "${folder.name}":`);
        
        const subfolderResponse = await drive.files.list({
          q: `'${folder.id}' in parents`,
          fields: 'files(id, name, mimeType)',
        });

        const subfolderImages = subfolderResponse.data.files.filter(file => file.mimeType.startsWith('image/'));
        console.log(`  📸 ${subfolderImages.length} images found:`);
        subfolderImages.slice(0, 5).forEach((image, index) => {
          console.log(`    ${index + 1}. ${image.name}`);
        });
        
        if (subfolderImages.length > 5) {
          console.log(`    ... and ${subfolderImages.length - 5} more images`);
        }
      }
    }

    // Show some sample image names to help with matching
    if (images.length > 0) {
      console.log('\n📋 Sample image names for reference:');
      images.slice(0, 10).forEach((image, index) => {
        console.log(`  ${index + 1}. "${image.name}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error exploring Google Drive:', error);
  }
}

// Run the exploration
exploreGoogleDrive();
