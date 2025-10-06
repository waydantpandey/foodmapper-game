#!/usr/bin/env node
/**
 * Quick setup script for the food guessing game Cloudinary version
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🍽️ Food Guessing Game - Cloudinary Version Setup');
console.log('================================================\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  const envExample = fs.readFileSync(path.join(process.cwd(), 'env.example'), 'utf8');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ Created .env.local file');
  console.log('⚠️  Please fill in your Supabase and Cloudinary credentials in .env.local\n');
} else {
  console.log('✅ .env.local file already exists\n');
}

// Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed\n');
}

console.log('🚀 Setup complete! Next steps:');
console.log('1. Fill in your credentials in .env.local');
console.log('2. Set up your Supabase database (see README.md)');
console.log('3. Set up your Cloudinary account');
console.log('4. Run: npm run migrate');
console.log('5. Run: npm run dev');
console.log('6. Visit /admin to manage your dishes');
console.log('\n📖 For detailed instructions, see README.md');
console.log('\n🎯 This is a separate project from your original Google Drive version!');
