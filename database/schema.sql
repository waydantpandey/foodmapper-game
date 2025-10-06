-- Food Guessing Game Database Schema (Cloudinary Version)
-- This schema is designed for PostgreSQL/Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries table
CREATE TABLE countries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO country code
    description TEXT,
    flag_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cities table
CREATE TABLE cities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, country_id)
);

-- Food categories table
CREATE TABLE food_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dishes table
CREATE TABLE dishes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    fact TEXT NOT NULL,
    country_id UUID REFERENCES countries(id) ON DELETE CASCADE,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, country_id)
);

-- Images table (Cloudinary integration)
CREATE TABLE dish_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    cloudinary_public_id VARCHAR(255) NOT NULL,
    cloudinary_url TEXT NOT NULL,
    image_order INTEGER NOT NULL CHECK (image_order BETWEEN 1 AND 3),
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    format VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dish_id, image_order)
);

-- Game sessions table (for analytics)
CREATE TABLE game_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    total_rounds INTEGER DEFAULT 0,
    correct_guesses INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip_address INET
);

-- Individual guesses table
CREATE TABLE guesses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    guessed_latitude DECIMAL(10, 8),
    guessed_longitude DECIMAL(11, 8),
    guessed_country VARCHAR(100),
    distance_km DECIMAL(10, 2),
    score INTEGER DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dishes_country ON dishes(country_id);
CREATE INDEX idx_dishes_active ON dishes(is_active);
CREATE INDEX idx_dishes_difficulty ON dishes(difficulty_level);
CREATE INDEX idx_dish_images_dish ON dish_images(dish_id);
CREATE INDEX idx_cities_country ON cities(country_id);
CREATE INDEX idx_guesses_session ON guesses(session_id);
CREATE INDEX idx_guesses_dish ON guesses(dish_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON cities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dishes_updated_at BEFORE UPDATE ON dishes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial food categories
INSERT INTO food_categories (name, description) VALUES
('Appetizer', 'Small dishes served before the main course'),
('Main Course', 'Primary dish of a meal'),
('Dessert', 'Sweet course served at the end of a meal'),
('Street Food', 'Food sold by vendors in public places'),
('Traditional', 'Dishes with deep cultural and historical roots'),
('Fusion', 'Dishes combining elements from different cuisines'),
('Soup', 'Liquid food made by boiling ingredients'),
('Salad', 'Dish consisting of mixed ingredients'),
('Beverage', 'Drinks and liquid refreshments'),
('Snack', 'Small portions of food eaten between meals');

-- Insert some sample countries
INSERT INTO countries (name, code, description) VALUES
('Japan', 'JPN', 'Island nation known for sushi, ramen, and traditional cuisine'),
('Italy', 'ITA', 'Mediterranean country famous for pasta, pizza, and regional specialties'),
('India', 'IND', 'Diverse subcontinent with rich culinary traditions'),
('Mexico', 'MEX', 'North American country with vibrant street food culture'),
('France', 'FRA', 'European nation renowned for haute cuisine and pastries'),
('Thailand', 'THA', 'Southeast Asian country known for spicy and aromatic dishes'),
('China', 'CHN', 'Ancient civilization with diverse regional cuisines'),
('Brazil', 'BRA', 'South American country with fusion of indigenous and immigrant cuisines'),
('Spain', 'ESP', 'Iberian Peninsula nation known for tapas and paella'),
('United States', 'USA', 'North American country with diverse regional cuisines');
