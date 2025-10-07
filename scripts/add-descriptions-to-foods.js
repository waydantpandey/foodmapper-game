const fs = require('fs');
const path = require('path');

async function addDescriptionsToFoods() {
  try {
    console.log('🔄 Adding descriptions to food database...');

    // Read the current food database
    const foodsPath = path.join(process.cwd(), 'data', 'foods-database.json');
    const foodsData = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));

    // Read the Google Sheet data
    const sheetPath = path.join(process.cwd(), 'data', 'foods-from-sheet.json');
    const sheetData = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} foods in database`);
    console.log(`📊 Found ${sheetData.length} foods in Google Sheet`);

    // Create a lookup map from the sheet data
    const sheetLookup = {};
    sheetData.forEach(item => {
      const key = `${item['Dish Name']}-${item['Country']}`.toLowerCase().replace(/\s+/g, '-');
      sheetLookup[key] = item;
    });

    console.log(`📋 Created lookup map with ${Object.keys(sheetLookup).length} entries`);

    // Add descriptions to each food
    let descriptionsAdded = 0;
    const updatedFoods = foodsData.map(food => {
      // Create the same key format for lookup
      const key = `${food.name}-${food.country}`.toLowerCase().replace(/\s+/g, '-');
      const sheetItem = sheetLookup[key];
      
      if (sheetItem && sheetItem['Description']) {
        descriptionsAdded++;
        return {
          ...food,
          description: sheetItem['Description']
        };
      } else {
        console.warn(`⚠️ No description found for: ${food.name} (${food.country})`);
        return food;
      }
    });

    // Save the updated database
    fs.writeFileSync(foodsPath, JSON.stringify(updatedFoods, null, 2));
    
    console.log(`✅ Added descriptions to ${descriptionsAdded} foods`);
    console.log(`💾 Updated database saved to: ${foodsPath}`);

    // Verify the update
    const sampleFood = updatedFoods.find(food => food.description);
    if (sampleFood) {
      console.log('📋 Sample food with description:');
      console.log(`  ${sampleFood.name} (${sampleFood.country})`);
      console.log(`  Description: ${sampleFood.description.substring(0, 100)}...`);
    }

  } catch (error) {
    console.error('❌ Error adding descriptions to foods:', error);
  }
}

addDescriptionsToFoods();
