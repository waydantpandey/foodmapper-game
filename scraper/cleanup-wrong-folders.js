const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

async function cleanupWrongFolders() {
  try {
    console.log('🧹 Cleaning up folders created in wrong location...');
    
    // Find the "food data 1" folder that was created in service account's drive
    const wrongFolderId = '1FgbjH4hYw9wTVujOOlNO7SETKskuauml';
    
    console.log('🗑️ Deleting the incorrectly placed "food data 1" folder...');
    
    // Delete the entire folder and all its contents
    await drive.files.delete({
      fileId: wrongFolderId
    });
    
    console.log('✅ Cleaned up incorrectly placed folders');
    
    // Also clean up any other folders that might be in the root
    const rootFolders = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and parents in 'root' and trashed=false",
      fields: 'files(id, name)'
    });
    
    console.log('🗑️ Cleaning up any remaining root folders...');
    for (const folder of rootFolders.data.files) {
      if (folder.name.includes('Food Data') || folder.name === 'food data 1') {
        await drive.files.delete({
          fileId: folder.id
        });
        console.log(`✅ Deleted: ${folder.name}`);
      }
    }
    
    console.log('🎉 Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

cleanupWrongFolders();


