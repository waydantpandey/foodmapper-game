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

    // Cloudinary images mapping - Add fallback images for all dishes
    const cloudinaryImages: { [key: string]: string[] } = {
      'Asado': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348514/food-guessing-game/argentina/asado/asado_1.jpg.jpg'],
      'Empanadas': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348491/food-guessing-game/argentina/empanadas/empanadas_1.jpg.jpg'],
      'Morcilla Blood Sausage': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348465/food-guessing-game/argentina/morcilla-blood-sausage/morcilla_blood_sausage_1.jpg.jpg'],
      'Lamington': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348880/food-guessing-game/australia/lamington/lamington_1.jpg.jpg'],
      'Meat Pie': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348900/food-guessing-game/australia/meat-pie/meat_pie_1.jpg.jpg'],
      'Witchetty Grub': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348859/food-guessing-game/australia/witchetty-grub/witchetty_grub_1.jpg.jpg'],
      'Poutine': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349162/food-guessing-game/canada/poutine/poutine_1.jpg.jpg'],
      'Gado-gado': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759347652/food-guessing-game/indonesia/gado-gado/gado_gado_1.jpg.jpg'],
      'Hormigas Culonas': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348312/food-guessing-game/colombia/hormigas-culonas/hormigas_culonas_1.jpg.jpg'],
      'Ajiaco': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759348335/food-guessing-game/colombia/ajiaco/ajiaco_1.jpg.jpg'],
      'Jiggs Dinner': ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800'],
      'Butter Tart': ['https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800'],
      'Bánh Mì': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349358/food-guessing-game/vietnam/b%C3%A1nh-m%C3%AC/b_nh_m__1.jpg.jpg'],
      'Phở': ['https://res.cloudinary.com/dwav84wrk/image/upload/v1759349381/food-guessing-game/vietnam/ph%E1%BB%9F/ph__1.jpg.jpg']
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
      images: cloudinaryImages[dish.name] || ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800']
    }));
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}