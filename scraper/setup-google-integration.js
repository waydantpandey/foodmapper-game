#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGoogleIntegration() {
  console.log('🚀 Setting up Google Sheets & Drive Integration\n');
  
  console.log('This will help you set up:');
  console.log('1. Google Sheets API for updating your food data');
  console.log('2. Google Drive API for uploading images');
  console.log('3. Environment variables for the scraper\n');
  
  // Get Google Sheets ID
  const sheetsId = await question('Enter your Google Sheets ID (from the URL): ');
  if (!sheetsId) {
    console.log('❌ Google Sheets ID is required');
    process.exit(1);
  }
  
  // Get Google Cloud Project details
  console.log('\n📋 Google Cloud Project Setup:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing');
  console.log('3. Enable Google Sheets API and Google Drive API');
  console.log('4. Create a service account');
  console.log('5. Download the JSON key file\n');
  
  const hasServiceAccount = await question('Do you have a Google service account JSON key file? (y/n): ');
  
  if (hasServiceAccount.toLowerCase() === 'y') {
    const keyFilePath = await question('Enter the path to your service account JSON file: ');
    
    if (fs.existsSync(keyFilePath)) {
      // Copy the file to the scraper directory
      const destPath = path.join(__dirname, 'google-service-account.json');
      fs.copyFileSync(keyFilePath, destPath);
      console.log(`✅ Copied service account key to ${destPath}`);
    } else {
      console.log('❌ File not found. Please check the path.');
      process.exit(1);
    }
  } else {
    console.log('\n📝 To create a service account:');
    console.log('1. Go to Google Cloud Console → IAM & Admin → Service Accounts');
    console.log('2. Click "Create Service Account"');
    console.log('3. Give it a name like "food-scraper"');
    console.log('4. Grant it "Editor" role');
    console.log('5. Create and download the JSON key');
    console.log('6. Run this script again with the JSON file path\n');
    process.exit(0);
  }
  
  // Create .env file for the scraper
  const envContent = `# Google Sheets Configuration
GOOGLE_SHEETS_ID=${sheetsId}

# Cloudinary Configuration (already set in main project)
CLOUDINARY_CLOUD_NAME=dwav84wrk
CLOUDINARY_API_KEY=589773693657812
CLOUDINARY_API_SECRET=V2qOKwLBhCEhjaIm8ex7AgwEdhY

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id_here
`;
  
  const envPath = path.join(__dirname, '.env');
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Created .env file at ${envPath}`);
  
  // Install dependencies
  console.log('\n📦 Installing dependencies...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('⚠️ Failed to install dependencies. Please run "npm install" manually.');
  }
  
  console.log('\n🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Update the GOOGLE_DRIVE_FOLDER_ID in the .env file');
  console.log('2. Run: node google-sheets-updater.js (to add new columns)');
  console.log('3. Run: node enhanced-wikipedia-scraper.js (to scrape and upload)');
  
  rl.close();
}

setupGoogleIntegration().catch(console.error);



