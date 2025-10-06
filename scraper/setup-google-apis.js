#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Google APIs Setup Guide');
console.log('==========================\n');

console.log('To use the comprehensive scraper, you need to set up Google APIs:\n');

console.log('1. 📋 Go to Google Cloud Console:');
console.log('   https://console.cloud.google.com/\n');

console.log('2. 🆕 Create a new project or select existing one\n');

console.log('3. 🔑 Enable APIs:');
console.log('   - Google Drive API');
console.log('   - Google Sheets API\n');

console.log('4. 👤 Create Service Account:');
console.log('   - Go to IAM & Admin > Service Accounts');
console.log('   - Click "Create Service Account"');
console.log('   - Give it a name like "food-scraper"');
console.log('   - Click "Create and Continue"');
console.log('   - Skip role assignment for now');
console.log('   - Click "Done"\n');

console.log('5. 🔐 Create Key:');
console.log('   - Click on your service account');
console.log('   - Go to "Keys" tab');
console.log('   - Click "Add Key" > "Create new key"');
console.log('   - Choose "JSON" format');
console.log('   - Download the JSON file\n');

console.log('6. 📁 Save credentials:');
console.log('   - Rename the downloaded file to "credentials.json"');
console.log('   - Place it in the scraper folder:');
console.log(`   ${path.join(__dirname, 'credentials.json')}\n`);

console.log('7. 📊 Share Google Sheets:');
console.log('   - Open your Google Sheets document');
console.log('   - Click "Share" button');
console.log('   - Add the service account email (from credentials.json)');
console.log('   - Give it "Editor" permissions\n');

console.log('8. 📁 Share Google Drive folder:');
console.log('   - Open your Google Drive');
console.log('   - Find or create the "food-guessing-game" folder');
console.log('   - Right-click > Share');
console.log('   - Add the service account email');
console.log('   - Give it "Editor" permissions\n');

console.log('9. 🔧 Set environment variables (optional):');
console.log('   - GOOGLE_SHEETS_ID=your-spreadsheet-id');
console.log('   - CLOUDINARY_CLOUD_NAME=your-cloud-name');
console.log('   - CLOUDINARY_API_KEY=your-api-key');
console.log('   - CLOUDINARY_API_SECRET=your-api-secret\n');

console.log('10. ✅ Test the setup:');
console.log('    node comprehensive-test-scraper.js\n');

console.log('📝 Note: The service account email will look like:');
console.log('    food-scraper@your-project.iam.gserviceaccount.com\n');

// Check if credentials.json exists
const credentialsPath = path.join(__dirname, 'credentials.json');
if (fs.existsSync(credentialsPath)) {
  console.log('✅ credentials.json found!');
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`📧 Service account email: ${credentials.client_email}`);
  } catch (error) {
    console.log('❌ credentials.json is invalid JSON');
  }
} else {
  console.log('❌ credentials.json not found');
  console.log('Please follow the steps above to create and download it.');
}



