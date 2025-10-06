import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// GET /api/dishes - Get all active dishes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');
    const difficulty = searchParams.get('difficulty');
    const random = searchParams.get('random');
    const count = parseInt(searchParams.get('count') || '10');

    let dishes;

    if (random === 'true') {
      dishes = await db.getRandomDishes(
        count,
        difficulty ? parseInt(difficulty) : undefined
      );
    } else if (country) {
      // Get dishes by country name
      const countries = await db.getCountries();
      const countryData = countries.find(c => 
        c.name.toLowerCase() === country.toLowerCase()
      );
      
      if (!countryData) {
        return NextResponse.json(
          { error: 'Country not found' },
          { status: 404 }
        );
      }

      dishes = await db.getDishesByCountry(countryData.id);
    } else {
      dishes = await db.getActiveDishes();
    }

    // Transform dishes to match the expected format
    const transformedDishes = dishes.map(dish => ({
      id: dish.id,
      name: dish.name,
      images: dish.images?.map(img => img.cloudinary_url) || [],
      lat: dish.city?.latitude || 0,
      lng: dish.city?.longitude || 0,
      location: dish.country?.name || '',
      city: dish.city?.name || '',
      fact: dish.fact,
      description: dish.description,
      difficulty_level: dish.difficulty_level,
    }));

    return NextResponse.json({ success: true, data: transformedDishes });
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dishes' },
      { status: 500 }
    );
  }
}

// POST /api/dishes - Create a new dish (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'description', 'fact', 'country_id'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const dish = await db.addDish({
      name: body.name,
      description: body.description,
      fact: body.fact,
      country_id: body.country_id,
      city_id: body.city_id,
      category_id: body.category_id,
      difficulty_level: body.difficulty_level || 1,
      is_active: body.is_active !== false
    });

    return NextResponse.json({ success: true, data: dish });
  } catch (error) {
    console.error('Error creating dish:', error);
    return NextResponse.json(
      { error: 'Failed to create dish' },
      { status: 500 }
    );
  }
}
