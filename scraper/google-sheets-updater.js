#!/usr/bin/env node

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsUpdater {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || 'your-spreadsheet-id';
  }

  async init() {
    try {
      // Load credentials
      const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8'));
      
      // Initialize Google Sheets API
      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets API initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  async getSheetData() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:Z' // Adjust range as needed
      });
      
      return response.data.values || [];
    } catch (error) {
      console.error('❌ Failed to get sheet data:', error.message);
      throw error;
    }
  }

  async findDishRow(dishName, countryName) {
    try {
      const data = await this.getSheetData();
      
      // Look for the dish in the data
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length >= 2 && 
            row[0] && row[0].toLowerCase().includes(dishName.toLowerCase()) &&
            row[1] && row[1].toLowerCase().includes(countryName.toLowerCase())) {
          return i + 1; // Google Sheets is 1-indexed
        }
      }
      
      return null; // Dish not found
    } catch (error) {
      console.error('❌ Failed to find dish row:', error.message);
      return null;
    }
  }

  async addImageUrlColumns(requiredColumns) {
    try {
      // Get current sheet info
      const sheetInfo = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheet = sheetInfo.data.sheets[0];
      const currentColumnCount = sheet.properties.gridProperties.columnCount;
      
      if (requiredColumns > currentColumnCount) {
        // Add new columns
        const requests = [{
          insertDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'COLUMNS',
              startIndex: currentColumnCount,
              endIndex: currentColumnCount + (requiredColumns - currentColumnCount)
            },
            inheritFromBefore: false
          }
        }];
        
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          resource: { requests }
        });
        
        console.log(`✅ Added ${requiredColumns - currentColumnCount} new columns`);
      }
    } catch (error) {
      console.error('❌ Failed to add columns:', error.message);
    }
  }

  async updateDishImages(dishName, countryName, imageUrls) {
    try {
      console.log(`📊 Updating Google Sheets for ${dishName} (${countryName})...`);
      
      // Find the dish row
      const rowIndex = await this.findDishRow(dishName, countryName);
      
      if (!rowIndex) {
        console.log(`⚠️  Dish ${dishName} not found in Google Sheets`);
        return false;
      }
      
      // Get current data to see how many image columns exist
      const data = await this.getSheetData();
      const currentRow = data[rowIndex - 1] || [];
      
      // Find the first empty image column (assuming they start from column 3)
      let firstImageColumn = 2; // 0-indexed, so column C
      while (currentRow[firstImageColumn] && currentRow[firstImageColumn].trim() !== '') {
        firstImageColumn++;
      }
      
      // Ensure we have enough columns
      const requiredColumns = firstImageColumn + imageUrls.length;
      await this.addImageUrlColumns(requiredColumns);
      
      // Prepare the update data
      const updateData = [];
      for (let i = 0; i < imageUrls.length; i++) {
        updateData.push([imageUrls[i]]);
      }
      
      // Update the cells
      const range = `Sheet1!${String.fromCharCode(65 + firstImageColumn)}${rowIndex}:${String.fromCharCode(65 + firstImageColumn + imageUrls.length - 1)}${rowIndex}`;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: updateData
        }
      });
      
      console.log(`✅ Updated ${imageUrls.length} image URLs for ${dishName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update Google Sheets for ${dishName}:`, error.message);
      return false;
    }
  }

  async addNewDish(dishName, countryName, imageUrls) {
    try {
      console.log(`📊 Adding new dish to Google Sheets: ${dishName} (${countryName})...`);
      
      // Get current data
      const data = await this.getSheetData();
      
      // Prepare new row data
      const newRow = [
        dishName,
        countryName,
        ...imageUrls,
        '', // Add empty cells for other columns
        '', // Add more empty cells as needed
        new Date().toISOString() // Add timestamp
      ];
      
      // Ensure we have enough columns
      await this.addImageUrlColumns(newRow.length);
      
      // Add the new row
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:Z',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [newRow]
        }
      });
      
      console.log(`✅ Added new dish ${dishName} to Google Sheets`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to add new dish ${dishName}:`, error.message);
      return false;
    }
  }

  async updateOrAddDish(dishName, countryName, imageUrls) {
    try {
      const rowIndex = await this.findDishRow(dishName, countryName);
      
      if (rowIndex) {
        return await this.updateDishImages(dishName, countryName, imageUrls);
      } else {
        return await this.addNewDish(dishName, countryName, imageUrls);
      }
    } catch (error) {
      console.error(`❌ Failed to update/add dish ${dishName}:`, error.message);
      return false;
    }
  }
}

module.exports = GoogleSheetsUpdater;