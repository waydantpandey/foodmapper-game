const { google } = require('googleapis');
const path = require('path');

async function checkAllImages() {
  try {
    console.log('🔍 Checking ALL folders for images...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const GOOGLE_DRIVE_FOLDER_ID = '1Pb8d2TrAldcd0oq9huT7hzLaN7Elf_Zw';

    // Get all folders
    const foldersResponse = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    const folders = foldersResponse.data.files;
    console.log(`📁 Found ${folders.length} country folders`);

    let totalImages = 0;
    const foldersWithImages = [];

    // Check each folder
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      console.log(`\n🔍 Checking folder ${i + 1}/${folders.length}: ${folder.name}`);
      
      try {
        const imagesResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType contains 'image/'`,
          fields: 'files(id, name, mimeType)',
        });

        const images = imagesResponse.data.files;
        console.log(`  📸 Found ${images.length} images`);
        
        if (images.length > 0) {
          totalImages += images.length;
          foldersWithImages.push({
            name: folder.name,
            count: images.length,
            images: images.slice(0, 5).map(img => img.name) // Show first 5 image names
          });
          
          // Show sample images
          console.log(`  📋 Sample images:`);
          images.slice(0, 3).forEach((image, index) => {
            console.log(`    ${index + 1}. ${image.name} (${image.mimeType})`);
          });
        }
      } catch (error) {
        console.log(`  ❌ Error checking folder ${folder.name}:`, error.message);
      }
    }

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`Total images found: ${totalImages}`);
    console.log(`Folders with images: ${foldersWithImages.length}`);

    if (foldersWithImages.length > 0) {
      console.log(`\n📸 Folders with images:`);
      foldersWithImages.forEach(folder => {
        console.log(`  ${folder.name}: ${folder.count} images`);
        console.log(`    Sample: ${folder.images.slice(0, 3).join(', ')}`);
      });
    } else {
      console.log('\n⚠️ No images found in any country folders');
    }
    
  } catch (error) {
    console.error('❌ Error checking folders:', error);
  }
}

// Run the check
checkAllImages();
