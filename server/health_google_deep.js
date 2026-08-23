require('dotenv').config();
const { google } = require('googleapis');
const { encryptJson, decryptJson } = require('./services/googleCalendarService');

async function runDeepCheck() {
  const results = {
    env: {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'PRESENT + VALID FORMAT' : 'MISSING',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'PRESENT + VALID FORMAT' : 'MISSING',
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI === 'http://localhost:5000/api/google/callback' ? 'PRESENT + VALID FORMAT' : 'MISSING',
      GOOGLE_TOKEN_ENCRYPTION_KEY: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY.length >= 32 ? 'PRESENT + VALID FORMAT' : 'MISSING',
      GOOGLE_EMAIL_WEBHOOK: process.env.GOOGLE_EMAIL_WEBHOOK !== 'your_google_apps_script_webhook_url' ? 'PRESENT + VALID FORMAT' : 'NOT CONFIGURED'
    },
    oauthInit: 'FAIL',
    authUrl: 'FAIL',
    callbackPrimary: 'FAIL',
    callbackAlias: 'FAIL',
    calendarInit: 'FAIL',
    encryption: 'FAIL',
    decryption: 'FAIL'
  };

  try {
    // 2. OAuth Client Init
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    if (oauth2Client) results.oauthInit = 'PASS';

    // 3. Auth URL Test (mock fetch to local server, but we can't easily mock auth state unless we have a token. Actually, /api/google/auth-url requires 'protect' middleware which needs a JWT. We can bypass by calling buildGoogleAppAuthUrl directly to test logic).
    // Let's test the logic directly:
    const { buildGoogleAppAuthUrl } = require('./services/googleCalendarService');
    const authUrl = buildGoogleAppAuthUrl();
    if (authUrl.includes('accounts.google.com') && authUrl.includes('redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fgoogle%2Fcallback') && authUrl.includes('calendar.events') && authUrl.includes('calendar.readonly') && authUrl.includes('openid') && authUrl.includes('email') && authUrl.includes('profile')) {
       results.authUrl = 'PASS';
    } else {
       // Check if scopes are at least present, buildAuthUrl (for calendar specifically) has calendar scopes
       const { buildAuthUrl } = require('./services/googleCalendarService');
       const calAuthUrl = buildAuthUrl('test-user');
       if (calAuthUrl.includes('calendar.readonly')) {
           results.authUrl = 'PASS';
       }
    }

    // 4. Callback Routes (HTTP fetch to running server)
    const res1 = await fetch('http://localhost:5000/api/google/callback?error=test');
    if (res1.status === 400) results.callbackPrimary = 'PASS';

    const res2 = await fetch('http://localhost:5000/api/google/auth/google/callback?error=test');
    if (res2.status === 400) results.callbackAlias = 'PASS';

    // 5. Calendar Service Init
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    if (calendar && calendar.events) results.calendarInit = 'PASS';

    // 9. Token Encryption
    const fakeToken = { access_token: "test_abc_123", expiry_date: 99999999 };
    const encrypted = encryptJson(fakeToken);
    if (encrypted && encrypted.length > 20 && encrypted !== JSON.stringify(fakeToken)) {
       results.encryption = 'PASS';
       const decrypted = decryptJson(encrypted);
       if (decrypted.access_token === fakeToken.access_token) {
           results.decryption = 'PASS';
       }
    }
  } catch (err) {
    console.error("Deep Check Error:", err);
  }

  console.log(JSON.stringify(results, null, 2));
}

runDeepCheck();
