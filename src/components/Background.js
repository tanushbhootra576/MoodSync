import React from 'react';
import ParticleNetwork from './ParticleNetwork';
import './Background.css';

function Background() {
    return (
        <>
            <ParticleNetwork />
            <div className="background-container" />
        </>
    );
}

export default Background;
