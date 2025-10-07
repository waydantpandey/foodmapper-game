const fs = require('fs');
const path = require('path');

console.log('🔑 Service Account Key Setup Required');
console.log('=====================================\n');

console.log('❌ service-account-key.json not found!');
console.log('You need to download the service account key file.\n');

console.log('📋 Steps to get the key:');
console.log('1. Go to: https://console.cloud.google.com/');
console.log('2. Navigate to: IAM & Admin > Service Accounts');
console.log('3. Find: food-scraper@foodmapper-472618.iam.gserviceaccount.com');
console.log('4. Click on the service account');
console.log('5. Go to the "Keys" tab');
console.log('6. Click "Add Key" > "Create new key"');
console.log('7. Choose "JSON" format');
console.log('8. Click "Create"');
console.log('9. Download the JSON file');
console.log('10. Rename it to: service-account-key.json');
console.log('11. Place it in: /Users/waydant/foodmapper.io/\n');

console.log('✅ Once you have the key file, run:');
console.log('node scripts/read-google-sheet.js');
console.log('node scripts/setup-cloudinary-from-sheet.js\n');

console.log('🔗 Direct link to service accounts:');
console.log('https://console.cloud.google.com/iam-admin/serviceaccounts');
