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

async function shareFolderWithUser() {
  try {
    console.log('🔍 Finding "food data 1" folder...');
    
    // Find the "food data 1" folder
    const response = await drive.files.list({
      q: "name='food data 1' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)'
    });

    if (response.data.files.length === 0) {
      console.log('❌ "food data 1" folder not found');
      return;
    }

    const folderId = response.data.files[0].id;
    console.log(`✅ Found "food data 1" folder: ${folderId}`);

    // Get your email address (you'll need to provide this)
    const userEmail = process.env.USER_EMAIL || 'your-email@gmail.com';
    
    if (userEmail === 'your-email@gmail.com') {
      console.log('❌ Please set your email address:');
      console.log('   export USER_EMAIL="your-actual-email@gmail.com"');
      console.log('   node share-google-drive-folder.js');
      return;
    }

    console.log(`📧 Sharing folder with: ${userEmail}`);

    // Share the folder with your email
    await drive.permissions.create({
      fileId: folderId,
      resource: {
        role: 'writer',
        type: 'user',
        emailAddress: userEmail
      }
    });

    console.log('✅ Folder shared successfully!');
    console.log('📁 You should now see "food data 1" folder in your Google Drive');
    console.log('🔗 Folder ID:', folderId);
    console.log('🌐 Direct link: https://drive.google.com/drive/folders/' + folderId);

  } catch (error) {
    console.error('❌ Error sharing folder:', error.message);
  }
}

shareFolderWithUser();


