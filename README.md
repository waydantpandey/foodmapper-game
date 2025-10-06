# 🍽️ Food Guessing Game - Cloudinary Version

A modern, scalable version of the food guessing game using Cloudinary for image management and Supabase for the database.

## 🎯 What This Is

This is a **completely separate project** from your original food guessing game. It uses:
- **Cloudinary** for professional image storage and delivery
- **Supabase** for the database
- **Next.js** for the web application
- **Vercel** for easy deployment

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd food-guessing-game-cloudinary
npm install
```

### 2. Set Up Environment Variables
```bash
cp env.example .env.local
# Fill in your credentials in .env.local
```

### 3. Set Up Accounts

#### Supabase (Database)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Run the SQL from `database/schema.sql` in the SQL editor
4. Get your project URL and API keys

#### Cloudinary (Images)
1. Go to [cloudinary.com](https://cloudinary.com)
2. Create a free account
3. Get your cloud name, API key, and API secret

#### Google Maps (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps JavaScript API
3. Create an API key

### 4. Migrate Your Data
```bash
npm run migrate
```

### 5. Start Development
```bash
npm run dev
```

## 📁 Project Structure

```
food-guessing-game-cloudinary/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── admin/         # Admin panel
│   │   └── page.tsx       # Main game page
│   ├── components/
│   │   └── FoodGuessingGame.tsx
│   └── lib/
│       ├── database.ts    # Supabase integration
│       └── cloudinary.ts  # Cloudinary integration
├── database/
│   └── schema.sql         # Database schema
├── scripts/
│   └── migrate-data.ts    # Data migration script
└── public/                # Static assets
```

## 🎮 Features

### For Players
- **Fast Loading**: Images served from Cloudinary CDN
- **Responsive Design**: Works on all devices
- **Real-time Updates**: New dishes appear instantly
- **Professional UI**: Modern, clean interface

### For Admins
- **Easy Management**: Web-based admin panel at `/admin`
- **Image Upload**: Drag-and-drop image upload to Cloudinary
- **Bulk Operations**: Manage multiple dishes at once
- **Analytics**: Track game statistics

## 🛠️ Admin Panel

Access the admin panel at `/admin` to:
- Add new dishes
- Upload images to Cloudinary
- Edit dish details
- Activate/deactivate dishes
- View statistics

## 🚀 Deployment

### Deploy to Vercel
1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## 📊 Database Schema

The database includes:
- **Countries**: Country information
- **Cities**: City coordinates and details
- **Dishes**: Food information and metadata
- **Dish Images**: Cloudinary image references
- **Game Sessions**: Player analytics
- **Guesses**: Individual guess tracking

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dishes` | Get dishes (with filters) |
| POST | `/api/dishes` | Create new dish |
| PUT | `/api/dishes/[id]` | Update dish |
| DELETE | `/api/dishes/[id]` | Delete dish |
| POST | `/api/upload` | Upload images to Cloudinary |

## 💰 Costs

### Free Tiers
- **Supabase**: 50,000 monthly active users
- **Cloudinary**: 25GB storage, 25GB bandwidth
- **Vercel**: 100GB bandwidth

### Paid Tiers (when you need them)
- **Cloudinary**: ~$0.10/GB/month for additional storage
- **Supabase**: $25/month for Pro plan
- **Vercel**: $20/month for Pro plan

## 🔄 Migration from Original Project

This project is designed to work alongside your original Google Drive version:

1. **Keep Original**: Your original project with Google Drive continues to work
2. **New Version**: This Cloudinary version is completely separate
3. **Data Migration**: Use the migration script to copy your data
4. **Image Upload**: Manually upload images to Cloudinary using the admin panel

## 🎯 Benefits Over Original

| Feature | Original (Google Drive) | Cloudinary Version |
|---------|------------------------|-------------------|
| **Image Speed** | Variable | Global CDN (very fast) |
| **Image Optimization** | None | Automatic (resize, compress) |
| **Database** | Static JSON | Professional PostgreSQL |
| **Admin Panel** | Manual files | Web-based management |
| **Deployment** | Complex | One-click Vercel |
| **Scalability** | Limited | Handles thousands of users |
| **Analytics** | None | Built-in tracking |

## 🆘 Troubleshooting

### Common Issues

1. **Images not loading**
   - Check Cloudinary credentials
   - Verify image URLs in database

2. **Database connection errors**
   - Check Supabase credentials
   - Ensure database schema is created

3. **Upload failures**
   - Check Cloudinary API limits
   - Verify file formats and sizes

## 📈 Next Steps

Once deployed, you can:
1. **Add more dishes** using the admin panel
2. **Upload images** to Cloudinary
3. **Monitor analytics** in the admin dashboard
4. **Scale up** as your user base grows

## 🤝 Support

If you need help:
1. Check the console logs for errors
2. Verify all environment variables are set
3. Ensure your accounts are properly configured
4. Check the admin panel for data issues

## 🎉 Conclusion

This Cloudinary version gives you:
- ✅ **Professional image delivery**
- ✅ **Easy content management**
- ✅ **Scalable architecture**
- ✅ **Simple deployment**
- ✅ **Future-proof technology**

Perfect for when you're ready to take your food guessing game to the next level! 🚀
