const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load credentials
const credentialsPath = path.join(__dirname, 'credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Initialize Google Drive API
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

// Food data from your list
const foodData = [
  { country: 'India', dishes: ['Butter Chicken', 'Biryani', 'Samosa', 'Paneer Tikka', 'Masala Dosa', 'Chole Bhature'] },
  { country: 'Italy', dishes: ['Pizza', 'Pasta Carbonara', 'Lasagna', 'Risotto', 'Gelato', 'Tiramisu'] },
  { country: 'USA', dishes: ['Burger', 'Hot Dog', 'Fried Chicken', 'BBQ Ribs', 'Mac and Cheese', 'Apple Pie'] },
  { country: 'Mexico', dishes: ['Tacos', 'Burrito', 'Quesadilla', 'Guacamole', 'Churros', 'Enchiladas'] },
  { country: 'China', dishes: ['Kung Pao Chicken', 'Peking Duck', 'Dim Sum', 'Sweet and Sour Pork', 'Fried Rice', 'Spring Rolls'] },
  { country: 'Japan', dishes: ['Sushi', 'Ramen', 'Tempura', 'Udon', 'Miso Soup', 'Okonomiyaki'] },
  { country: 'France', dishes: ['Croissant', 'Baguette', 'Crêpes', 'Ratatouille', 'Coq au Vin', 'Macarons'] },
  { country: 'Spain', dishes: ['Paella', 'Churros', 'Tortilla Española', 'Gazpacho', 'Patatas Bravas', 'Jamón Ibérico'] },
  { country: 'Thailand', dishes: ['Pad Thai', 'Green Curry', 'Tom Yum Soup', 'Mango Sticky Rice', 'Satay', 'Som Tum'] },
  { country: 'Greece', dishes: ['Moussaka', 'Souvlaki', 'Greek Salad', 'Tzatziki', 'Baklava', 'Gyro'] },
  { country: 'Brazil', dishes: ['Feijoada', 'Pão de Queijo', 'Coxinha', 'Brigadeiro', 'Moqueca', 'Churrasco'] },
  { country: 'Turkey', dishes: ['Kebabs', 'Baklava', 'Meze', 'Lahmacun', 'Turkish Delight', 'Pide'] },
  { country: 'Germany', dishes: ['Schnitzel', 'Pretzel', 'Bratwurst', 'Sauerkraut', 'Black Forest Cake', 'Kartoffelsalat'] },
  { country: 'UK', dishes: ['Fish and Chips', 'Sunday Roast', 'Full English Breakfast', 'Shepherd\'s Pie', 'Scones', 'Yorkshire Pudding'] },
  { country: 'Russia', dishes: ['Borscht', 'Pelmeni', 'Blini', 'Shashlik', 'Pirozhki', 'Olivier Salad'] },
  { country: 'Korea', dishes: ['Kimchi', 'Bibimbap', 'Bulgogi', 'Tteokbokki', 'Japchae', 'Samgyeopsal'] },
  { country: 'Vietnam', dishes: ['Pho', 'Banh Mi', 'Spring Rolls', 'Bun Cha', 'Egg Coffee', 'Com Tam'] },
  { country: 'Indonesia', dishes: ['Nasi Goreng', 'Satay', 'Rendang', 'Gado-Gado', 'Bakso', 'Soto'] },
  { country: 'Egypt', dishes: ['Koshari', 'Falafel', 'Shawarma', 'Molokhia', 'Fattah', 'Baklava'] },
  { country: 'South Africa', dishes: ['Biltong', 'Bunny Chow', 'Boerewors', 'Bobotie', 'Chakalaka', 'Milk Tart'] },
  { country: 'Argentina', dishes: ['Asado', 'Empanadas', 'Milanesa', 'Chimichurri', 'Provoleta', 'Dulce de Leche'] },
  { country: 'Australia', dishes: ['Meat Pie', 'Lamingtons', 'Pavlova', 'Barramundi', 'Kangaroo Steak', 'Vegemite Toast'] },
  { country: 'Canada', dishes: ['Poutine', 'Butter Tart', 'Nanaimo Bar', 'Maple Syrup Pancakes', 'Tourtière', 'BeaverTails'] },
  { country: 'Morocco', dishes: ['Tagine', 'Couscous', 'Harira', 'Briouat', 'Pastilla', 'Chebakia'] },
  { country: 'Lebanon', dishes: ['Hummus', 'Tabbouleh', 'Kibbeh', 'Shish Taouk', 'Baklava', 'Fattoush'] },
  { country: 'Ethiopia', dishes: ['Injera', 'Doro Wat', 'Kitfo', 'Shiro', 'Tibs', 'Berbere Stew'] },
  { country: 'Philippines', dishes: ['Adobo', 'Sinigang', 'Lechon', 'Lumpia', 'Halo-Halo', 'Pancit'] },
  { country: 'Malaysia', dishes: ['Nasi Lemak', 'Char Kway Teow', 'Roti Canai', 'Laksa', 'Satay', 'Teh Tarik'] },
  { country: 'Peru', dishes: ['Ceviche', 'Lomo Saltado', 'Aji de Gallina', 'Anticuchos', 'Papa a la Huancaína', 'Picarones'] },
  { country: 'Portugal', dishes: ['Bacalhau', 'Pastéis de Nata', 'Francesinha', 'Caldo Verde', 'Piri Piri Chicken', 'Sardines'] },
  { country: 'Sweden', dishes: ['Meatballs', 'Gravlax', 'Smörgåsbord', 'Prinsesstårta', 'Räksmörgås', 'Pea Soup'] },
  { country: 'Poland', dishes: ['Pierogi', 'Bigos', 'Żurek', 'Kielbasa', 'Placki Ziemniaczane', 'Makowiec'] },
  { country: 'Iran', dishes: ['Kebab', 'Ghormeh Sabzi', 'Fesenjan', 'Tahdig', 'Ash Reshteh', 'Sholeh Zard'] },
  { country: 'Saudi Arabia', dishes: ['Kabsa', 'Shawarma', 'Falafel', 'Harees', 'Mutabbaq', 'Jareesh'] },
  { country: 'Israel', dishes: ['Falafel', 'Hummus', 'Shakshuka', 'Sabich', 'Bourekas', 'Malabi'] }
];

function sanitizeFolderName(name) {
  return name.replace(/'/g, '').replace(/"/g, '').replace(/\\/g, '').replace(/\//g, '');
}

async function findOrCreateFolder(name, parentId = null) {
  try {
    const sanitizedName = sanitizeFolderName(name);
    
    // Search for existing folder
    const query = parentId 
      ? `name='${sanitizedName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${sanitizedName}' and parents in 'root' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)'
    });

    if (response.data.files.length > 0) {
      console.log(`📁 Found existing folder: ${sanitizedName}`);
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: sanitizedName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      folderMetadata.parents = [parentId];
    }

    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id, name'
    });

    console.log(`✅ Created folder: ${sanitizedName}`);
    return folder.data.id;
  } catch (error) {
    console.error(`❌ Error with folder ${sanitizeFolderName(name)}:`, error.message);
    throw error;
  }
}

async function createProperFolderStructure() {
  try {
    console.log('🔍 Looking for your "food data 1" folder...');
    
    // First, let's see what folders are accessible
    const allFolders = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name, parents)',
      pageSize: 100
    });

    console.log('📁 Available folders:');
    allFolders.data.files.forEach(file => {
      const parentInfo = file.parents ? ` (parent: ${file.parents[0]})` : ' (root)';
      console.log(`  - ${file.name}${parentInfo}`);
    });

    // Look for "food data 1" folder
    const foodDataFolder = allFolders.data.files.find(f => 
      f.name === 'food data 1' || f.name === 'Food Data 1' || f.name === 'Food Data'
    );
    
    if (!foodDataFolder) {
      console.log('❌ "food data 1" folder not found');
      console.log('💡 Please create a folder called "food data 1" in your Google Drive and share it with: food-scraper@foodmapper-472618.iam.gserviceaccount.com');
      console.log('   Then run this script again.');
      return;
    }

    console.log(`✅ Found "food data 1" folder: ${foodDataFolder.id}`);
    console.log(`🔗 Direct link: https://drive.google.com/drive/folders/${foodDataFolder.id}`);
    
    let totalFolders = 0;
    let totalDishes = 0;

    // Create country and dish folders
    for (const countryData of foodData) {
      console.log(`\n🌍 Creating folders for ${countryData.country}...`);
      
      // Create country folder
      const countryFolderId = await findOrCreateFolder(countryData.country, foodDataFolder.id);
      totalFolders++;
      
      // Create dish folders within country
      for (const dish of countryData.dishes) {
        await findOrCreateFolder(dish, countryFolderId);
        totalDishes++;
      }
      
      console.log(`✅ Created ${countryData.dishes.length} dish folders for ${countryData.country}`);
    }

    console.log('\n🎉 FOLDER STRUCTURE CREATION COMPLETE!');
    console.log(`📊 Summary:`);
    console.log(`   - Countries: ${foodData.length}`);
    console.log(`   - Total folders created: ${totalFolders + totalDishes}`);
    console.log(`   - Dishes: ${totalDishes}`);
    console.log(`\n📁 Main folder: "food data 1" (in your Google Drive)`);
    console.log(`🔗 Direct link: https://drive.google.com/drive/folders/${foodDataFolder.id}`);

  } catch (error) {
    console.error('❌ Error creating folder structure:', error.message);
    process.exit(1);
  }
}

// Run the script
createProperFolderStructure();

