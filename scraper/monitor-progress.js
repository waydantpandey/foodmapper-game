#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');

console.log('🔍 Monitoring scraper progress...');
console.log('Press Ctrl+C to stop monitoring\n');

let lastImageCount = 0;
let updateCount = 0;

function checkProgress() {
  // Check if scraper is still running
  exec('ps aux | grep "full-comprehensive-scraper" | grep -v grep', (error, stdout) => {
    if (stdout.trim()) {
      console.log('✅ Scraper is still running...');
      
      // Update API with new images
      exec('node update-game-api.js', (error, stdout, stderr) => {
        if (!error) {
          const lines = stdout.split('\n');
          const imageCountLine = lines.find(line => line.includes('Found') && line.includes('images'));
          if (imageCountLine) {
            const match = imageCountLine.match(/(\d+) images/);
            if (match) {
              const currentImageCount = parseInt(match[1]);
              if (currentImageCount > lastImageCount) {
                console.log(`📈 Progress: ${currentImageCount} images (+${currentImageCount - lastImageCount})`);
                lastImageCount = currentImageCount;
                updateCount++;
              }
            }
          }
        }
      });
      
      // Check again in 30 seconds
      setTimeout(checkProgress, 30000);
    } else {
      console.log('🏁 Scraper has finished!');
      
      // Final API update
      console.log('🔄 Running final API update...');
      exec('node update-game-api.js', (error, stdout, stderr) => {
        if (!error) {
          console.log(stdout);
          console.log(`\n🎉 Scraping complete! API updated ${updateCount + 1} times.`);
        } else {
          console.error('❌ Error in final update:', stderr);
        }
      });
    }
  });
}

// Start monitoring
checkProgress();




