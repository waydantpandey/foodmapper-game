# 🚀 Quick Setup Instructions

## For Testing the Game (Minimal Setup)

1. **Get a Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable "Maps JavaScript API"
   - Create credentials (API Key)
   - Copy the API key

2. **Add API Key to Environment:**
   ```bash
   # Create .env.local file
   echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here" > .env.local
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

4. **Test the game:**
   - Visit `http://localhost:3004/test`
   - The game should now work with the map!

## For Full Database Version (Complete Setup)

1. **Set up Supabase:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Run the SQL from `database/schema.sql`
   - Get your project URL and API keys

2. **Set up Cloudinary:**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Create a free account
   - Get your cloud name, API key, and API secret

3. **Update .env.local:**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run migration:**
   ```bash
   npm run migrate
   ```

5. **Access full version:**
   - Main game: `http://localhost:3004`
   - Admin panel: `http://localhost:3004/admin`
