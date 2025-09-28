import React from 'react';
import './Pages.css';

function Playlist({ playlist }) {
    return (
        <div className="page-container">
            <h2>Your Playlist</h2>
            <ul className="song-list">
                {playlist.map((song, idx) => (
                    <li key={idx}>
                        {song.image && <img src={song.image} alt={song.name} />}
                        <div>
                            <strong>{song.name}</strong>
                            <p>{song.artist}</p>
                            {song.url && <a href={song.url} target="_blank" rel="noopener noreferrer">Listen</a>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Playlist;