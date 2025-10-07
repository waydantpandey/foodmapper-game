const fs = require('fs');
const path = require('path');

// Direct mapping of database dish names to Google Sheet dish names
const directMappings = {
  'Gadogado': 'Gado-Gado',
  'Po De Queijo': 'Pão de Queijo', 
  'Crpes': 'Crêpes',
  'Tortilla Espaola': 'Tortilla Española',
  'Bnh Xo': 'Bánh Xèo'
};

async function applyDirectDishMappings() {
  try {
    console.log('🔄 Applying direct dish name mappings...');

    // Read the current food database
    const foodsPath = path.join(process.cwd(), 'data', 'foods-database.json');
    const foodsData = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));

    // Read the Google Sheet data
    const sheetPath = path.join(process.cwd(), 'data', 'foods-from-sheet.json');
    const sheetData = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} foods in database`);
    console.log(`📊 Found ${sheetData.length} foods in Google Sheet`);

    // Create a lookup map using the direct mappings
    const sheetLookup = {};
    sheetData.forEach(item => {
      const country = item['Country'];
      const dishName = item['Dish Name'];
      const key = `${dishName}-${country}`.toLowerCase().replace(/\s+/g, '-');
      sheetLookup[key] = item;
    });

    console.log(`📋 Created lookup map with ${Object.keys(sheetLookup).length} entries`);

    // Apply direct mappings to foods
    let fixedCount = 0;
    const enhancedFoods = foodsData.map(food => {
      // Check if this food needs a direct mapping
      const mappedName = directMappings[food.name];
      
      if (mappedName) {
        console.log(`🔧 Mapping: ${food.name} → ${mappedName}`);
        
        // Create the lookup key with the mapped name
        const key = `${mappedName}-${food.country}`.toLowerCase().replace(/\s+/g, '-');
        const sheetItem = sheetLookup[key];
        
        if (sheetItem) {
          fixedCount++;
          console.log(`✅ Found match for ${food.name} → ${mappedName}`);
          
          // Use the precise coordinates from the sheet
          const lat = parseFloat(sheetItem['Origin City Latitude']);
          const lng = parseFloat(sheetItem['Origin City Longitude']);
          
          return {
            ...food,
            // Override with precise coordinates from the sheet
            lat: lat,
            lng: lng,
            // Add origin city information
            originCity: sheetItem['Origin City'],
            city: sheetItem['Origin City'],
            location: sheetItem['Country'],
            // Add the rich description
            description: sheetItem['Description'],
            // Keep original country name from sheet for consistency
            country: sheetItem['Country']
          };
        } else {
          console.warn(`⚠️ No sheet data found for mapped name: ${mappedName} (${food.country})`);
          return food;
        }
      } else {
        // Check if this food already has data
        if (food.originCity && food.description) {
          return food; // Already has data
        }
        
        // Try to find a match with the original name
        const key = `${food.name}-${food.country}`.toLowerCase().replace(/\s+/g, '-');
        const sheetItem = sheetLookup[key];
        
        if (sheetItem) {
          const lat = parseFloat(sheetItem['Origin City Latitude']);
          const lng = parseFloat(sheetItem['Origin City Longitude']);
          
          return {
            ...food,
            lat: lat,
            lng: lng,
            originCity: sheetItem['Origin City'],
            city: sheetItem['Origin City'],
            location: sheetItem['Country'],
            description: sheetItem['Description'],
            country: sheetItem['Country']
          };
        } else {
          console.warn(`⚠️ No sheet data found for: ${food.name} (${food.country})`);
          return food;
        }
      }
    });

    // Save the enhanced database
    fs.writeFileSync(foodsPath, JSON.stringify(enhancedFoods, null, 2));
    
    console.log(`✅ Fixed ${fixedCount} dishes with direct mappings`);
    console.log(`💾 Enhanced database saved to: ${foodsPath}`);

    // Verify the fixes
    const previouslyMissing = enhancedFoods.filter(food => 
      Object.keys(directMappings).includes(food.name)
    );
    
    console.log('\n🔍 Verification of fixed dishes:');
    previouslyMissing.forEach(food => {
      console.log(`  ${food.name} (${food.country})`);
      console.log(`    Origin City: ${food.originCity || 'MISSING'}`);
      console.log(`    Description: ${food.description ? 'PRESENT (' + food.description.substring(0, 50) + '...)' : 'MISSING'}`);
    });

  } catch (error) {
    console.error('❌ Error applying direct dish mappings:', error);
  }
}

applyDirectDishMappings();
