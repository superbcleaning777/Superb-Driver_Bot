# Odometer Tracker Discord Bot

This Discord bot automatically captures odometer information from photos posted in a Driver Group channel and records the data to Google Sheets.

## Features

- 🤖 Monitors Discord channel for odometer photos
- 🔍 Extracts date, time, location, and odometer reading using OCR
- 📊 Automatically logs data to Google Sheets
- 📏 Calculates the difference between consecutive odometer readings
- ✅ Provides visual feedback with reactions and reply messages

## Setup Instructions

### 1. Create a Discord Bot

Before running this bot, you need to create a Discord bot application:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" tab and click "Add Bot"
4. Under "Privileged Gateway Intents", enable:
   - Message Content Intent (required to read message content)
   - Server Members Intent (optional)
5. Click "Reset Token" and copy the bot token (save it securely!)
6. Go to "OAuth2" > "URL Generator"
7. Select scopes: `bot`
8. Select bot permissions:
   - **Required**: `Send Messages`, `Read Messages/View Channels`, `Read Message History`, `Add Reactions`
   - **Optional**: `Manage Messages` (allows bot to remove its own reactions for cleaner UI)
9. Copy the generated URL and open it in your browser to invite the bot to your Discord server

### 2. Environment Variables

You need to configure the following environment variables:

- `DISCORD_BOT_TOKEN` - Your Discord bot token from step 1
- `GOOGLE_SHEET_ID` - Your Google Spreadsheet ID (found in the URL)
- `DRIVER_CHANNEL_ID` - (Optional) Discord channel ID to monitor. If not set, bot will process images from all channels

To get your Google Sheet ID:
1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
3. Copy the `YOUR_SHEET_ID` part

To get your Discord Channel ID:
1. Enable Developer Mode in Discord (Settings > Advanced > Developer Mode)
2. Right-click on your Driver Group channel
3. Click "Copy ID"

### 3. Google Sheet Format

The bot will automatically create headers in your Google Sheet:
- **Column A**: Date
- **Column B**: Time
- **Column C**: Location
- **Column D**: Odometer Reading
- **Column E**: Difference (auto-calculated)
- **Column F**: Driver

### 3. How It Works

1. Driver posts a photo of the odometer in the Discord channel
2. Bot detects the image and reacts with ⏳ (processing)
3. OCR extracts text from the image
4. Data is written to Google Sheets
5. Bot calculates the difference from the previous reading
6. Bot reacts with ✅ and sends a confirmation message

## Image Requirements

For best results, odometer photos should:
- Be clear and well-lit
- Show the odometer reading prominently
- Include any visible date/time/location information
- Be in common image formats (PNG, JPG, etc.)

## Running the Bot

The bot will start automatically when you run the project. You'll see:
```
Starting Discord bot...
✅ Bot logged in as YourBot#1234
Monitoring channels for odometer photos...
```

## Troubleshooting

- **Bot not responding**: Make sure `DRIVER_CHANNEL_ID` is set correctly or leave it blank to monitor all channels
- **OCR accuracy issues**: Ensure photos are clear and well-lit
- **Google Sheets errors**: Verify `GOOGLE_SHEET_ID` is correct and the sheet is accessible
