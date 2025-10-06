import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

// Types
interface CSVRow {
  Country: string;
  'Dish Name': string;
  'Image URL 1': string;
  'Image URL 2': string;
  'Image URL 3': string;
  'Origin City': string;
  'Origin City Latitude': string;
  'Origin City Longitude': string;
  Trivia: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface City {
  id: string;
  name: string;
  country_id: string;
  latitude: number;
  longitude: number;
}

interface Dish {
  id: string;
  name: string;
  description: string;
  fact: string;
  country_id: string;
  city_id: string;
  difficulty_level: number;
}

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to get country code
function getCountryCode(countryName: string): string {
  const countryCodes: { [key: string]: string } = {
    'Lebanon': 'LBN',
    'Indonesia': 'IDN',
    'Poland': 'POL',
    'Japan': 'JPN',
    'Italy': 'ITA',
    'India': 'IND',
    'Mexico': 'MEX',
    'France': 'FRA',
    'Thailand': 'THA',
    'China': 'CHN',
    'Brazil': 'BRA',
    'Spain': 'ESP',
    'United States': 'USA',
    'Germany': 'DEU',
    'United Kingdom': 'GBR',
    'Canada': 'CAN',
    'Australia': 'AUS',
    'South Korea': 'KOR',
    'Vietnam': 'VNM',
    'Turkey': 'TUR',
    'Greece': 'GRC',
    'Portugal': 'PRT',
    'Morocco': 'MAR',
    'Egypt': 'EGY',
    'South Africa': 'ZAF',
    'Argentina': 'ARG',
    'Peru': 'PER',
    'Chile': 'CHL',
    'Colombia': 'COL',
    'Venezuela': 'VEN',
    'Ecuador': 'ECU',
    'Bolivia': 'BOL',
    'Uruguay': 'URY',
    'Paraguay': 'PRY',
    'Guyana': 'GUY',
    'Suriname': 'SUR',
    'French Guiana': 'GUF',
  };
  return countryCodes[countryName] || 'UNK';
}

// Upload image to Cloudinary
async function uploadImageToCloudinary(imageUrl: string, publicId: string): Promise<string | null> {
  try {
    if (!imageUrl || imageUrl.trim() === '') return null;
    
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      folder: 'food-guessing-game',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error(`Failed to upload image ${imageUrl}:`, error);
    return null;
  }
}

// Main migration function
async function migrateData() {
  console.log('🚀 Starting migration from Google Sheets CSV to Supabase...');
  
  const csvPath = path.join(process.cwd(), '..', 'foods_data.csv');
  const rows: CSVRow[] = [];
  
  // Read CSV file
  console.log('📖 Reading CSV file...');
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 Found ${rows.length} rows in CSV`);
  
  // Get unique countries
  const uniqueCountries = [...new Set(rows.map(row => row.Country))];
  console.log(`🌍 Found ${uniqueCountries.length} unique countries`);
  
  // Insert countries
  console.log('🌍 Inserting countries...');
  const countryMap: { [key: string]: string } = {};
  
  for (const countryName of uniqueCountries) {
    const countryCode = getCountryCode(countryName);
    
    const { data: country, error } = await supabase
      .from('countries')
      .insert({
        name: countryName,
        code: countryCode,
        description: `Country known for ${countryName} cuisine`
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`Error inserting country ${countryName}:`, error);
      continue;
    }
    
    countryMap[countryName] = country.id;
    console.log(`✅ Inserted country: ${countryName} (${countryCode})`);
  }
  
  // Insert cities
  console.log('🏙️ Inserting cities...');
  const cityMap: { [key: string]: string } = {};
  
  for (const row of rows) {
    const cityKey = `${row.Country}-${row['Origin City']}`;
    if (cityMap[cityKey]) continue;
    
    const countryId = countryMap[row.Country];
    if (!countryId) continue;
    
    const { data: city, error } = await supabase
      .from('cities')
      .insert({
        name: row['Origin City'],
        country_id: countryId,
        latitude: parseFloat(row['Origin City Latitude']),
        longitude: parseFloat(row['Origin City Longitude'])
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`Error inserting city ${row['Origin City']}:`, error);
      continue;
    }
    
    cityMap[cityKey] = city.id;
    console.log(`✅ Inserted city: ${row['Origin City']}, ${row.Country}`);
  }
  
  // Insert dishes
  console.log('🍽️ Inserting dishes...');
  let dishCount = 0;
  
  for (const row of rows) {
    const countryId = countryMap[row.Country];
    const cityKey = `${row.Country}-${row['Origin City']}`;
    const cityId = cityMap[cityKey];
    
    if (!countryId || !cityId) {
      console.log(`⚠️ Skipping dish ${row['Dish Name']} - missing country or city`);
      continue;
    }
    
    const { data: dish, error } = await supabase
      .from('dishes')
      .insert({
        name: row['Dish Name'],
        description: row.Trivia,
        fact: row.Trivia,
        country_id: countryId,
        city_id: cityId,
        difficulty_level: 2 // Default difficulty
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`Error inserting dish ${row['Dish Name']}:`, error);
      continue;
    }
    
    // Upload images to Cloudinary
    const images = [row['Image URL 1'], row['Image URL 2'], row['Image URL 3']].filter(url => url && url.trim() !== '');
    
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const publicId = `food-guessing-game/${row['Dish Name'].toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;
      
      const cloudinaryUrl = await uploadImageToCloudinary(imageUrl, publicId);
      
      if (cloudinaryUrl) {
        await supabase
          .from('dish_images')
          .insert({
            dish_id: dish.id,
            cloudinary_public_id: publicId,
            cloudinary_url: cloudinaryUrl,
            image_order: i + 1,
            alt_text: `${row['Dish Name']} from ${row.Country}`
          });
        
        console.log(`✅ Uploaded image ${i + 1} for ${row['Dish Name']}`);
      }
    }
    
    dishCount++;
    console.log(`✅ Inserted dish: ${row['Dish Name']} (${dishCount}/${rows.length})`);
  }
  
  console.log('🎉 Migration completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Countries: ${Object.keys(countryMap).length}`);
  console.log(`   - Cities: ${Object.keys(cityMap).length}`);
  console.log(`   - Dishes: ${dishCount}`);
}

// Run migration
if (require.main === module) {
  migrateData().catch(console.error);
}

export { migrateData };
