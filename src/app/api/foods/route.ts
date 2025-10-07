import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔄 Loading foods data...');
    
    // Return empty array - all food data has been deleted
    const emptyData: any[] = [];
    
    console.log(`✅ Returning ${emptyData.length} dishes - All food data deleted at ${new Date().toISOString()}`);
    
    const response = NextResponse.json(emptyData);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes cache
    response.headers.set('CDN-Cache-Control', 'public, max-age=300');
    
    return response;
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}
