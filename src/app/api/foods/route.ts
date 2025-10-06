import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Fetch dishes with their countries and cities
    const { data: dishes, error } = await supabase
      .from('dishes')
      .select(`
        id,
        name,
        description,
        fact,
        country_id,
        city_id,
        category_id,
        countries(name),
        cities(name, latitude, longitude)
      `);

    if (error) {
      console.error('Error fetching dishes:', error);
      return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 });
    }

    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ error: 'No dishes found' }, { status: 404 });
    }

    // Transform the data to match the expected format
    const transformedData = dishes.map((dish: any) => ({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      fact: dish.fact,
      lat: dish.cities?.latitude || 0,
      lng: dish.cities?.longitude || 0,
      location: dish.cities?.name || 'Unknown',
      city: dish.cities?.name || 'Unknown',
      country: dish.countries?.name || 'Unknown',
      images: [] // We'll add Cloudinary images later
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}