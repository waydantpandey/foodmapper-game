#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupMigration() {
  console.log('🚀 Setting up migration from Google Sheets to Supabase + Cloudinary\n');
  
  console.log('You need to set up the following services:');
  console.log('1. Supabase database');
  console.log('2. Cloudinary for image storage\n');
  
  // Get Supabase details
  const supabaseUrl = await question('Enter your Supabase project URL: ');
  const supabaseKey = await question('Enter your Supabase service role key: ');
  
  // Get Cloudinary details
  const cloudinaryCloudName = await question('Enter your Cloudinary cloud name: ');
  const cloudinaryApiKey = await question('Enter your Cloudinary API key: ');
  const cloudinaryApiSecret = await question('Enter your Cloudinary API secret: ');
  
  // Create .env.local file
  const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=${cloudinaryCloudName}
CLOUDINARY_API_KEY=${cloudinaryApiKey}
CLOUDINARY_API_SECRET=${cloudinaryApiSecret}

# Google Maps (already configured)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDPjdkx3QNw43AcxHOOgLH7PfD9JDrFx2k
`;

  fs.writeFileSync('.env.local', envContent);
  console.log('\n✅ Created .env.local file');
  
  // Install dependencies
  console.log('\n📦 Installing dependencies...');
  const { execSync } = require('child_process');
  execSync('npm install csv-parser', { stdio: 'inherit' });
  
  console.log('\n🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Run the database schema: npm run db:setup');
  console.log('2. Run the migration: npm run migrate:sheets');
  
  rl.close();
}

setupMigration().catch(console.error);
