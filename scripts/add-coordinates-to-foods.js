const fs = require('fs');
const path = require('path');

// Country coordinates mapping
const countryCoordinates = {
  'Argentina': { lat: -38.4161, lng: -63.6167 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'China': { lat: 35.8617, lng: 104.1954 },
  'Egypt': { lat: 26.0975, lng: 30.0444 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'Greece': { lat: 39.0742, lng: 21.8243 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Indonesia': { lat: -0.7893, lng: 113.9213 },
  'Iran': { lat: 32.4279, lng: 53.6880 },
  'Israel': { lat: 31.0461, lng: 34.8516 },
  'Italy': { lat: 41.8719, lng: 12.5674 },
  'Japan': { lat: 36.2048, lng: 138.2529 },
  'Korea': { lat: 35.9078, lng: 127.7669 },
  'Lebanon': { lat: 33.8547, lng: 35.8623 },
  'Malaysia': { lat: 4.2105, lng: 101.9758 },
  'Mexico': { lat: 23.6345, lng: -102.5528 },
  'Morocco': { lat: 31.6295, lng: -7.9811 },
  'Philippines': { lat: 12.8797, lng: 121.7740 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Spain': { lat: 40.4637, lng: -3.7492 },
  'Thailand': { lat: 15.8700, lng: 100.9925 },
  'Turkey': { lat: 38.9637, lng: 35.2433 },
  'Uk': { lat: 55.3781, lng: -3.4360 },
  'Usa': { lat: 39.8283, lng: -98.5795 },
  'Vietnam': { lat: 14.0583, lng: 108.2772 }
};

async function addCoordinatesToFoods() {
  try {
    console.log('🔄 Adding coordinates to food database...');

    // Read the current food database
    const dataPath = path.join(process.cwd(), 'data', 'foods-database.json');
    const foodsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} foods to process`);

    // Add coordinates to each food
    const updatedFoods = foodsData.map(food => {
      const country = food.country;
      const coordinates = countryCoordinates[country];
      
      if (coordinates) {
        return {
          ...food,
          lat: coordinates.lat,
          lng: coordinates.lng
        };
      } else {
        console.warn(`⚠️ No coordinates found for country: ${country}`);
        return food;
      }
    });

    // Save the updated database
    fs.writeFileSync(dataPath, JSON.stringify(updatedFoods, null, 2));
    
    console.log(`✅ Added coordinates to ${updatedFoods.length} foods`);
    console.log(`💾 Updated database saved to: ${dataPath}`);

    // Verify the update
    const sampleFood = updatedFoods[0];
    console.log('📋 Sample food with coordinates:');
    console.log(`  ${sampleFood.name} (${sampleFood.country}) - lat: ${sampleFood.lat}, lng: ${sampleFood.lng}`);

  } catch (error) {
    console.error('❌ Error adding coordinates to foods:', error);
  }
}

addCoordinatesToFoods();
