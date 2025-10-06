#!/usr/bin/env tsx
/**
 * Data Migration Script for Cloudinary Version
 * Migrates existing food data from JSON files to Supabase database with Cloudinary images
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface LegacyFoodData {
  name: string;
  images: string[];
  lat: number;
  lng: number;
  location: string;
  city: string;
  fact: string;
}

async function migrateData() {
  try {
    console.log('🚀 Starting data migration for Cloudinary version...');

    // Read the existing foods.json file from the original project
    const foodsPath = path.join(process.cwd(), '..', 'food-guessing-game', 'public', 'foods.json');
    
    if (!fs.existsSync(foodsPath)) {
      console.error('❌ foods.json file not found. Please ensure the original project exists.');
      process.exit(1);
    }

    const foodsData: LegacyFoodData[] = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));

    console.log(`📊 Found ${foodsData.length} dishes to migrate`);

    // Create a map to track countries
    const countryMap = new Map<string, string>();
    const cityMap = new Map<string, string>();

    // First, create all countries
    console.log('🌍 Creating countries...');
    const uniqueCountries = [...new Set(foodsData.map(food => food.location))];
    
    for (const countryName of uniqueCountries) {
      const countryCode = getCountryCode(countryName);
      
      const { data: country, error: countryError } = await supabase
        .from('countries')
        .insert({
          name: countryName,
          code: countryCode,
          description: `Traditional cuisine from ${countryName}`
        })
        .select()
        .single();

      if (countryError) {
        console.error(`Error creating country ${countryName}:`, countryError);
        continue;
      }

      countryMap.set(countryName, country.id);
      console.log(`✅ Created country: ${countryName}`);
    }

    // Create cities
    console.log('🏙️ Creating cities...');
    const uniqueCities = [...new Set(foodsData.map(food => ({ city: food.city, country: food.location })))];
    
    for (const { city, country } of uniqueCities) {
      const countryId = countryMap.get(country);
      if (!countryId) continue;

      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .insert({
          name: city,
          country_id: countryId,
          latitude: 0, // Will be updated with actual coordinates
          longitude: 0
        })
        .select()
        .single();

      if (cityError) {
        console.error(`Error creating city ${city}:`, cityError);
        continue;
      }

      cityMap.set(`${city}-${country}`, cityData.id);
      console.log(`✅ Created city: ${city}, ${country}`);
    }

    // Create dishes
    console.log('🍽️ Creating dishes...');
    let successCount = 0;
    let errorCount = 0;

    for (const food of foodsData) {
      try {
        const countryId = countryMap.get(food.location);
        const cityId = cityMap.get(`${food.city}-${food.location}`);
        
        if (!countryId) {
          console.error(`Country not found for ${food.name}`);
          errorCount++;
          continue;
        }

        // Create the dish
        const { data: dish, error: dishError } = await supabase
          .from('dishes')
          .insert({
            name: food.name,
            description: food.fact,
            fact: food.fact,
            country_id: countryId,
            city_id: cityId,
            difficulty_level: Math.floor(Math.random() * 5) + 1, // Random difficulty 1-5
            is_active: true
          })
          .select()
          .single();

        if (dishError) {
          console.error(`Error creating dish ${food.name}:`, dishError);
          errorCount++;
          continue;
        }

        // Update city coordinates if we have them
        if (cityId && food.lat && food.lng) {
          await supabase
            .from('cities')
            .update({
              latitude: food.lat,
              longitude: food.lng
            })
            .eq('id', cityId);
        }

        // Note: Images will need to be uploaded to Cloudinary separately
        // This is because we can't directly migrate Google Drive images
        console.log(`⚠️  Note: Images for ${food.name} need to be uploaded to Cloudinary manually`);

        successCount++;
        console.log(`✅ Created dish: ${food.name}`);

      } catch (error) {
        console.error(`Error processing ${food.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${successCount} dishes`);
    console.log(`❌ Errors: ${errorCount} dishes`);
    console.log(`🌍 Countries created: ${countryMap.size}`);
    console.log(`🏙️ Cities created: ${cityMap.size}`);
    console.log('\n📝 Next steps:');
    console.log('1. Upload images to Cloudinary using the admin panel');
    console.log('2. Set up your Cloudinary account if you haven\'t already');
    console.log('3. Use the admin panel at /admin to manage your dishes');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

function getCountryCode(countryName: string): string {
  const countryCodes: { [key: string]: string } = {
    'Lebanon': 'LBN',
    'Indonesia': 'IDN',
    'Poland': 'POL',
    'Norway': 'NOR',
    'Portugal': 'PRT',
    'Turkey': 'TUR',
    'Egypt': 'EGY',
    'UK': 'GBR',
    'New Zealand': 'NZL',
    'Nigeria': 'NGA',
    'Colombia': 'COL',
    'Sweden': 'SWE',
    'Argentina': 'ARG',
    'Morocco': 'MAR',
    'South Africa': 'ZAF',
    'Germany': 'DEU',
    'Greece': 'GRC',
    'Ethiopia': 'ETH',
    'Australia': 'AUS',
    'Philippines': 'PHL',
    'Brazil': 'BRA',
    'Peru': 'PER',
    'Canada': 'CAN',
    'Iceland': 'ISL',
    'South Korea': 'KOR',
    'Vietnam': 'VNM',
    'Thailand': 'THA',
    'Spain': 'ESP',
    'France': 'FRA',
    'USA': 'USA',
    'China': 'CHN',
    'India': 'IND',
    'Mexico': 'MEX',
    'Japan': 'JPN',
    'Italy': 'ITA'
  };

  return countryCodes[countryName] || 'UNK';
}

// Run migration
migrateData();
