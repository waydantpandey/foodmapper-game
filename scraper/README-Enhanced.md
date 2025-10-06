# Enhanced Wikipedia Food Scraper

This enhanced scraper integrates with your existing Google Sheets and Google Drive workflow to automatically add Wikipedia images to your food guessing game.

## 🎯 What it does

1. **Scrapes Wikipedia images** for existing dishes in your Google Sheet
2. **Uploads to existing Cloudinary folders** (not separate Wikipedia folder)
3. **Uploads to existing Google Drive folders** with proper naming
4. **Updates Google Sheets** with new image URLs (adds columns 4, 5, 6+ as needed)
5. **Generates upload scripts** for Google Drive

## 🚀 Quick Start

### 1. Setup Google Integration

```bash
cd scraper
node setup-google-integration.js
```

This will guide you through:
- Setting up Google Sheets API
- Creating a service account
- Configuring environment variables

### 2. Add New Image URL Columns

```bash
node google-sheets-updater.js
```

This adds new columns (Image URL 4, 5, 6, etc.) to your Google Sheet.

### 3. Run the Enhanced Scraper

```bash
node enhanced-wikipedia-scraper.js
```

## 📁 Folder Structure

The scraper maintains your existing structure:

**Cloudinary:**
```
food-guessing-game/
├── italy/
│   ├── margherita-pizza/
│   │   ├── margherita-pizza_1.jpg
│   │   ├── margherita-pizza_2.jpg
│   │   └── margherita-pizza_4.jpg (new from Wikipedia)
│   └── carbonara/
│       └── carbonara_4.jpg (new from Wikipedia)
```

**Google Drive:**
```
Food Guessing Game/
├── Italy/
│   ├── Margherita Pizza/
│   │   ├── Margherita Pizza 1.jpg
│   │   ├── Margherita Pizza 2.jpg
│   │   └── Margherita Pizza 4.jpg (new from Wikipedia)
│   └── Carbonara/
│       └── Carbonara 4.jpg (new from Wikipedia)
```

## 🔧 Configuration

### Environment Variables (.env)

```env
GOOGLE_SHEETS_ID=your_sheets_id_here
CLOUDINARY_CLOUD_NAME=dwav84wrk
CLOUDINARY_API_KEY=589773693657812
CLOUDINARY_API_SECRET=V2qOKwLBhCEhjaIm8ex7AgwEdhY
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id_here
```

### Google Sheets Format

The scraper expects your Google Sheet to have:
- Column A: Country
- Column B: Dish Name
- Column C: Image URL 1
- Column D: Image URL 2
- Column E: Image URL 3
- Column F: Image URL 4 (added automatically)
- Column G: Image URL 5 (added automatically)
- ... and so on

## 📝 Usage

### Basic Usage

```bash
# Run the enhanced scraper
npm run scrape-enhanced
```

### Custom Dish List

Edit the `dishesToScrape` array in `enhanced-wikipedia-scraper.js`:

```javascript
const dishesToScrape = [
  { dishName: 'Margherita Pizza', countryName: 'Italy' },
  { dishName: 'Spaghetti Carbonara', countryName: 'Italy' },
  { dishName: 'Risotto', countryName: 'Italy' },
  // Add more dishes here
];
```

### Update API with New Images

After scraping, update your `src/app/api/foods/route.ts` with the new Cloudinary URLs:

```javascript
const cloudinaryImages: { [key: string]: string[] } = {
  'Margherita Pizza': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759332777/food-guessing-game/Italy/margherita-pizza/margherita-pizza_1.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759332779/food-guessing-game/Italy/margherita-pizza/margherita-pizza_2.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759332781/food-guessing-game/Italy/margherita-pizza/margherita-pizza_4.jpg', // New from Wikipedia
  ],
  // ... other dishes
};
```

## 🔄 Workflow

1. **Scraper runs** → Finds Wikipedia images for dishes
2. **Uploads to Cloudinary** → Uses existing folder structure
3. **Updates Google Sheets** → Adds new image URLs to existing rows
4. **Generates Google Drive scripts** → For manual upload to Drive
5. **Updates API** → You manually add new URLs to the API

## 🛠️ Troubleshooting

### Google Sheets API Issues
- Make sure the service account has "Editor" access to your sheet
- Check that the Google Sheets API is enabled
- Verify the sheet ID is correct

### Cloudinary Upload Issues
- Check your Cloudinary credentials
- Ensure the folder structure exists
- Check for rate limiting

### Wikipedia Scraping Issues
- Some dishes might not have Wikipedia articles
- Images might be copyrighted or low quality
- Rate limiting might apply (2-second delays between requests)

## 📊 Output Files

- `enhanced_scraping_results.json` - Complete results
- `google_drive_upload_[dish].sh` - Upload scripts for each dish
- Console logs with detailed progress

## 🎮 Integration with Game

After running the scraper:

1. **Update API** with new Cloudinary URLs
2. **Upload to Google Drive** using generated scripts
3. **Test the game** to ensure new images appear
4. **Update Google Sheet** manually if needed

The game will automatically use the new images once the API is updated!



