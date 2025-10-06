# Migration Guide: Google Sheets to Supabase + Cloudinary

This guide will help you migrate your food data from Google Sheets to the new Supabase + Cloudinary database system.

## 🎯 What This Migration Does

- **Migrates countries** from your CSV to Supabase
- **Migrates cities** with coordinates to Supabase  
- **Migrates dishes** with all metadata to Supabase
- **Uploads images** from Google Drive URLs to Cloudinary
- **Maintains relationships** between countries, cities, and dishes

## 📋 Prerequisites

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and service role key from Settings > API
3. Note down these values for the setup

### 2. Cloudinary Setup
1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. Get your cloud name, API key, and API secret from the dashboard
3. Note down these values for the setup

### 3. Google Drive Access
- Your CSV file should be accessible at `../foods_data.csv`
- Make sure Google Drive image URLs are publicly accessible

## 🚀 Migration Steps

### Step 1: Setup Migration Environment
```bash
cd /Users/waydant/food-guessing-game-cloudinary
npm run setup:migration
```

This will:
- Ask for your Supabase credentials
- Ask for your Cloudinary credentials  
- Create `.env.local` file with all settings
- Install required dependencies

### Step 2: Setup Database Schema
```bash
npm run db:setup
```

This will:
- Create all necessary tables in Supabase
- Set up relationships and indexes
- Insert initial data (countries, categories)

### Step 3: Run Migration
```bash
npm run migrate:sheets
```

This will:
- Read your `foods_data.csv` file
- Migrate all countries to Supabase
- Migrate all cities with coordinates
- Migrate all dishes with metadata
- Upload all images to Cloudinary
- Create proper relationships

## 📊 Data Mapping

| CSV Column | Supabase Table | Notes |
|------------|----------------|-------|
| Country | countries | Creates country records with ISO codes |
| Origin City | cities | Links to country, includes coordinates |
| Dish Name | dishes | Main dish record |
| Trivia | dishes.fact | Food fact/description |
| Image URL 1-3 | dish_images | Uploads to Cloudinary |
| Origin City Latitude/Longitude | cities | Precise coordinates |

## 🔍 Verification

After migration, verify your data:

1. **Check Supabase Dashboard:**
   - Go to Table Editor
   - Verify countries, cities, dishes tables have data
   - Check dish_images table for uploaded images

2. **Check Cloudinary Dashboard:**
   - Go to Media Library
   - Look for `food-guessing-game` folder
   - Verify images are uploaded correctly

3. **Test the Game:**
   - Run `npm run dev`
   - Visit `http://localhost:3000`
   - Verify the game loads with your data

## 🛠️ Troubleshooting

### Common Issues:

**"Module not found: csv-parser"**
```bash
npm install csv-parser
```

**"Supabase connection failed"**
- Check your `.env.local` file
- Verify Supabase URL and service role key
- Make sure your Supabase project is active

**"Cloudinary upload failed"**
- Check your Cloudinary credentials
- Verify image URLs are accessible
- Check Cloudinary upload limits

**"CSV file not found"**
- Make sure `foods_data.csv` is in the parent directory
- Check file permissions

### Manual Database Setup:

If the automatic setup fails:

1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of `database/schema.sql`
3. Paste and run the SQL script
4. Then run `npm run migrate:sheets`

## 📈 Migration Progress

The migration script will show progress like:
```
🚀 Starting migration from Google Sheets CSV to Supabase...
📖 Reading CSV file...
📊 Found 152 rows in CSV
🌍 Found 25 unique countries
🌍 Inserting countries...
✅ Inserted country: Lebanon (LBN)
🏙️ Inserting cities...
✅ Inserted city: Beirut, Lebanon
🍽️ Inserting dishes...
✅ Inserted dish: Kibbeh (1/152)
✅ Uploaded image 1 for Kibbeh
🎉 Migration completed successfully!
```

## 🎉 After Migration

Once migration is complete:

1. **Your game will use the new database** instead of static JSON
2. **Images will load faster** from Cloudinary CDN
3. **You can manage data** through Supabase dashboard
4. **You can add new dishes** through the admin panel
5. **All existing functionality** will work exactly the same

## 🔄 Rollback (if needed)

If you need to go back to the old system:

1. The original game still works at `http://localhost:3003`
2. Your Google Sheets data is unchanged
3. You can delete the Supabase project if needed
4. Cloudinary images can be deleted from the dashboard

## 📞 Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all credentials are correct
3. Make sure all services are properly set up
4. Check the troubleshooting section above

The migration is designed to be safe and reversible, so don't worry about losing your original data!
