const { google } = require('googleapis');
const path = require('path');

async function checkAllFiles() {
  try {
    console.log('🔍 Checking ALL files in ALL folders...');
    
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

    let totalFiles = 0;
    const foldersWithFiles = [];

    // Check each folder for ALL files
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      console.log(`\n🔍 Checking folder ${i + 1}/${folders.length}: ${folder.name}`);
      
      try {
        // Check for ALL files (not just images)
        const filesResponse = await drive.files.list({
          q: `'${folder.id}' in parents`,
          fields: 'files(id, name, mimeType, size)',
        });

        const files = filesResponse.data.files;
        console.log(`  📄 Found ${files.length} files`);
        
        if (files.length > 0) {
          totalFiles += files.length;
          foldersWithFiles.push({
            name: folder.name,
            count: files.length,
            files: files.slice(0, 5).map(file => ({
              name: file.name,
              type: file.mimeType,
              size: file.size
            }))
          });
          
          // Show sample files
          console.log(`  📋 Sample files:`);
          files.slice(0, 3).forEach((file, index) => {
            console.log(`    ${index + 1}. ${file.name} (${file.mimeType})`);
          });
        }
      } catch (error) {
        console.log(`  ❌ Error checking folder ${folder.name}:`, error.message);
      }
    }

    console.log(`\n📊 FINAL SUMMARY:`);
    console.log(`Total files found: ${totalFiles}`);
    console.log(`Folders with files: ${foldersWithFiles.length}`);

    if (foldersWithFiles.length > 0) {
      console.log(`\n📄 Folders with files:`);
      foldersWithFiles.forEach(folder => {
        console.log(`  ${folder.name}: ${folder.count} files`);
        console.log(`    Sample: ${folder.files.slice(0, 3).map(f => f.name).join(', ')}`);
      });
    } else {
      console.log('\n⚠️ No files found in any country folders');
      console.log('This could mean:');
      console.log('1. The service account doesn\'t have access to the files');
      console.log('2. The files are in a different location');
      console.log('3. The files have different permissions');
    }
    
  } catch (error) {
    console.error('❌ Error checking folders:', error);
  }
}

// Run the check
checkAllFiles();
