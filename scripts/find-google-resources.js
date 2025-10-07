const { google } = require('googleapis');
const path = require('path');

async function findGoogleResources() {
  try {
    console.log('🔍 Searching for Google resources...');
    
    // Initialize the Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'), // You'll need to download this
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    console.log('📊 Listing all Google Sheets...');
    
    // List all spreadsheets
    const sheetsResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
    });

    console.log('📋 Available Google Sheets:');
    sheetsResponse.data.files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (ID: ${file.id})`);
    });

    console.log('\n📁 Listing all Google Drive folders...');
    
    // List all folders
    const foldersResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder'",
      fields: 'files(id, name)',
    });

    console.log('📂 Available Google Drive folders:');
    foldersResponse.data.files.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder.name} (ID: ${folder.id})`);
    });

    // Look for the specific sheet and folder
    const targetSheet = sheetsResponse.data.files.find(file => 
      file.name.toLowerCase().includes('common_foods_35_countries') ||
      file.name.toLowerCase().includes('common_foods')
    );

    const targetFolder = foldersResponse.data.files.find(folder => 
      folder.name.toLowerCase().includes('food data 1') ||
      folder.name.toLowerCase().includes('food data')
    );

    console.log('\n🎯 Target resources found:');
    if (targetSheet) {
      console.log(`📊 Sheet: ${targetSheet.name} (ID: ${targetSheet.id})`);
    } else {
      console.log('❌ Target sheet not found');
    }

    if (targetFolder) {
      console.log(`📁 Folder: ${targetFolder.name} (ID: ${targetFolder.id})`);
    } else {
      console.log('❌ Target folder not found');
    }
    
  } catch (error) {
    console.error('❌ Error finding Google resources:', error);
    console.log('\n💡 Make sure you have:');
    console.log('1. Downloaded the service account key file as "service-account-key.json"');
    console.log('2. Given the service account access to the sheet and folder');
    console.log('3. The service account has the correct permissions');
  }
}

// Run the script
findGoogleResources();
