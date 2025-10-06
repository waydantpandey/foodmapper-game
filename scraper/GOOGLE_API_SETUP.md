# Google API Setup Guide

## 🚀 Quick Setup Steps

### Step 1: Go to Google Cloud Console
**Direct Link:** https://console.cloud.google.com/

### Step 2: Create or Select Project
- Click "Select a project" dropdown at the top
- Click "New Project" if you don't have one
- Name it something like "food-guessing-game"
- Click "Create"

### Step 3: Enable Required APIs
**Direct Links:**
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Click "Enable" on both APIs.

### Step 4: Create Service Account
**Direct Link:** https://console.cloud.google.com/iam-admin/serviceaccounts

1. Click "Create Service Account"
2. Name: `food-scraper`
3. Description: `Service account for food guessing game scraper`
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### Step 5: Create API Key
1. Click on your service account (`food-scraper@your-project.iam.gserviceaccount.com`)
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create"
6. **Download the JSON file**

### Step 6: Save Credentials
1. Rename the downloaded file to `credentials.json`
2. Move it to: `/Users/waydant/food-guessing-game-cloudinary/scraper/credentials.json`

### Step 7: Get Your Google Sheets ID
1. Open your Google Sheets document
2. Copy the ID from the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEETS_ID/edit`
3. Save this ID for later

### Step 8: Share Permissions

#### Share Google Sheets:
1. Open your Google Sheets document
2. Click "Share" button (top right)
3. Add the service account email: `food-scraper@your-project.iam.gserviceaccount.com`
4. Set permission to "Editor"
5. Click "Send"

#### Share Google Drive Folder:
1. Go to [Google Drive](https://drive.google.com)
2. Create or find the "food-guessing-game" folder
3. Right-click → "Share"
4. Add the service account email: `food-scraper@your-project.iam.gserviceaccount.com`
5. Set permission to "Editor"
6. Click "Send"

### Step 9: Set Environment Variables (Optional)
Create or update `.env.local` in your project root:

```bash
# Add these to your .env.local file
GOOGLE_SHEETS_ID=your_sheets_id_here
CLOUDINARY_CLOUD_NAME=dwav84wrk
CLOUDINARY_API_KEY=589773693657812
CLOUDINARY_API_SECRET=V2qOKwLBhCEhjaIm8ex7AgwEdhY
```

### Step 10: Test the Setup
```bash
cd /Users/waydant/food-guessing-game-cloudinary/scraper
node comprehensive-test-scraper.js
```

## 🔍 Troubleshooting

### If you get "credentials.json not found":
- Make sure the file is in the correct location
- Check the filename is exactly `credentials.json`

### If you get "Permission denied":
- Make sure you shared both Google Sheets and Google Drive folder
- Check the service account email is correct

### If you get "API not enabled":
- Go back to Google Cloud Console
- Make sure both Drive API and Sheets API are enabled

## 📞 Need Help?

The service account email will look like:
`food-scraper@your-project-name.iam.gserviceaccount.com`

Make sure to use this exact email when sharing permissions!



