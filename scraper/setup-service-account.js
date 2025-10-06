#!/usr/bin/env node

console.log('🔧 Service Account Setup Guide');
console.log('==============================\n');

console.log('You currently have OAuth2 credentials, but the scraper needs Service Account credentials.');
console.log('Here\'s how to set up a Service Account:\n');

console.log('1. 📋 Go to Google Cloud Console:');
console.log('   https://console.cloud.google.com/\n');

console.log('2. 🎯 Select your project: foodmapper-472618\n');

console.log('3. 👤 Go to Service Accounts:');
console.log('   https://console.cloud.google.com/iam-admin/serviceaccounts\n');

console.log('4. ➕ Click "Create Service Account"\n');

console.log('5. 📝 Fill in the details:');
console.log('   - Service account name: food-scraper');
console.log('   - Description: Service account for food guessing game scraper');
console.log('   - Click "Create and Continue"\n');

console.log('6. 🔑 Skip role assignment (click "Continue")\n');

console.log('7. ✅ Click "Done"\n');

console.log('8. 🔐 Create API Key:');
console.log('   - Click on your new service account');
console.log('   - Go to "Keys" tab');
console.log('   - Click "Add Key" → "Create new key"');
console.log('   - Choose "JSON" format');
console.log('   - Click "Create"');
console.log('   - Download the JSON file\n');

console.log('9. 📁 Save the new credentials:');
console.log('   - Rename the downloaded file to "service-account-credentials.json"');
console.log('   - Place it in: /Users/waydant/food-guessing-game-cloudinary/scraper/\n');

console.log('10. 🔄 Replace the old credentials:');
console.log('    - Move the old credentials.json to credentials-oauth2.json');
console.log('    - Rename service-account-credentials.json to credentials.json\n');

console.log('11. 📊 Share permissions:');
console.log('    - Google Sheets: Add the service account email as Editor');
console.log('    - Google Drive: Share the food-guessing-game folder with the service account\n');

console.log('12. ✅ Test the setup:');
console.log('    node test-google-setup.js\n');

console.log('📝 Note: The service account email will look like:');
console.log('    food-scraper@foodmapper-472618.iam.gserviceaccount.com\n');

console.log('🔄 Current credentials type: OAuth2 (for web apps)');
console.log('✅ Needed credentials type: Service Account (for server-to-server)');



