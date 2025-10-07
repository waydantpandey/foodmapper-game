const fs = require('fs');
const path = require('path');

console.log('🚀 Google Sheets to Cloudinary Setup');
console.log('=====================================\n');

console.log('📋 Step 1: Download Service Account Key');
console.log('1. Go to: https://console.cloud.google.com/');
console.log('2. Navigate to: IAM & Admin > Service Accounts');
console.log('3. Find: food-scraper@foodmapper-472618.iam.gserviceaccount.com');
console.log('4. Click on it > Keys tab > Add Key > Create new key > JSON');
console.log('5. Download and rename to: service-account-key.json');
console.log('6. Place it in: /Users/waydant/foodmapper.io/\n');

console.log('📊 Step 2: Get Google Sheet ID');
console.log('1. Open your sheet: "common_foods_35_countries"');
console.log('2. Copy the URL from address bar');
console.log('3. Extract the ID between /d/ and /edit');
console.log('4. Example: https://docs.google.com/spreadsheets/d/1ABC123...XYZ/edit');
console.log('5. The ID is: 1ABC123...XYZ\n');

console.log('📁 Step 3: Get Google Drive Folder ID');
console.log('1. Open your folder: "food data 1"');
console.log('2. Copy the URL from address bar');
console.log('3. Extract the ID after /folders/');
console.log('4. Example: https://drive.google.com/drive/folders/1DEF456...UVW');
console.log('5. The ID is: 1DEF456...UVW\n');

console.log('🔧 Step 4: Update Scripts');
console.log('1. Edit: scripts/read-google-sheet.js');
console.log('2. Update: GOOGLE_SHEET_ID with your sheet ID');
console.log('3. Edit: scripts/setup-cloudinary-from-sheet.js');
console.log('4. Update: GOOGLE_SHEET_ID and GOOGLE_DRIVE_FOLDER_ID\n');

console.log('▶️ Step 5: Run the Scripts');
console.log('1. node scripts/find-google-resources.js');
console.log('2. node scripts/read-google-sheet.js');
console.log('3. node scripts/setup-cloudinary-from-sheet.js\n');

console.log('✅ That\'s it! Your Cloudinary will be populated with images from Google Drive!');
