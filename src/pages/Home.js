import React, { useState } from 'react';
import './Pages.css';

function Home({ onGenerate }) {
    const [mood, setMood] = useState('');

    return (
        <div className="page-container">
            <h1>Welcome!</h1>
            <textarea
                rows={3}
                placeholder="Describe your mood..."
                value={mood}
                onChange={(e) => setMood(e.target.value)}
            />
            <button disabled={!mood.trim()} onClick={() => onGenerate(mood)}>
                Analyze & Generate Playlist
            </button>
        </div>
    );
}

export default Home;