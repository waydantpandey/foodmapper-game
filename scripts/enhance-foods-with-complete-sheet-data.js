const fs = require('fs');
const path = require('path');

async function enhanceFoodsWithCompleteSheetData() {
  try {
    console.log('🔄 Enhancing food database with complete Google Sheet data...');

    // Read the current food database
    const foodsPath = path.join(process.cwd(), 'data', 'foods-database.json');
    const foodsData = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));

    // Read the Google Sheet data
    const sheetPath = path.join(process.cwd(), 'data', 'foods-from-sheet.json');
    const sheetData = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} foods in database`);
    console.log(`📊 Found ${sheetData.length} foods in Google Sheet`);

    // Create a lookup map from the sheet data using dish name and country
    const sheetLookup = {};
    sheetData.forEach(item => {
      const key = `${item['Dish Name']}-${item['Country']}`.toLowerCase().replace(/\s+/g, '-');
      sheetLookup[key] = item;
    });

    console.log(`📋 Created lookup map with ${Object.keys(sheetLookup).length} entries`);

    // Enhance each food with complete sheet data
    let enhancedCount = 0;
    const enhancedFoods = foodsData.map(food => {
      // Create the same key format for lookup
      const key = `${food.name}-${food.country}`.toLowerCase().replace(/\s+/g, '-');
      const sheetItem = sheetLookup[key];
      
      if (sheetItem) {
        enhancedCount++;
        
        // Use the precise coordinates from the sheet instead of country-level coordinates
        const lat = parseFloat(sheetItem['Origin City Latitude']);
        const lng = parseFloat(sheetItem['Origin City Longitude']);
        
        return {
          ...food,
          // Override with precise coordinates from the sheet
          lat: lat,
          lng: lng,
          // Add origin city information
          originCity: sheetItem['Origin City'],
          city: sheetItem['Origin City'], // For compatibility with existing code
          location: sheetItem['Country'], // For compatibility with existing code
          // Add the rich description
          description: sheetItem['Description'],
          // Keep original country name from sheet for consistency
          country: sheetItem['Country']
        };
      } else {
        console.warn(`⚠️ No sheet data found for: ${food.name} (${food.country})`);
        return food;
      }
    });

    // Save the enhanced database
    fs.writeFileSync(foodsPath, JSON.stringify(enhancedFoods, null, 2));
    
    console.log(`✅ Enhanced ${enhancedCount} foods with complete sheet data`);
    console.log(`💾 Enhanced database saved to: ${foodsPath}`);

    // Verify the enhancement
    const sampleFood = enhancedFoods.find(food => food.originCity);
    if (sampleFood) {
      console.log('📋 Sample enhanced food:');
      console.log(`  ${sampleFood.name} (${sampleFood.country})`);
      console.log(`  Origin City: ${sampleFood.originCity}`);
      console.log(`  Coordinates: ${sampleFood.lat}, ${sampleFood.lng}`);
      console.log(`  Description: ${sampleFood.description.substring(0, 100)}...`);
    }

    // Show statistics
    const foodsWithOriginCity = enhancedFoods.filter(food => food.originCity).length;
    const foodsWithDescription = enhancedFoods.filter(food => food.description).length;
    const foodsWithPreciseCoords = enhancedFoods.filter(food => food.lat && food.lng).length;
    
    console.log('\n📊 Enhancement Statistics:');
    console.log(`  Foods with origin city: ${foodsWithOriginCity}`);
    console.log(`  Foods with descriptions: ${foodsWithDescription}`);
    console.log(`  Foods with precise coordinates: ${foodsWithPreciseCoords}`);
    console.log(`  Total foods: ${enhancedFoods.length}`);

  } catch (error) {
    console.error('❌ Error enhancing foods with complete sheet data:', error);
  }
}

enhanceFoodsWithCompleteSheetData();
