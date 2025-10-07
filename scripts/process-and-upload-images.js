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

async function processAndUploadImages() {
  try {
    console.log('🔄 Processing and uploading images...');
    
    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service-account-key.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Read the sheet data to get food names
    console.log('📊 Reading Google Sheet data...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'A:Z',
    });

    const rows = response.data.values;
    const headers = rows[0];
    
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
      
      if (food['Dish Name'] || food['Country']) {
        foods.push(food);
      }
    }

    console.log(`📊 Found ${foods.length} foods in the sheet`);

    // Get all country folders
    const foldersResponse = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
    });

    const countryFolders = foldersResponse.data.files;
    console.log(`📁 Found ${countryFolders.length} country folders`);

    let totalProcessed = 0;
    let totalUploaded = 0;

    // Process each country
    for (const countryFolder of countryFolders) {
      const countryName = countryFolder.name;
      console.log(`\n🌍 Processing country: ${countryName}`);
      
      try {
        // Get food folders in this country
        const foodFoldersResponse = await drive.files.list({
          q: `'${countryFolder.id}' in parents and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)',
        });

        const foodFolders = foodFoldersResponse.data.files;
        console.log(`  🍽️ Found ${foodFolders.length} food folders`);
        
        // Process each food folder
        for (const foodFolder of foodFolders) {
          const foodName = foodFolder.name;
          console.log(`    🍽️ Processing food: ${foodName}`);
          
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

                    // Upload to Cloudinary
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
        }
        
      } catch (error) {
        console.log(`  ❌ Error processing country ${countryName}:`, error.message);
      }
    }

    console.log('\n✅ Processing completed!');
    console.log(`📊 Total foods processed: ${totalProcessed}`);
    console.log(`📸 Total images uploaded: ${totalUploaded}`);
    
  } catch (error) {
    console.error('❌ Error processing images:', error);
  }
}

// Run the processing
processAndUploadImages();
