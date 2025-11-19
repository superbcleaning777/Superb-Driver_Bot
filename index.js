import { Client, GatewayIntentBits } from 'discord.js';
import { google } from 'googleapis';
import Tesseract from 'tesseract.js';

let googleSheetConnectionSettings;

async function getGoogleSheetClient() {
  if (googleSheetConnectionSettings && googleSheetConnectionSettings.settings.expires_at && 
      new Date(googleSheetConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: googleSheetConnectionSettings.settings.access_token
    });
    return google.sheets({ version: 'v4', auth: oauth2Client });
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  googleSheetConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = googleSheetConnectionSettings?.settings?.access_token || 
                     googleSheetConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!googleSheetConnectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function writeToGoogleSheet(data) {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
  
  if (!SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEET_ID environment variable not set. Please add your Google Sheet ID.');
  }
  
  const sheets = await getGoogleSheetClient();
  
  try {
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Drivers_Mileage!A1:F1',
    });
    
    if (!sheetData.data.values || sheetData.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Drivers_Mileage!A1:F1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Date', 'Time', 'Location', 'Odometer Reading', 'Difference', 'Driver']]
        }
      });
      console.log('Headers created in Google Sheet');
    }
  } catch (error) {
    console.log('Creating headers in new sheet');
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Drivers_Mileage!A1:F1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Date', 'Time', 'Location', 'Odometer Reading', 'Difference', 'Driver']]
      }
    });
  }
  
  const allData = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Drivers_Mileage!A:F',
  });
  
  const rows = allData.data.values || [];
  let previousOdometer = null;
  const currentDate = data.date || 'N/A';
  
  // Find the most recent reading from the same date
  if (rows.length > 1) {
    // Loop backwards through rows (excluding header row)
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const rowDate = row[0]; // Date is in column A
      const rowOdometer = row[3]; // Odometer is in column D
      
      // Check if this row has the same date
      if (rowDate === currentDate && rowOdometer) {
        previousOdometer = parseInt(rowOdometer.replace(/[^\d]/g, ''));
        console.log(`Found previous reading on same date (${currentDate}): ${previousOdometer}`);
        break;
      }
    }
  }
  
  let difference = '';
  const currentOdometer = data.odometer ? parseInt(data.odometer.replace(/[^\d]/g, '')) : null;
  
  if (previousOdometer && currentOdometer) {
    difference = currentOdometer - previousOdometer;
    console.log(`Difference calculated: ${currentOdometer} - ${previousOdometer} = ${difference}`);
  } else if (!previousOdometer) {
    console.log(`No previous reading found for date ${currentDate}, difference will be N/A`);
  }
  
  const newRow = [
    data.date || 'N/A',
    data.time || 'N/A',
    data.location || 'N/A',
    data.odometer || 'N/A',
    difference !== '' ? difference : 'N/A',
    data.driver || 'Unknown'
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Drivers_Mileage!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow]
    }
  });
  
  console.log('Data written to Google Sheet:', newRow);
  return { success: true, difference };
}

async function startBot() {
  console.log('Starting Discord bot...');
  
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  
  if (!DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN environment variable not set. Please add your Discord bot token from the Discord Developer Portal.');
  }
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });
  
  // Track processed messages to prevent duplicates
  const processedMessages = new Set();
  
  client.on('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`Monitoring channels for !odo commands...`);
    console.log(`Usage: !odo 149684 (with optional photo attachment)`);
  });
  
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const DRIVER_CHANNEL_ID = process.env.DRIVER_CHANNEL_ID;
    
    if (DRIVER_CHANNEL_ID && message.channel.id !== DRIVER_CHANNEL_ID) {
      return;
    }
    
    if (!message.content.startsWith('!odo')) return;
    
    // Prevent duplicate processing of the same message
    if (processedMessages.has(message.id)) {
      console.log(`⚠️ Message ${message.id} already processed, skipping...`);
      return;
    }
    processedMessages.add(message.id);
    
    // Clean up old message IDs (keep only last 100)
    if (processedMessages.size > 100) {
      const firstId = processedMessages.values().next().value;
      processedMessages.delete(firstId);
    }
    
    console.log(`\n📝 Command received from ${message.author.tag}: ${message.content}`);
    
    const commandMatch = message.content.match(/!odo\s+(\d{5,7})/);
    
    if (!commandMatch) {
      await message.reply('❌ Please provide the odometer reading.\n**Usage:** `!odo 149684` (with optional photo attachment)');
      return;
    }
    
    const odometerReading = commandMatch[1];
    console.log(`🚗 Odometer reading: ${odometerReading}`);
    
    let processingReaction = null;
    
    try {
      processingReaction = await message.react('⏳');
      
      const odometerData = {
        date: null,
        time: null,
        location: null,
        odometer: odometerReading,
        driver: message.author.tag
      };
      
      const imageAttachment = message.attachments.find(att => 
        att.contentType && att.contentType.startsWith('image/')
      );
      
      if (imageAttachment) {
        console.log('📸 Extracting metadata from attached photo...');
        try {
          const metadataResult = await Tesseract.recognize(imageAttachment.url, 'eng');
          const metadataText = metadataResult.data.text;
          console.log('Photo metadata:', metadataText);
          
          const lines = metadataText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          
          for (const line of lines) {
            if (!odometerData.date) {
              const numericDate = line.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/);
              if (numericDate) {
                odometerData.date = numericDate[0];
              } else {
                const monthNameDate = line.match(/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}/i);
                if (monthNameDate) {
                  odometerData.date = monthNameDate[0];
                }
              }
            }
            if (!odometerData.time && /\d{1,2}:\d{2}/.test(line)) {
              odometerData.time = line.match(/\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?/)?.[0];
            }
          }
          
          const locationLines = lines.filter(line => {
            if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(line)) return false;
            if (/\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(line)) return false;
            if (/^\d{5}/.test(line)) return false;
            if (/\d{1,2}:\d{2}/.test(line)) return false;
            if (line.length < 3) return false;
            if (!/[a-zA-Z]/.test(line)) return false;
            return true;
          });
          
          if (locationLines.length > 0) {
            odometerData.location = locationLines.slice(0, 2).join(', ');
          }
          
        } catch (err) {
          console.log('⚠️ Could not extract photo metadata:', err.message);
        }
      }
      
      const now = new Date();
      if (!odometerData.date) {
        odometerData.date = now.toLocaleDateString('en-GB');
      }
      if (!odometerData.time) {
        odometerData.time = now.toLocaleTimeString('en-US', { hour12: true });
      }
      
      const result = await writeToGoogleSheet(odometerData);
      
      if (processingReaction) {
        try {
          await processingReaction.users.remove(client.user.id);
        } catch (err) {
          console.log('Could not remove processing reaction');
        }
      }
      
      // Remove any previous error reaction if this is a retry
      try {
        const reactions = message.reactions.cache.get('❌');
        if (reactions && reactions.me) {
          await reactions.users.remove(client.user.id);
        }
      } catch (err) {
        console.log('Could not remove error reaction');
      }
      
      await message.react('✅');
      
      let responseText = `📊 **Odometer data recorded!**\n`;
      responseText += `📅 Date: ${odometerData.date}\n`;
      responseText += `🕒 Time: ${odometerData.time}\n`;
      responseText += `📍 Location: ${odometerData.location || 'Not provided'}\n`;
      responseText += `🚗 Odometer: ${odometerData.odometer} km\n`;
      if (result.difference && result.difference !== 'N/A') {
        responseText += `📏 Distance from last reading: ${result.difference} km\n`;
      }
      
      await message.reply(responseText);
      
    } catch (error) {
      console.error('❌ ERROR processing odometer command:', error);
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
      
      if (processingReaction) {
        try {
          await processingReaction.users.remove(client.user.id);
        } catch (err) {
          console.log('Could not remove processing reaction');
        }
      }
      
      try {
        await message.react('❌');
        await message.reply(`❌ Error recording odometer data. Please try again.\nError: ${error.message}`);
      } catch (reactionError) {
        console.error('Failed to add error reaction:', reactionError);
      }
    }
  });
  
  await client.login(DISCORD_BOT_TOKEN);
}

startBot().catch(error => {
  console.error('Fatal error starting bot:', error);
  process.exit(1);
});
