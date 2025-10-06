#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Google API Setup');
console.log('============================\n');

// Check if credentials.json exists
const credentialsPath = path.join(__dirname, 'credentials.json');
if (fs.existsSync(credentialsPath)) {
  console.log('✅ credentials.json found!');
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log(`📧 Service account email: ${credentials.client_email}`);
    console.log(`🆔 Project ID: ${credentials.project_id}`);
    
    // Test Google APIs
    console.log('\n🔍 Testing Google APIs...');
    
    const { google } = require('googleapis');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });
    
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Test Drive API
    console.log('📁 Testing Google Drive API...');
    drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)'
    }).then(() => {
      console.log('✅ Google Drive API working!');
    }).catch(error => {
      console.log('❌ Google Drive API error:', error.message);
    });
    
    // Test Sheets API (if GOOGLE_SHEETS_ID is set)
    const sheetsId = process.env.GOOGLE_SHEETS_ID;
    if (sheetsId) {
      console.log('📊 Testing Google Sheets API...');
      sheets.spreadsheets.get({
        spreadsheetId: sheetsId
      }).then(() => {
        console.log('✅ Google Sheets API working!');
      }).catch(error => {
        console.log('❌ Google Sheets API error:', error.message);
      });
    } else {
      console.log('⚠️  GOOGLE_SHEETS_ID not set - skipping Sheets API test');
    }
    
  } catch (error) {
    console.log('❌ credentials.json is invalid JSON:', error.message);
  }
} else {
  console.log('❌ credentials.json not found');
  console.log('Please follow the setup guide to create and download it.');
  console.log('See: GOOGLE_API_SETUP.md');
}

console.log('\n📋 Next Steps:');
console.log('1. Complete the Google API setup');
console.log('2. Run: node comprehensive-test-scraper.js');
console.log('3. Or run: node full-comprehensive-scraper.js for all dishes');



