const fs = require('fs');
const path = require('path');

// Create a mapping of database dish names to Google Sheet dish names
const dishNameMappings = {
  'gadogado': 'gado-gado',
  'po-de-queijo': 'pão-de-queijo',
  'crpes': 'crêpes',
  'tortilla-espaola': 'tortilla-española',
  'bnh-xo': 'bánh-xèo'
};

function normalizeDishName(name) {
  return name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9-]/g, '');
}

async function fixDishNameMatching() {
  try {
    console.log('🔄 Fixing dish name matching with Google Sheet...');

    // Read the current food database
    const foodsPath = path.join(process.cwd(), 'data', 'foods-database.json');
    const foodsData = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));

    // Read the Google Sheet data
    const sheetPath = path.join(process.cwd(), 'data', 'foods-from-sheet.json');
    const sheetData = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} foods in database`);
    console.log(`📊 Found ${sheetData.length} foods in Google Sheet`);

    // Create a lookup map with multiple matching strategies
    const sheetLookup = {};
    sheetData.forEach(item => {
      const country = item['Country'];
      const dishName = item['Dish Name'];
      
      // Create multiple keys for different matching strategies
      const keys = [
        `${dishName}-${country}`.toLowerCase().replace(/\s+/g, '-'),
        `${normalizeDishName(dishName)}-${country.toLowerCase().replace(/\s+/g, '-')}`,
        `${dishName.toLowerCase().replace(/\s+/g, '-')}-${country.toLowerCase().replace(/\s+/g, '-')}`
      ];
      
      // Add mapped keys if they exist
      const normalizedDish = normalizeDishName(dishName);
      if (dishNameMappings[normalizedDish]) {
        keys.push(`${dishNameMappings[normalizedDish]}-${country.toLowerCase().replace(/\s+/g, '-')}`);
      }
      
      keys.forEach(key => {
        sheetLookup[key] = item;
      });
    });

    console.log(`📋 Created lookup map with ${Object.keys(sheetLookup).length} entries`);

    // Enhance each food with better matching
    let enhancedCount = 0;
    let fixedCount = 0;
    const enhancedFoods = foodsData.map(food => {
      // Try multiple matching strategies
      const possibleKeys = [
        `${food.name}-${food.country}`.toLowerCase().replace(/\s+/g, '-'),
        `${normalizeDishName(food.name)}-${food.country.toLowerCase().replace(/\s+/g, '-')}`,
        `${food.name.toLowerCase().replace(/\s+/g, '-')}-${food.country.toLowerCase().replace(/\s+/g, '-')}`
      ];
      
      let sheetItem = null;
      let matchedKey = null;
      
      for (const key of possibleKeys) {
        if (sheetLookup[key]) {
          sheetItem = sheetLookup[key];
          matchedKey = key;
          break;
        }
      }
      
      if (sheetItem) {
        enhancedCount++;
        
        // Check if this was a fix (previously null values)
        const wasFixed = !food.originCity || !food.description;
        if (wasFixed) {
          fixedCount++;
          console.log(`🔧 Fixed: ${food.name} (${food.country}) - matched with key: ${matchedKey}`);
        }
        
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
        console.warn(`⚠️ No sheet data found for: ${food.name} (${food.country})`);
        return food;
      }
    });

    // Save the enhanced database
    fs.writeFileSync(foodsPath, JSON.stringify(enhancedFoods, null, 2));
    
    console.log(`✅ Enhanced ${enhancedCount} foods with sheet data`);
    console.log(`🔧 Fixed ${fixedCount} previously missing dishes`);
    console.log(`💾 Enhanced database saved to: ${foodsPath}`);

    // Verify the fixes
    const previouslyMissing = enhancedFoods.filter(food => 
      food.name.toLowerCase().includes('gadogado') || 
      food.name.toLowerCase().includes('po-de-queijo') ||
      food.name.toLowerCase().includes('crpes') ||
      food.name.toLowerCase().includes('tortilla-espaola')
    );
    
    console.log('\n🔍 Verification of previously missing dishes:');
    previouslyMissing.forEach(food => {
      console.log(`  ${food.name} (${food.country})`);
      console.log(`    Origin City: ${food.originCity || 'MISSING'}`);
      console.log(`    Description: ${food.description ? 'PRESENT' : 'MISSING'}`);
    });

  } catch (error) {
    console.error('❌ Error fixing dish name matching:', error);
  }
}

fixDishNameMatching();
