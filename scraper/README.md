# Wikipedia Food Image Scraper

A tool to automatically scrape high-quality food images from Wikipedia for the food guessing game.

## 🚀 Features

- **Automatic Wikipedia Search**: Finds the main Wikipedia article for each food
- **High-Quality Images**: Downloads images in 800px resolution
- **Smart Filtering**: Only downloads food-related images from infoboxes and galleries
- **Batch Processing**: Scrapes multiple foods at once
- **Rate Limiting**: Respectful delays between requests
- **Duplicate Prevention**: Skips already downloaded images

## 📦 Installation

```bash
cd scraper
npm install
```

## 🎯 Usage

### Basic Usage

```bash
npm run scrape
```

### Custom Food List

Edit the `foodsToScrape` array in `wikipedia-food-scraper.js`:

```javascript
const foodsToScrape = [
  'Pizza Margherita',
  'Pasta Carbonara',
  'Risotto',
  'Gelato',
  'Tiramisu',
  'Lasagna',
  'Osso Buco',
  'Bruschetta'
];
```

### Programmatic Usage

```javascript
const WikipediaFoodScraper = require('./wikipedia-food-scraper');

const scraper = new WikipediaFoodScraper();
await scraper.init();

const images = await scraper.scrapeFoodImages('Pizza Margherita', 5);
console.log(images);

await scraper.close();
```

## 📁 Output

The scraper creates:

- `downloaded_images/` - Folder with all downloaded images
- `scraping_results.json` - Metadata about downloaded images
- `upload_to_google_drive.sh` - Script to help with Google Drive upload

## 🔧 Configuration

### Image Quality
- Images are downloaded in 800px resolution
- Automatically converts Wikipedia thumbnails to high-res versions

### Rate Limiting
- 1 second delay between food searches
- Respectful to Wikipedia's servers

### File Naming
- Images are named: `food_name_1.jpg`, `food_name_2.jpg`, etc.
- Special characters are converted to underscores

## 🎯 Integration with Food Game

1. **Run the scraper** for foods you want to add
2. **Review downloaded images** in `./downloaded_images/`
3. **Upload to Google Drive** using the generated script
4. **Update Google Sheet** with new image links
5. **Game automatically picks up** new images from Cloudinary

## ⚠️ Important Notes

- **Respect Wikipedia's Terms of Service**
- **Use for educational/personal projects only**
- **Don't overload Wikipedia's servers**
- **Check image licenses** before commercial use

## 🐛 Troubleshooting

### Common Issues

1. **No images found**: Try different food name variations
2. **Download fails**: Check internet connection
3. **Puppeteer errors**: Update to latest version

### Debug Mode

Add `headless: false` to see the browser in action:

```javascript
this.browser = await puppeteer.launch({ 
  headless: false, // Shows browser window
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

## 📊 Example Output

```
🚀 Starting Wikipedia Food Scraper...
🔍 Searching for images of: Pizza Margherita
📖 Found article: https://en.wikipedia.org/wiki/Pizza_Margherita
📸 Found 8 images for Pizza Margherita
✅ Downloaded: pizza_margherita_1.jpg
✅ Downloaded: pizza_margherita_2.jpg
✅ Downloaded: pizza_margherita_3.jpg
```

## 🤝 Contributing

Feel free to improve the scraper:
- Better image quality detection
- More image sources
- Better error handling
- GUI interface



