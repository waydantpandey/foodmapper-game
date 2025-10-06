#!/usr/bin/env node

const puppeteer = require('puppeteer');

class FilteringTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Starting Wikipedia Filtering Test');
    console.log('====================================\n');
    
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  }

  async testFoodPage(foodName) {
    console.log(`\n🍽️  Testing: ${foodName}`);
    console.log('='.repeat(40));
    
    try {
      // Search for the food on Wikipedia
      await this.page.goto(`https://en.wikipedia.org/wiki/${encodeURIComponent(foodName)}`, {
        waitUntil: 'networkidle2'
      });

      // Wait for page to load
      await this.page.waitForTimeout(2000);

      // Extract images with enhanced filtering
      const images = await this.page.evaluate(() => {
        const results = [];
        const imgElements = document.querySelectorAll('.infobox img, .thumb img, .gallery img');

        // Keywords to filter out non-food images
        const excludeKeywords = [
          'wikimedia', 'commons', 'wikibooks', 'wikipedia', 'logo', 'icon', 'symbol',
          'flag', 'banner', 'header', 'footer', 'button', 'arrow', 'star', 'badge',
          'medal', 'award', 'trophy', 'certificate', 'diagram', 'chart', 'graph',
          'map', 'location', 'pin', 'marker', 'sign', 'signage', 'text', 'font',
          'typography', 'letter', 'number', 'digit', 'character', 'symbol', 'emblem',
          'crest', 'coat', 'arms', 'seal', 'stamp', 'watermark', 'transparent',
          'background', 'pattern', 'texture', 'border', 'frame', 'outline',
          'wikidata', 'wikisource', 'wiktionary', 'wikiquote', 'wikinews', 'wikiversity',
          'wikivoyage', 'wikispecies', 'wikimediafoundation', 'creativecommons',
          'cc-by', 'cc-by-sa', 'public domain', 'pd-', 'fair use', 'fairuse',
          'screenshot', 'interface', 'ui', 'button', 'menu', 'toolbar', 'sidebar'
        ];

        imgElements.forEach(img => {
          if (img.src && img.src.includes('upload.wikimedia.org')) {
            const highResUrl = img.src.replace(/\/\d+px-/, '/800px-');
            const alt = (img.alt || '').toLowerCase();
            const title = (img.title || '').toLowerCase();
            const src = img.src.toLowerCase();
            
            // Check if image should be excluded
            const shouldExclude = excludeKeywords.some(keyword => 
              alt.includes(keyword) || title.includes(keyword) || src.includes(keyword)
            );
            
            // Additional checks for common non-food patterns
            const isTransparentIcon = src.includes('transparent') || 
                                    src.includes('icon') || 
                                    src.includes('logo') ||
                                    alt.includes('icon') ||
                                    alt.includes('logo');
            
            const isSmallImage = img.width < 150 || img.height < 150;
            
            const isSvgOrIcon = src.includes('.svg') || 
                              src.includes('icon') || 
                              src.includes('symbol') ||
                              alt.includes('svg') ||
                              alt.includes('icon');
            
            // Check for Wikimedia Commons specific patterns
            const isCommonsLogo = src.includes('commons-logo') || 
                                 src.includes('wikimedia-logo') ||
                                 src.includes('wikibooks-logo') ||
                                 alt.includes('commons') ||
                                 alt.includes('wikimedia');
            
            // Check for very small or very large images (likely not food)
            const isUnusualSize = img.width < 100 || img.height < 100 || 
                                 img.width > 2000 || img.height > 2000;
            
            // Check for aspect ratio (icons are often square or very wide/tall)
            const aspectRatio = img.width / img.height;
            const isUnusualAspectRatio = aspectRatio < 0.5 || aspectRatio > 3;
            
            // Check for common non-food file patterns
            const isNonFoodFile = src.includes('logo') || 
                                 src.includes('icon') || 
                                 src.includes('symbol') ||
                                 src.includes('badge') ||
                                 src.includes('emblem') ||
                                 src.includes('banner') ||
                                 src.includes('header') ||
                                 src.includes('footer');
            
            const isFiltered = shouldExclude || isTransparentIcon || isSmallImage || 
                              isSvgOrIcon || isCommonsLogo || isUnusualSize || 
                              isUnusualAspectRatio || isNonFoodFile;
            
            results.push({
              url: highResUrl,
              alt: img.alt || '',
              title: img.title || '',
              width: img.width,
              height: img.height,
              aspectRatio: (img.width / img.height).toFixed(2),
              isFiltered: isFiltered,
              reasons: {
                shouldExclude,
                isTransparentIcon,
                isSmallImage,
                isSvgOrIcon,
                isCommonsLogo,
                isUnusualSize,
                isUnusualAspectRatio,
                isNonFoodFile
              }
            });
          }
        });
        
        return results;
      });

      // Display results
      const foodImages = images.filter(img => !img.isFiltered);
      const filteredImages = images.filter(img => img.isFiltered);

      console.log(`📊 Total images found: ${images.length}`);
      console.log(`✅ Food images kept: ${foodImages.length}`);
      console.log(`🚫 Images filtered out: ${filteredImages.length}`);

      if (foodImages.length > 0) {
        console.log('\n✅ KEPT IMAGES:');
        foodImages.forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.alt || 'unnamed'} (${img.width}x${img.height}, ratio: ${img.aspectRatio})`);
        });
      }

      if (filteredImages.length > 0) {
        console.log('\n🚫 FILTERED OUT:');
        filteredImages.forEach((img, index) => {
          const reasons = Object.entries(img.reasons)
            .filter(([key, value]) => value)
            .map(([key]) => key)
            .join(', ');
          console.log(`  ${index + 1}. ${img.alt || 'unnamed'} (${img.width}x${img.height}) - ${reasons}`);
        });
      }

      return { foodImages, filteredImages };

    } catch (error) {
      console.error(`❌ Error testing ${foodName}:`, error.message);
      return { foodImages: [], filteredImages: [] };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const tester = new FilteringTester();
  
  try {
    await tester.init();
    
    // Test with some common foods that might have icons
    const testFoods = [
      'Bruschetta',
      'Margherita Pizza',
      'Caesar Salad',
      'Spaghetti Carbonara'
    ];
    
    for (const food of testFoods) {
      await tester.testFoodPage(food);
      await tester.page.waitForTimeout(2000); // Wait between tests
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = FilteringTester;



