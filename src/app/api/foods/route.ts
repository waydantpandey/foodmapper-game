import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔄 Loading foods data...');
    
    // Return sample data directly for now to get the game working
    const sampleData = [
      {
        id: 'pizza-1',
        name: 'Pizza',
        description: 'Traditional Italian flatbread with toppings',
        fact: 'Pizza was invented in Naples, Italy in the 18th century. The original Margherita pizza was created in 1889 by pizzaiolo Raffaele Esposito for Queen Margherita of Savoy, featuring tomatoes, mozzarella, and basil to represent the colors of the Italian flag.',
        lat: 40.8518,
        lng: 14.2681,
        location: 'Italy',
        city: 'Naples',
        country: 'Italy',
        images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800']
      },
      {
        id: 'sushi-1',
        name: 'Sushi',
        description: 'Japanese dish with vinegared rice and seafood',
        fact: 'Sushi originated in Southeast Asia as a method of preserving fish using fermented rice. The modern form we know today developed in Edo (now Tokyo) during the 19th century, where fresh fish was served over vinegared rice instead of fermented rice.',
        lat: 35.6762,
        lng: 139.6503,
        location: 'Japan',
        city: 'Tokyo',
        country: 'Japan',
        images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800']
      },
      {
        id: 'tacos-1',
        name: 'Tacos',
        description: 'Mexican dish with tortillas and various fillings',
        fact: 'Tacos originated in Mexico and are now popular worldwide. The word "taco" comes from the Nahuatl word "tlahco" meaning "half" or "in the middle." Traditional tacos were made with soft corn tortillas and filled with various ingredients, becoming a staple of Mexican cuisine for centuries.',
        lat: 19.4326,
        lng: -99.1332,
        location: 'Mexico',
        city: 'Mexico City',
        country: 'Mexico',
        images: ['https://images.unsplash.com/photo-1565299585323-38174c4a4a0a?w=800']
      },
      {
        id: 'pasta-1',
        name: 'Pasta',
        description: 'Italian noodles with various sauces',
        fact: 'Pasta has been a staple of Italian cuisine for centuries. While often associated with Italy, pasta likely originated in China and was brought to Italy by Marco Polo in the 13th century. Italy perfected the art of pasta-making, creating over 300 different shapes and varieties.',
        lat: 41.9028,
        lng: 12.4964,
        location: 'Italy',
        city: 'Rome',
        country: 'Italy',
        images: ['https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800']
      },
      {
        id: 'curry-1',
        name: 'Curry',
        description: 'Spiced dish popular in South Asian cuisine',
        fact: 'Curry originated in the Indian subcontinent and spread globally. The word "curry" comes from the Tamil word "kari" meaning "sauce." British colonizers popularized the term, but each region of India has its own unique curry traditions, with over 2000 different curry recipes across the subcontinent.',
        lat: 28.6139,
        lng: 77.2090,
        location: 'India',
        city: 'New Delhi',
        country: 'India',
        images: ['https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800']
      }
    ];
    
    console.log(`✅ Returning ${sampleData.length} sample dishes - Updated at ${new Date().toISOString()}`);
    
    const response = NextResponse.json(sampleData);
    
    // Add caching headers for better performance
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300'); // 5 minutes cache
    response.headers.set('CDN-Cache-Control', 'public, max-age=300');
    
    return response;
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}// Force deployment Tue Oct  7 01:38:05 IST 2025
