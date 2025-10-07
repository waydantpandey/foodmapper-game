import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    console.log('🔄 Loading foods data...');

    // Load the generated food database
    const dataPath = path.join(process.cwd(), 'data', 'foods-database.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Food database not found, returning empty array');
      return NextResponse.json([]);
    }

    const foodsData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`✅ Returning ${foodsData.length} dishes from database`);

    const response = NextResponse.json(foodsData);

    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes cache
    response.headers.set('CDN-Cache-Control', 'public, max-age=300');

    return response;
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}
