const { google } = require('googleapis');
const { v2: cloudinary } = require('cloudinary');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const GOOGLE_SHEET_ID = '1c7RSCiILvoCg3cxRfhCmuPW5sEbMeFzTwTKCyL5EscY';
const GOOGLE_DRIVE_FOLDER_ID = '1Pb8d2TrAldcd0oq9huT7hzLaN7Elf_Zw';

async function fixCountryFoodMapping() {
  try {
    console.log('🔄 Fixing country-food mapping...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Read the sheet data to get the correct country-food mapping
    console.log('📊 Reading Google Sheet for correct mapping...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'A:Z',
    });

    const rows = response.data.values;
    const headers = rows[0];
    
    // Create correct country-food mapping from sheet
    const correctMapping = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const country = row[0]; // Country column
      const dishName = row[1]; // Dish Name column
      
      if (country && dishName) {
        if (!correctMapping[country]) {
          correctMapping[country] = [];
        }
        correctMapping[country].push(dishName);
      }
    }

    console.log(`📊 Found ${Object.keys(correctMapping).length} countries with correct mappings`);

    // Get all country folders from Google Drive
    const foldersResponse = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    const countryFolders = foldersResponse.data.files;
    console.log(`📁 Found ${countryFolders.length} country folders`);

    let totalProcessed = 0;
    let totalUploaded = 0;

    // Process each country individually
    for (const countryFolder of countryFolders) {
      const countryName = countryFolder.name;
      console.log(`\n🌍 Processing country: ${countryName}`);
      
      // Get the correct dishes for this country from the sheet
      const correctDishes = correctMapping[countryName] || [];
      console.log(`  📋 Correct dishes for ${countryName}: ${correctDishes.length}`);
      
      try {
        // Get food folders in this country
        const foodFoldersResponse = await drive.files.list({
          q: `'${countryFolder.id}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)',
        });

        const foodFolders = foodFoldersResponse.data.files;
        console.log(`  🍽️ Found ${foodFolders.length} food folders in Google Drive`);
        
        // Process each food folder that matches the correct dishes
        for (const foodFolder of foodFolders) {
          const foodName = foodFolder.name;
          
          // Check if this food belongs to this country according to the sheet
          if (correctDishes.includes(foodName)) {
            console.log(`    🍽️ Processing food: ${foodName} (CORRECT for ${countryName})`);
            
            try {
              // Get all files in this food folder
              const filesResponse = await drive.files.list({
                q: `'${foodFolder.id}' in parents`,
                fields: 'files(id, name, mimeType)',
              });

              const files = filesResponse.data.files;
              console.log(`      📄 Found ${files.length} files`);
              
              if (files.length > 0) {
                // Filter for image files
                const imageFiles = files.filter(file => 
                  file.mimeType.startsWith('image/') || 
                  file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i)
                );
                
                console.log(`      📸 Found ${imageFiles.length} image files`);
                
                if (imageFiles.length > 0) {
                  // Process each image
                  for (let i = 0; i < imageFiles.length; i++) {
                    const imageFile = imageFiles[i];
                    console.log(`        📸 Processing: ${imageFile.name}`);
                    
                    try {
                      // Download image from Google Drive
                      const imageResponse = await drive.files.get({
                        fileId: imageFile.id,
                        alt: 'media',
                      }, { responseType: 'stream' });

                      // Convert to buffer
                      const chunks = [];
                      imageResponse.data.on('data', chunk => chunks.push(chunk));
                      await new Promise((resolve, reject) => {
                        imageResponse.data.on('end', resolve);
                        imageResponse.data.on('error', reject);
                      });
                      const imageBuffer = Buffer.concat(chunks);

                      // Process with Sharp
                      const processedBuffer = await sharp(imageBuffer)
                        .jpeg({ quality: 90 })
                        .toBuffer();

                      // Create proper filename
                      const cleanFoodName = foodName.toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '-');
                      const filename = `${cleanFoodName}-${i + 1}.jpg`;

                      // Upload to Cloudinary with correct country
                      const uploadResult = await new Promise((resolve, reject) => {
                        cloudinary.uploader.upload_stream(
                          {
                            folder: `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${cleanFoodName}`,
                            public_id: filename.replace('.jpg', ''),
                            resource_type: 'image',
                          },
                          (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                          }
                        ).end(processedBuffer);
                      });

                      console.log(`        ✅ Uploaded: ${filename} -> ${uploadResult.public_id}`);
                      totalUploaded++;
                      
                    } catch (error) {
                      console.log(`        ❌ Error processing ${imageFile.name}:`, error.message);
                    }
                  }
                }
              }
              
              totalProcessed++;
              
            } catch (error) {
              console.log(`    ❌ Error processing food ${foodName}:`, error.message);
            }
          } else {
            console.log(`    ⚠️ Skipping food: ${foodName} (NOT in ${countryName} according to sheet)`);
          }
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing country ${countryName}:`, error.message);
      }
    }

    console.log('\n✅ Processing completed!');
    console.log(`📊 Total foods processed: ${totalProcessed}`);
    console.log(`📸 Total images uploaded: ${totalUploaded}`);
    
  } catch (error) {
    console.error('❌ Error fixing country-food mapping:', error);
  }
}

// Run the fix
fixCountryFoodMapping();
