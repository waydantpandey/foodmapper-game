# Google Sheets & Drive Setup Instructions

## Step 1: Download Service Account Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Find the service account: `food-scraper@foodmapper-472618.iam.gserviceaccount.com`
4. Click on the service account
5. Go to the **Keys** tab
6. Click **Add Key** > **Create new key**
7. Choose **JSON** format
8. Download the key file
9. Rename it to `service-account-key.json`
10. Place it in the root directory of this project (`/Users/waydant/foodmapper.io/`)

## Step 2: Get Google Sheet ID

1. Open your Google Sheet: "common_foods_35_countries"
2. Copy the URL from the address bar
3. The Sheet ID is the long string between `/d/` and `/edit`
4. Example: `https://docs.google.com/spreadsheets/d/1ABC123...XYZ/edit`
5. The ID would be: `1ABC123...XYZ`

## Step 3: Get Google Drive Folder ID

1. Open your Google Drive folder: "food data 1"
2. Copy the URL from the address bar
3. The Folder ID is the long string after `/folders/`
4. Example: `https://drive.google.com/drive/folders/1DEF456...UVW`
5. The ID would be: `1DEF456...UVW`

## Step 4: Update Scripts

Once you have the IDs, update the scripts with the correct values:

- In `scripts/read-google-sheet.js`: Update `GOOGLE_SHEET_ID`
- In `scripts/read-google-sheet.js`: Update `GOOGLE_DRIVE_FOLDER_ID`

## Step 5: Run the Scripts

```bash
# First, find your resources
node scripts/find-google-resources.js

# Then, read the sheet data
node scripts/read-google-sheet.js
```

## Required Permissions

Make sure the service account has access to:
- ✅ Google Sheet: "common_foods_35_countries" (Viewer or Editor)
- ✅ Google Drive folder: "food data 1" (Viewer or Editor)
