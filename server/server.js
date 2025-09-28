const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const axios = require('axios');
const cors = require('cors');
// Removed Google OAuth dependencies and service account logic

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
// Use fallback or API key only
const USE_FALLBACK = process.env.USE_FALLBACK === 'true';

/**
 * Simple mood fallback based on keyword matching.
 * Maps a wide range of synonyms to core mood categories.
 */
function simpleFallbackForMood(text) {
    const t = (text || '').toLowerCase();
    const moodMap = {
        happy: ['happy', 'joy', 'cheer', 'delight', 'ecstatic', 'bliss'],
        sad: ['sad', 'down', 'blue', 'mourn', 'melancholy', 'heartbroken'],
        angry: ['angry', 'mad', 'furious', 'irritated', 'resent'],
        fearful: ['fear', 'scared', 'panicked', 'terrified', 'anxious'],
        disgusted: ['disgust', 'gross', 'nausea'],
        surprised: ['surprise', 'shocked', 'astonished'],
        energetic: ['energy', 'energetic', 'excited', 'vigorous', 'lively'],
        chill: ['relax', 'chill', 'calm', 'serene', 'peaceful'],
        romantic: ['love', 'romant', 'affection', 'enchanted'],
        jealous: ['jeal', 'envy', 'envious'],
        anxious: ['anxi', 'nervous', 'worried'],
        calm: ['calm', 'serene', 'tranquil'],
        nostalgic: ['nostalg', 'memory', 'reminisc'],
        hopeful: ['hopeful', 'optimistic'],
        playful: ['playful', 'silly', 'amused'],
        focused: ['focus', 'concentrate', 'determined'],
        tired: ['tired', 'sleepy', 'exhausted'],
        // fallback neutral
        neutral: []
    };
    for (const [mood, keywords] of Object.entries(moodMap)) {
        if (keywords.some(k => t.includes(k))) {
            return mood;
        }
    }
    // Default to neutral if no keywords matched
    return 'neutral';
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

        if (process.env.GOOGLE_API_KEY) {
            url += `?key=${process.env.GOOGLE_API_KEY}`;
        } else {
            // No API key provided, fallback to simple mood mapping
            const mapped = simpleFallbackForMood(moodText);
            console.log('[SERVER] No GOOGLE_API_KEY; fallback mood:', mapped);
            return res.json({ mood: mapped });
        }

        const response = await axios.post(
            url,
            {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `Analyze this mood description and respond with one word only describing the mood (e.g., happy, sad, energetic, chill, romantic, jealous, anxious, calm, etc.). Text: "${moodText}"`,
                            },
                        ],
                    },
                ],
            },
            { headers }
        );

        const candidateText =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            response.data?.candidates?.[0]?.output ||
            null;

        if (!candidateText) {
            return res.status(500).json({ error: 'Unexpected Gemini response' });
        }
        const moodNormalized = candidateText.trim().toLowerCase();
        const allowed = [
            // Core emotions
            'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised',

            // Positive moods
            'energetic', 'chill', 'romantic', 'excited', 'joyful', 'optimistic',
            'confident', 'peaceful', 'grateful', 'playful', 'hopeful', 'curious',
            'relaxed', 'proud', 'silly', 'content', 'inspired', 'motivated',
            'amused', 'dreamy', 'nostalgic', 'ecstatic', 'blissful',

            // Negative moods
            'jealous', 'anxious', 'lonely', 'bored', 'frustrated', 'tired',
            'guilty', 'ashamed', 'resentful', 'heartbroken', 'overwhelmed',
            'insecure', 'pessimistic', 'irritated', 'restless', 'melancholy',
            'confused', 'hopeless', 'stressed', 'regretful', 'moody',

            // Intense states
            'furious', 'panicked', 'desperate', 'vengeful', 'shocked',
            'heartbroken', 'betrayed', 'grieving', 'devastated', 'obsessed',

            // Gentle/neutral states
            'calm', 'serene', 'thoughtful', 'focused', 'indifferent',
            'apathetic', 'neutral', 'dazed', 'curious', 'wistful'
        ];

        if (!allowed.includes(moodNormalized)) {
            console.log('[SERVER] Unrecognized mood from AI:', moodNormalized, '; using fallback.');
            const mapped = simpleFallbackForMood(moodText);
            return res.json({ mood: mapped });
        }
        res.json({ mood: moodNormalized });
    } catch (error) {
        console.error('[SERVER] Gemini API Error:', error.response?.data || error.message);
        // If Google credentials missing, fallback to simple mapping
        if (error.message.includes('No Google credentials found') || error.message.includes('Invalid GOOGLE_SERVICE_ACCOUNT_JSON')) {
            const mapped = simpleFallbackForMood(moodText);
            console.log('[SERVER] Fallback due to credential error, mood:', mapped);
            return res.json({ mood: mapped });
        }
        return res.status(500).json({ error: 'Failed to analyze mood' });
    }
});

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

async function getSpotifyAccessToken() {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
        throw new Error('Missing Spotify credentials');
    }
    const creds = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
        SPOTIFY_TOKEN_URL,
        'grant_type=client_credentials',
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.access_token;
}

app.get('/api/spotify-playlist', async (req, res) => {
    const mood = req.query.mood;
    if (!mood) return res.status(400).json({ error: 'Mood query is required' });

    try {
        const token = await getSpotifyAccessToken();
        const search = await axios.get('https://api.spotify.com/v1/search', { headers: { Authorization: `Bearer ${token}` }, params: { q: `${mood} playlist`, type: 'playlist', limit: 1 } });
        const items = search.data.playlists.items;
        if (!items.length) return res.json({ tracks: [] });
        const playlistId = items[0].id;
        const tracks = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, { headers: { Authorization: `Bearer ${token}` } });
        const formatted = tracks.data.items.map(i => ({ name: i.track.name, artist: i.track.artists.map(a => a.name).join(', '), image: i.track.album.images[0]?.url, url: i.track.external_urls.spotify }));
        res.json({ tracks: formatted });
    } catch (e) {
        console.error('[SERVER] Spotify Error', e.message);
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
