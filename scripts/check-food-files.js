const { google } = require('googleapis');
const path = require('path');

async function checkFoodFiles() {
  try {
    console.log('🔍 Checking ALL files in food folders...');
    
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

    let totalFiles = 0;
    const countriesWithFiles = [];

    // Check first few countries
    for (let i = 0; i < Math.min(2, countryFolders.length); i++) {
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
        
        let countryFileCount = 0;
        
        // Check first few food folders for ANY files
        for (let j = 0; j < Math.min(2, foodFolders.length); j++) {
          const foodFolder = foodFolders[j];
          console.log(`    🍽️ Checking food: ${foodFolder.name}`);
          
          // Get ALL files in this food folder
          const filesResponse = await drive.files.list({
            q: `'${foodFolder.id}' in parents`,
            fields: 'files(id, name, mimeType, size)',
          });

          const files = filesResponse.data.files;
          console.log(`      📄 Found ${files.length} files`);
          
          if (files.length > 0) {
            countryFileCount += files.length;
            totalFiles += files.length;
            
            // Show all files
            files.forEach((file, index) => {
              console.log(`        ${index + 1}. ${file.name} (${file.mimeType})`);
            });
          }
        }
        
        if (countryFileCount > 0) {
          countriesWithFiles.push({
            name: countryFolder.name,
            count: countryFileCount
          });
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking country ${countryFolder.name}:`, error.message);
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`Total files found: ${totalFiles}`);
    console.log(`Countries with files: ${countriesWithFiles.length}`);

    if (countriesWithFiles.length > 0) {
      console.log(`\n📄 Countries with files:`);
      countriesWithFiles.forEach(country => {
        console.log(`  ${country.name}: ${country.count} files`);
      });
    } else {
      console.log('\n⚠️ No files found in food folders');
      console.log('This could mean:');
      console.log('1. The images are in a different location');
      console.log('2. The images have different permissions');
      console.log('3. The images are in a different format');
    }
    
  } catch (error) {
    console.error('❌ Error checking food files:', error);
  }
}

// Run the check
checkFoodFiles();
