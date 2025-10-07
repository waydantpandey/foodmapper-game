const { google } = require('googleapis');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration - Update these with your actual IDs
const GOOGLE_SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Update this
const GOOGLE_DRIVE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE'; // Update this

async function setupCloudinaryFromSheet() {
  try {
    console.log('🔄 Setting up Cloudinary from Google Sheet...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Read the sheet data
    console.log('📊 Reading Google Sheet data...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'A:Z',
    });

    const rows = response.data.values;
    const headers = rows[0];
    
    console.log('📋 Headers found:', headers);
    
    // Convert to structured data
    const foods = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const food = {};
      
      headers.forEach((header, index) => {
        if (row[index] !== undefined && !header.toLowerCase().includes('image') && !header.toLowerCase().includes('url')) {
          food[header] = row[index];
        }
      });
      
      if (food.name || food.Name || food.food_name) {
        foods.push(food);
      }
    }

    console.log(`📊 Found ${foods.length} foods in the sheet`);

    // Group foods by country
    const foodsByCountry = {};
    foods.forEach(food => {
      const country = food.country || food.Country || food.location || food.Location || 'Unknown';
      if (!foodsByCountry[country]) {
        foodsByCountry[country] = [];
      }
      foodsByCountry[country].push(food);
    });

    console.log(`🌍 Found ${Object.keys(foodsByCountry).length} countries`);

    // Create Cloudinary folders and upload images
    for (const [country, countryFoods] of Object.entries(foodsByCountry)) {
      console.log(`\n🌍 Processing country: ${country}`);
      
      // Create country folder in Cloudinary
      const countryFolder = `food-guessing-game/${country.toLowerCase().replace(/\s+/g, '-')}`;
      
      for (const food of countryFoods) {
        const foodName = food.name || food.Name || food.food_name;
        const foodFolder = `${countryFolder}/${foodName.toLowerCase().replace(/\s+/g, '-')}`;
        
        console.log(`  🍽️ Processing food: ${foodName}`);
        
        // Search for images in Google Drive folder
        try {
          const imagesResponse = await drive.files.list({
            q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name contains '${foodName}' and mimeType contains 'image/'`,
            fields: 'files(id, name, webContentLink)',
          });

          if (imagesResponse.data.files.length > 0) {
            console.log(`    📸 Found ${imagesResponse.data.files.length} images for ${foodName}`);
            
            // Upload images to Cloudinary
            for (let i = 0; i < imagesResponse.data.files.length; i++) {
              const imageFile = imagesResponse.data.files[i];
              
              try {
                // Download image from Google Drive
                const imageResponse = await drive.files.get({
                  fileId: imageFile.id,
                  alt: 'media',
                }, { responseType: 'stream' });

                // Upload to Cloudinary
                const uploadResult = await new Promise((resolve, reject) => {
                  const uploadStream = cloudinary.uploader.upload_stream(
                    {
                      folder: foodFolder,
                      public_id: `${foodName.toLowerCase().replace(/\s+/g, '-')}_${i + 1}`,
                      resource_type: 'image',
                    },
                    (error, result) => {
                      if (error) reject(error);
                      else resolve(result);
                    }
                  );
                  
                  imageResponse.data.pipe(uploadStream);
                });

                console.log(`    ✅ Uploaded: ${imageFile.name} -> ${uploadResult.public_id}`);
                
              } catch (error) {
                console.log(`    ❌ Failed to upload ${imageFile.name}:`, error.message);
              }
            }
          } else {
            console.log(`    ⚠️ No images found for ${foodName}`);
          }
          
        } catch (error) {
          console.log(`    ❌ Error searching for images for ${foodName}:`, error.message);
        }
      }
    }

    console.log('\n✅ Cloudinary setup completed!');
    
    // Save the processed data
    const outputPath = path.join(__dirname, '../data/processed-foods.json');
    fs.writeFileSync(outputPath, JSON.stringify(foods, null, 2));
    console.log(`💾 Processed data saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error setting up Cloudinary:', error);
  }
}

// Run the script
setupCloudinaryFromSheet();
