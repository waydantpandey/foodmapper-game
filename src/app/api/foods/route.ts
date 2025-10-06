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

    // Cloudinary images mapping
    const cloudinaryImages: { [key: string]: string[] } = {
      'Asado': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348514/food-guessing-game/argentina/asado/asado_1.jpg.jpg'],
      'Empanadas': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348491/food-guessing-game/argentina/empanadas/empanadas_1.jpg.jpg'],
      'Morcilla Blood Sausage': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348465/food-guessing-game/argentina/morcilla-blood-sausage/morcilla_blood_sausage_1.jpg.jpg'],
      'Lamington': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348880/food-guessing-game/australia/lamington/lamington_1.jpg.jpg'],
      'Meat Pie': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348900/food-guessing-game/australia/meat-pie/meat_pie_1.jpg.jpg'],
      'Witchetty Grub': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348859/food-guessing-game/australia/witchetty-grub/witchetty_grub_1.jpg.jpg'],
      'Buchada De Bode': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349004/food-guessing-game/brazil/buchada-de-bode/buchada_de_bode_1.jpg.jpg'],
      'Feijoada': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349065/food-guessing-game/brazil/feijoada/feijoada_1.jpg.jpg'],
      'P O De Queijo': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349041/food-guessing-game/brazil/p%C3%A3o-de-queijo/p_o_de_queijo_1.jpg.jpg'],
      'Poutine': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349162/food-guessing-game/canada/poutine/poutine_1.jpg.jpg'],
      'Chow Mein': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759350038/food-guessing-game/china/chow-mein/chow_mein_1.jpg.jpg'],
      'Dim Sum': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759350129/food-guessing-game/china/dim-sum/dim_sum_1.jpg.jpg'],
      'Fortune Cookies': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759350011/food-guessing-game/china/fortune-cookies/fortune_cookies_1.jpg.jpg'],
      'Mooncakes': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759350062/food-guessing-game/china/mooncakes/mooncakes_1.jpg.jpg']
    };

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
      images: cloudinaryImages[dish.name] || []
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}