const { google } = require('googleapis');
const path = require('path');

async function checkFoodFolders() {
  try {
    console.log('🔍 Checking food folders for images...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const GOOGLE_DRIVE_FOLDER_ID = '1Pb8d2TrAldcd0oq9huT7hzLaN7Elf_Zw';

    // Get all country folders
    const foldersResponse = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    const countryFolders = foldersResponse.data.files;
    console.log(`📁 Found ${countryFolders.length} country folders`);

    let totalImages = 0;
    const countriesWithImages = [];

    // Check a few countries to see the structure
    for (let i = 0; i < Math.min(3, countryFolders.length); i++) {
      const countryFolder = countryFolders[i];
      console.log(`\n🌍 Checking country: ${countryFolder.name}`);
      
      try {
        // Get food folders in this country
        const foodFoldersResponse = await drive.files.list({
          q: `'${countryFolder.id}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)',
        });

        const foodFolders = foodFoldersResponse.data.files;
        console.log(`  🍽️ Found ${foodFolders.length} food folders`);
        
        let countryImageCount = 0;
        
        // Check first few food folders for images
        for (let j = 0; j < Math.min(3, foodFolders.length); j++) {
          const foodFolder = foodFolders[j];
          console.log(`    🍽️ Checking food: ${foodFolder.name}`);
          
          // Get images in this food folder
          const imagesResponse = await drive.files.list({
            q: `'${foodFolder.id}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, mimeType)',
          });

          const images = imagesResponse.data.files;
          console.log(`      📸 Found ${images.length} images`);
          
          if (images.length > 0) {
            countryImageCount += images.length;
            totalImages += images.length;
            
            // Show sample images
            images.slice(0, 2).forEach((image, index) => {
              console.log(`        ${index + 1}. ${image.name} (${image.mimeType})`);
            });
          }
        }
        
        if (countryImageCount > 0) {
          countriesWithImages.push({
            name: countryFolder.name,
            count: countryImageCount
          });
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking country ${countryFolder.name}:`, error.message);
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total images found: ${totalImages}`);
    console.log(`Countries with images: ${countriesWithImages.length}`);

    if (countriesWithImages.length > 0) {
      console.log(`\n📸 Countries with images:`);
      countriesWithImages.forEach(country => {
        console.log(`  ${country.name}: ${country.count} images`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking food folders:', error);
  }
}

// Run the check
checkFoodFolders();
