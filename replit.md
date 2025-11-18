# Odometer Tracker Discord Bot - Project Documentation

## Overview
This is a Discord bot that records odometer readings from drivers using a simple command. Drivers post `!odo 149684` (with optional photo) and the bot automatically records the data to Google Sheets, calculating the distance traveled between readings.

## Current State
- **Status**: Fully functional with manual command entry
- **Last Updated**: November 18, 2025

## Architecture

### Components
1. **Discord Bot (index.js)** - Main application file
   - Listens for `!odo` command with odometer reading
   - Uses discord.js v14 with Gateway intents
   - Requires Discord Bot Token (not OAuth user token)

2. **OCR Engine (Optional)** - Tesseract.js
   - Extracts metadata from attached photos (date, time, location)
   - Only reads text overlays, not seven-segment displays
   - Falls back to current timestamp if no photo attached

3. **Google Sheets Integration** - googleapis
   - Uses Replit Google Sheets connector for authentication
   - Auto-creates headers on first run
   - Calculates difference between consecutive readings **on the same date only**
   - Records driver information from Discord username

### Data Flow
1. Driver posts `!odo 149684` command (with optional photo attachment)
2. Bot validates command format
3. Reacts with ⏳ (processing)
4. If photo attached: Extracts date/time/location from text overlay via OCR
5. If no photo: Uses current timestamp
6. Writes to Google Sheets with auto-calculation of distance traveled (only between readings on the same date)
7. Reacts with ✅ and sends confirmation message

## Dependencies
- discord.js (^14.24.2) - Discord API client
- googleapis (^166.0.0) - Google Sheets API
- tesseract.js (^6.0.1) - OCR engine

## Environment Variables Required
- `DISCORD_BOT_TOKEN` - Discord bot token from Developer Portal
- `GOOGLE_SHEET_ID` - Spreadsheet ID from Google Sheets URL
- `DRIVER_CHANNEL_ID` - (Optional) Specific channel ID to monitor

## Usage Instructions

### For Drivers
Post this command in the Discord channel:
```
!odo 149684
```
- Replace `149684` with your actual odometer reading
- Optionally attach a photo of your odometer
- The bot will automatically record the data and calculate distance traveled

### Examples
- With photo: `!odo 149684` + attach image
- Without photo: `!odo 149684` (bot uses current time/date)

## Recent Changes
- November 18, 2025: Updated difference calculation logic
  - Difference now only calculated between readings on the same date
  - First reading of each day shows "N/A" for difference
  - Subsequent readings on the same day show distance from previous reading that day
  
- November 18, 2025: Switched to manual command entry system
  - Changed from automatic OCR to `!odo` command format  
  - OCR now only extracts photo metadata (date, time, location)
  - Drivers manually enter odometer reading for 100% accuracy
  - Maintains automatic distance calculation in Google Sheets
  - Reason: Seven-segment LED displays not reliably readable by OCR

- November 18, 2025: Initial implementation
  - Created Discord bot with message monitoring
  - Integrated Tesseract.js for OCR
  - Set up Google Sheets integration with Replit connector
  - Added auto-calculation for odometer differences
  - Switched from Discord OAuth to Bot Token authentication

## User Preferences
- Not yet established

## Notes
- The bot requires "Message Content Intent" to be enabled in Discord Developer Portal
- Google Sheets connector is already set up via Replit integration
- Bot processes all image attachments in monitored channels
- OCR accuracy depends on image quality and lighting
