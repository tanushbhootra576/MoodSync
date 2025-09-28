import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';
import Background from './components/Background';
import Home from './pages/Home';
import Playlist from './pages/Playlist';
import About from './pages/About';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

function AppWrapper() {
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function generatePlaylist(moodText) {
    setError('');
    setPlaylist([]);
    if (!moodText.trim()) {
      setError('Please enter a mood or vibe.');
      return;
    }
    setLoading(true);
    try {
      const res1 = await fetch(`${BACKEND_URL}/api/analyze-mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodText }),
      });
      const data1 = await res1.json();
      if (!res1.ok) throw new Error(data1.error || `Error ${res1.status}`);
      const aiMood = data1.mood || 'happy';

      const res2 = await fetch(
        `${BACKEND_URL}/api/spotify-playlist?mood=${encodeURIComponent(aiMood)}`
      );
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2.error || `Error ${res2.status}`);
      setPlaylist(data2.tracks || []);
      navigate('/playlist');
    } catch (e) {
      setError(e.message || 'Failed to generate playlist.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <Background />
      <Routes>
        <Route path="/" element={<Home onGenerate={generatePlaylist} loading={loading} error={error} />} />
        <Route path="/playlist" element={<Playlist playlist={playlist} />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  );
}

export default App;
