import React, { useState } from 'react';
import "./App.css";  // <-- this connects CSS with JS
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [mood, setMood] = useState('');
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generatePlaylist() {
    setError('');
    setPlaylist([]);
    if (!mood.trim()) {
      setError('Please enter a mood or vibe.');
      return;
    }

    setLoading(true);

    try {
      console.log('[CLIENT] Sending analyze request to:', `${BACKEND_URL}/api/analyze-mood`);
      const analyzeResponse = await fetch(`${BACKEND_URL}/api/analyze-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodText: mood }),
      });

      const analyzeData = await analyzeResponse.json().catch(() => ({}));
      if (!analyzeResponse.ok) {
        // show backend message to user if available
        throw new Error(analyzeData.error || `Analyze failed: ${analyzeResponse.status}`);
      }

      const aiMood = analyzeData.mood || 'happy';
      console.log('[CLIENT] AI mood:', aiMood);

      // fetch playlist
      const playlistResponse = await fetch(`${BACKEND_URL}/api/spotify-playlist?mood=${encodeURIComponent(aiMood)}`);
      const playlistData = await playlistResponse.json().catch(() => ({}));
      if (!playlistResponse.ok) {
        throw new Error(playlistData.error || `Playlist fetch failed: ${playlistResponse.status}`);
      }

      setPlaylist(playlistData.tracks || []);
    } catch (err) {
      console.error('[CLIENT] API error:', err);
      setError(err.message || 'Failed to generate playlist. Try again.');
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1 color='black'>AI Mood-Based Playlist Generator</h1>

      <textarea
        rows={4}
        placeholder="Type your mood here, e.g., happy, sad, energetic, chill..."
        value={mood}
        onChange={(e) => setMood(e.target.value)}
        style={{ width: '100%', padding: 10, fontSize: 16 }}
      />

      <div style={{ marginTop: 12 }}>
        <button
          onClick={generatePlaylist}
          style={{
            padding: '10px 20px',
            fontSize: 16,
            cursor: 'pointer',
            backgroundColor: '#1DB954',
            color: 'white',
            border: 'none',
            borderRadius: 6,
          }}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Playlist'}
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginTop: 16 }}>
          {error}
        </p>
      )}

      <h2 style={{ marginTop: 30 }}>Playlist</h2>
      {playlist.length === 0 && !loading && <p>No playlist generated yet.</p>}
      <ul style={{ listStyleType: 'none', padding: 0 }}>
        {playlist.map((song, index) => (
          <li
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 15,
              borderBottom: '1px solid #eee',
              paddingBottom: 10,
            }}
          >
            {song.image && (
              <img
                src={song.image}
                alt={song.name}
                style={{ width: 64, height: 64, marginRight: 15, borderRadius: 4 }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: 16 }}>{song.name}</div>
              <div style={{ color: '#555' }}>{song.artist}</div>
              {song.url && (
                <a href={song.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1DB954', textDecoration: 'none', fontWeight: 'bold' }}>
                  Open in Spotify
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
