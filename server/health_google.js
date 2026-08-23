require('dotenv').config();
const { google } = require('googleapis');
const crypto = require('crypto');
const googleCalendarService = require('./services/googleCalendarService');

async function checkGoogleConfig() {
  const results = {
    clientId: 'FAIL',
    clientSecret: 'FAIL',
    redirectUri: 'FAIL',
    encryptionKey: 'FAIL',
    oauthClientInit: 'FAIL',
    calendarInit: 'FAIL',
    errors: []
  };

  try {
    // 1. Client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && clientId.includes('.apps.googleusercontent.com')) {
      results.clientId = 'PASS';
    } else {
      results.errors.push('Invalid or missing GOOGLE_CLIENT_ID');
    }

    // 2. Client Secret
    if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET.length > 10) {
      results.clientSecret = 'PASS';
    } else {
      results.errors.push('Missing GOOGLE_CLIENT_SECRET');
    }

    // 3. Redirect URI
    if (process.env.GOOGLE_REDIRECT_URI === 'http://localhost:5000/api/google/callback') {
      results.redirectUri = 'PASS';
    } else {
      results.errors.push('Incorrect GOOGLE_REDIRECT_URI');
    }

    // 4. Encryption Key
    const encKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
    if (encKey && encKey.length >= 32) {
      try {
        const hash = crypto.createHash('sha256').update(String(encKey)).digest();
        if (hash.length === 32) results.encryptionKey = 'PASS';
      } catch (e) {
        results.errors.push('Invalid GOOGLE_TOKEN_ENCRYPTION_KEY format');
      }
    } else {
      results.errors.push('Missing or too short GOOGLE_TOKEN_ENCRYPTION_KEY');
    }

    // 5. OAuth client Init
    try {
      const url = googleCalendarService.buildGoogleAppAuthUrl();
      if (url && url.includes('accounts.google.com')) {
        results.oauthClientInit = 'PASS';
      }
    } catch (e) {
      results.errors.push('OAuth Client Init Error: ' + e.message);
    }

    // 6. Calendar Service Init
    try {
      // Just verifying we can create the client instance
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID, 
        process.env.GOOGLE_CLIENT_SECRET, 
        process.env.GOOGLE_REDIRECT_URI
      );
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      if (calendar && calendar.events) {
        results.calendarInit = 'PASS';
      }
    } catch (e) {
      results.errors.push('Calendar Init Error: ' + e.message);
    }
  } catch (err) {
    results.errors.push('Global script error: ' + err.message);
  }

  const oauthPass = (results.clientId === 'PASS' && results.clientSecret === 'PASS' && results.redirectUri === 'PASS' && results.encryptionKey === 'PASS' && results.oauthClientInit === 'PASS');
  const calPass = (results.calendarInit === 'PASS');

  console.log("OAUTH_CONFIG=" + (oauthPass ? 'PASS' : 'FAIL'));
  console.log("CALENDAR_CONFIG=" + (calPass ? 'PASS' : 'FAIL'));
  if (results.errors.length > 0) {
    console.log("ERRORS=" + JSON.stringify(results.errors));
  } else {
    console.log("ERRORS=None");
  }
}

checkGoogleConfig();
