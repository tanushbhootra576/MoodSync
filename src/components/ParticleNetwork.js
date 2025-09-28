import React, { useRef, useEffect } from 'react';

export default function ParticleNetwork() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const particles = [];
        const config = {
            count: 80,
            minRadius: 1,
            maxRadius: 3,
            maxVelocity: 0.5,
            linkDistance: 120,
        };

        function init() {
            particles.length = 0;
            for (let i = 0; i < config.count; i++) {
                const radius = Math.random() * (config.maxRadius - config.minRadius) + config.minRadius;
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * config.maxVelocity,
                    vy: (Math.random() - 0.5) * config.maxVelocity,
                    r: radius,
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            const style = getComputedStyle(document.documentElement);
            const particleColor = style.getPropertyValue('--primary-color').trim() || '#ff00ff';
            const lineColor = style.getPropertyValue('--accent-color').trim() || '#ff8000';

            // Draw particles
            particles.forEach((p, i) => {
                // update position
                p.x += p.vx;
                p.y += p.vy;
                // bounce
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
                // draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = particleColor;
                ctx.fill();

                // draw links
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < config.linkDistance) {
                        const opacity = 1 - dist / config.linkDistance;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `${lineColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(draw);
        }

        init();
        draw();

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        });
    }, []);

    return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -2, pointerEvents: 'none' }} />;
}