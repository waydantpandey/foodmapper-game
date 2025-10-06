// Database configuration and utilities for Cloudinary version
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types for our database
export interface Country {
  id: string;
  name: string;
  code: string;
  description?: string;
  flag_url?: string;
  created_at: string;
  updated_at: string;
}

export interface City {
  id: string;
  name: string;
  country_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  fact: string;
  country_id: string;
  city_id?: string;
  category_id?: string;
  difficulty_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  country?: Country;
  city?: City;
  category?: FoodCategory;
  images?: DishImage[];
}

export interface DishImage {
  id: string;
  dish_id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  image_order: number;
  alt_text?: string;
  width?: number;
  height?: number;
  format?: string;
  created_at: string;
}

export interface GameSession {
  id: string;
  session_id: string;
  total_rounds: number;
  correct_guesses: number;
  total_score: number;
  started_at: string;
  ended_at?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface Guess {
  id: string;
  session_id: string;
  dish_id: string;
  guessed_latitude?: number;
  guessed_longitude?: number;
  guessed_country?: string;
  distance_km?: number;
  score: number;
  is_correct: boolean;
  created_at: string;
  // Relations
  dish?: Dish;
}

// Database service class
export class DatabaseService {
  // Get all active dishes with their relations
  async getActiveDishes(): Promise<Dish[]> {
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get dishes by country
  async getDishesByCountry(countryId: string): Promise<Dish[]> {
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .eq('country_id', countryId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get random dishes for game
  async getRandomDishes(count: number = 5, difficulty?: number): Promise<Dish[]> {
    let query = supabase
      .from('dishes')
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .eq('is_active', true);

    if (difficulty) {
      query = query.eq('difficulty_level', difficulty);
    }

    const { data, error } = await query
      .order('random()')
      .limit(count);

    if (error) throw error;
    return data || [];
  }

  // Get all countries
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get all categories
  async getCategories(): Promise<FoodCategory[]> {
    const { data, error } = await supabase
      .from('food_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get dish by ID
  async getDishById(id: string): Promise<Dish | null> {
    const { data, error } = await supabase
      .from('dishes')
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Create a new game session
  async createGameSession(sessionId: string, userAgent?: string, ipAddress?: string): Promise<GameSession> {
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        session_id: sessionId,
        user_agent: userAgent,
        ip_address: ipAddress
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Record a guess
  async recordGuess(
    sessionId: string,
    dishId: string,
    guessedLat?: number,
    guessedLng?: number,
    guessedCountry?: string,
    distanceKm?: number,
    score: number = 0,
    isCorrect: boolean = false
  ): Promise<Guess> {
    const { data, error } = await supabase
      .from('guesses')
      .insert({
        session_id: sessionId,
        dish_id: dishId,
        guessed_latitude: guessedLat,
        guessed_longitude: guessedLng,
        guessed_country: guessedCountry,
        distance_km: distanceKm,
        score,
        is_correct: isCorrect
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update game session
  async updateGameSession(
    sessionId: string,
    updates: Partial<Pick<GameSession, 'total_rounds' | 'correct_guesses' | 'total_score' | 'ended_at'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('session_id', sessionId);

    if (error) throw error;
  }

  // Get game statistics
  async getGameStatistics(): Promise<{
    totalDishes: number;
    totalCountries: number;
    totalSessions: number;
    averageScore: number;
  }> {
    const [dishesResult, countriesResult, sessionsResult, scoresResult] = await Promise.all([
      supabase.from('dishes').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('countries').select('id', { count: 'exact' }),
      supabase.from('game_sessions').select('id', { count: 'exact' }),
      supabase.from('game_sessions').select('total_score').not('total_score', 'is', null)
    ]);

    const averageScore = scoresResult.data?.length 
      ? scoresResult.data.reduce((sum, session) => sum + session.total_score, 0) / scoresResult.data.length
      : 0;

    return {
      totalDishes: dishesResult.count || 0,
      totalCountries: countriesResult.count || 0,
      totalSessions: sessionsResult.count || 0,
      averageScore: Math.round(averageScore)
    };
  }

  // Admin functions
  async addDish(dish: Omit<Dish, 'id' | 'created_at' | 'updated_at'>): Promise<Dish> {
    const { data, error } = await supabase
      .from('dishes')
      .insert(dish)
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async addDishImages(dishId: string, images: Omit<DishImage, 'id' | 'dish_id' | 'created_at'>[]): Promise<DishImage[]> {
    const imagesWithDishId = images.map(img => ({ ...img, dish_id: dishId }));
    
    const { data, error } = await supabase
      .from('dish_images')
      .insert(imagesWithDishId)
      .select();

    if (error) throw error;
    return data || [];
  }

  async updateDish(id: string, updates: Partial<Dish>): Promise<Dish> {
    const { data, error } = await supabase
      .from('dishes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        country:countries(*),
        city:cities(*),
        category:food_categories(*),
        images:dish_images(*)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDish(id: string): Promise<void> {
    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

export const db = new DatabaseService();
