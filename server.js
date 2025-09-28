require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SERVICE_ACCOUNT_KEY_PATH =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'service-account.json');
const USE_FALLBACK = process.env.USE_FALLBACK === 'true';

function simpleFallbackForMood(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('happy') || t.includes('upbeat') || t.includes('cheer')) return 'happy';
  if (t.includes('sad') || t.includes('down') || t.includes('blue')) return 'sad';
  if (t.includes('energy') || t.includes('party') || t.includes('dance')) return 'energetic';
  if (t.includes('relax') || t.includes('chill') || t.includes('calm')) return 'chill';
  if (t.includes('love') || t.includes('romant')) return 'romantic';
  return 'happy';
}

async function getGoogleAccessToken() {
  const authOptions = { scopes: ['https://www.googleapis.com/auth/cloud-platform'] };

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      authOptions.credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON');
    }
  } else if (fs.existsSync(SERVICE_ACCOUNT_KEY_PATH)) {
    authOptions.keyFilename = SERVICE_ACCOUNT_KEY_PATH;
  } else {
    throw new Error('No Google credentials found');
  }

  const auth = new GoogleAuth(authOptions);
  const client = await auth.getClient();
  const accessTokenResponse = await client.getAccessToken();
  return accessTokenResponse.token;
}

app.get('/', (req, res) => res.send('API server is running'));

app.post('/api/analyze-mood', async (req, res) => {
  const { moodText } = req.body;
  if (!moodText) return res.status(400).json({ error: 'Mood text is required' });

  console.log('[SERVER] /api/analyze-mood called. USE_FALLBACK=', USE_FALLBACK);

  if (USE_FALLBACK) {
    const mapped = simpleFallbackForMood(moodText);
    console.log('[SERVER] Using fallback mood:', mapped);
    return res.json({ mood: mapped });
  }

  try {
    let url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';
    let headers = { 'Content-Type': 'application/json' };

    // --- 2. Use API key if available ---
    if (process.env.GOOGLE_API_KEY) {
      url += `?key=${process.env.GOOGLE_API_KEY}`;
    } else {
      // --- 3. Else, use service account ---
      const accessToken = await getGoogleAccessToken();
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await axios.post(
      url,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze this mood description and respond with one word only: happy, sad, energetic, chill, or romantic. Text: "${moodText}"`,
              },
            ],
          },
        ],
      },
      { headers }
    );

    console.log('[SERVER] Gemini response:', JSON.stringify(response.data, null, 2));

    const candidateText =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      response.data?.candidates?.[0]?.output ||
      null;

    if (!candidateText) {
      return res.status(500).json({ error: 'Unexpected Gemini response structure' });
    }

    res.json({ mood: candidateText.trim().toLowerCase() });
  } catch (error) {
    console.error('[SERVER] Gemini API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to analyze mood' });
  }
});

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Missing Spotify client ID/secret in environment.');
  }
  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');
  const response = await axios.post(
    SPOTIFY_TOKEN_URL,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

app.get('/api/spotify-playlist', async (req, res) => {
  const mood = req.query.mood;
  if (!mood) return res.status(400).json({ error: 'Mood query is required' });

  try {
    const accessToken = await getSpotifyAccessToken();
    const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: `${mood} playlist`, type: 'playlist', limit: 1 },
    });

    const playlists = searchResponse.data.playlists?.items || [];
    if (playlists.length === 0) return res.json({ tracks: [] });

    const playlistId = playlists[0].id;
    const tracksResponse = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const tracks = (tracksResponse.data.items || []).map((item) => {
      const track = item.track || {};
      return {
        name: track.name || 'Unknown',
        artist: (track.artists || []).map((a) => a.name).join(', '),
        image: track.album?.images?.[0]?.url || null,
        url: track.external_urls?.spotify || '',
      };
    });

    res.json({ tracks });
  } catch (error) {
    console.error('[SERVER] Spotify API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch Spotify playlist' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
