const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Service account credentials
const SERVICE_ACCOUNT_EMAIL = 'food-scraper@foodmapper-472618.iam.gserviceaccount.com';
const GOOGLE_SHEET_ID = 'common_foods_35_countries'; // You'll need to provide the actual sheet ID
const GOOGLE_DRIVE_FOLDER_ID = 'food data 1'; // You'll need to provide the actual folder ID

async function readGoogleSheet() {
  try {
    console.log('🔄 Setting up Google Sheets API...');
    
    // Initialize the Google Sheets API
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'), // You'll need to download this
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    console.log('📊 Reading Google Sheet data...');
    
    // Read the sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'A:Z', // Read all columns
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      console.log('❌ No data found in the sheet');
      return;
    }

    console.log(`📊 Found ${rows.length} rows in the sheet`);
    
    // Get the header row
    const headers = rows[0];
    console.log('📋 Headers:', headers);
    
    // Convert to JSON format
    const foods = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const food = {};
      
      // Map each column to its header
      headers.forEach((header, index) => {
        if (row[index] !== undefined) {
          // Skip image URL columns as requested
          if (!header.toLowerCase().includes('image') && !header.toLowerCase().includes('url')) {
            food[header] = row[index];
          }
        }
      });
      
      // Only add if the food has essential data
      if (food.name || food.Name || food.food_name) {
        foods.push(food);
      }
    }

    console.log(`✅ Converted ${foods.length} foods to JSON format`);
    
    // Save to JSON file
    const outputPath = path.join(__dirname, '../data/foods-from-sheet.json');
    fs.writeFileSync(outputPath, JSON.stringify(foods, null, 2));
    
    console.log(`💾 Saved to: ${outputPath}`);
    
    // Display sample data
    console.log('📋 Sample data:');
    console.log(JSON.stringify(foods.slice(0, 3), null, 2));
    
    return foods;
    
  } catch (error) {
    console.error('❌ Error reading Google Sheet:', error);
  }
}

// Run the script
readGoogleSheet();
