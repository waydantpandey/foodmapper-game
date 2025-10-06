# Comprehensive Food Scraper

This comprehensive scraper handles the complete workflow for your food guessing game:

1. **Checks Google Drive** for existing images
2. **Scrapes Wikipedia** for new food images
3. **Uploads to Cloudinary** with proper folder structure
4. **Uploads to Google Drive** with proper naming
5. **Updates Google Sheets** with new image URLs
6. **Adds new columns** as needed for additional images

## 🚀 Quick Start

### 1. Setup Google APIs
```bash
node setup-google-apis.js
```
Follow the instructions to create service account and download credentials.

### 2. Test with Sample Dishes
```bash
node comprehensive-test-scraper.js
```
This tests the workflow with 5 sample dishes.

### 3. Run Full Scraping
```bash
node full-comprehensive-scraper.js
```
This processes all 151 dishes from your foods.json file.

## 📁 Files Overview

- `comprehensive-test-scraper.js` - Test with 5 sample dishes
- `full-comprehensive-scraper.js` - Process all dishes
- `google-sheets-updater.js` - Handle Google Sheets updates
- `setup-google-apis.js` - Setup guide for Google APIs

## 🔧 Configuration

### Required Files
- `credentials.json` - Google service account credentials
- `../public/foods.json` - Your food data

### Environment Variables (Optional)
```bash
GOOGLE_SHEETS_ID=your-spreadsheet-id
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📊 What It Does

### For Each Dish:

1. **Check Google Drive**: Looks for existing images in `food-guessing-game/{country}/{dish}/`
2. **Process Existing Images** (if found): 
   - Downloads from Google Drive
   - Uploads to Cloudinary
   - Renames in Google Drive to `{dish_name}_{number}.jpg`
   - Updates Google Sheets with Cloudinary URLs

3. **Scrape Additional Images** (always):
   - Searches Wikipedia for the dish
   - Extracts food images (filters out logos/icons)
   - Downloads up to 3 additional images per dish
   - Continues numbering from existing images (e.g., if 2 exist, new ones are 3, 4, 5)
   - Uploads to both Cloudinary and Google Drive
   - Updates Google Sheets with all image URLs

### Google Sheets Updates:
- Finds existing dish rows or creates new ones
- Adds new image URL columns as needed
- Updates with Cloudinary URLs

### Folder Structure:
```
food-guessing-game/
├── italy/
│   ├── margherita-pizza/
│   │   ├── margherita_pizza_1.jpg
│   │   ├── margherita_pizza_2.jpg
│   │   └── margherita_pizza_3.jpg
│   └── spaghetti-carbonara/
│       ├── spaghetti_carbonara_1.jpg
│       └── spaghetti_carbonara_2.jpg
└── thailand/
    └── pad-thai/
        ├── pad_thai_1.jpg
        └── pad_thai_2.jpg
```

## 🎯 Features

- ✅ **Smart Image Detection**: Filters out Wikipedia logos and non-food images
- ✅ **Batch Processing**: Processes dishes in batches to avoid rate limits
- ✅ **Error Handling**: Continues processing even if some dishes fail
- ✅ **Progress Tracking**: Shows real-time progress and statistics
- ✅ **Comprehensive Logging**: Detailed logs for debugging
- ✅ **Resume Capability**: Can be run multiple times safely
- ✅ **Google Sheets Integration**: Automatically updates your spreadsheet
- ✅ **Dual Upload**: Images go to both Cloudinary and Google Drive

## 📈 Expected Results

For 151 dishes across 35 countries:
- **Processing Time**: 2-3 hours
- **Expected Images**: 300-450 images (2-3 per dish)
- **Success Rate**: 80-90% (some dishes may not have Wikipedia articles)
- **Storage**: ~200MB in Cloudinary, ~200MB in Google Drive

## 🔍 Monitoring

The scraper provides detailed progress updates:
- Current dish being processed
- Images found and uploaded
- Success/failure counts
- Progress percentage
- Final comprehensive report

## 🛠️ Troubleshooting

### Common Issues:
1. **Google API Errors**: Check credentials.json and permissions
2. **Rate Limits**: The scraper includes delays between requests
3. **Image Download Failures**: Some Wikipedia images may be protected
4. **Cloudinary Upload Errors**: Check API credentials and limits

### Debug Mode:
Set `headless: false` in the scraper to see the browser in action.

## 📝 Output Files

- `comprehensive-test-results.json` - Test results
- `full-comprehensive-report.json` - Full scraping report
- Console logs with detailed progress

## 🎮 Integration with Game

After scraping, update your API (`src/app/api/foods/route.ts`) to include the new Cloudinary URLs for the scraped dishes.

The scraper ensures all images are properly organized and ready for your food guessing game! 🍽️🎯
