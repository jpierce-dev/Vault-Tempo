import React, { useEffect, useState } from 'react';
import { ThemeColors } from '../types';

interface PulseParticlesProps {
    trigger: boolean;
    theme: ThemeColors;
}

interface Particle {
    id: number;
    angle: number;
    distance: number;
    size: number;
    speed: number;
}

const PulseParticles: React.FC<PulseParticlesProps> = ({ trigger, theme }) => {
    const [particles, setParticles] = useState<Particle[]>([]);

    useEffect(() => {
        if (trigger) {
            // Spawn new explosion
            const count = 32; // Number of particles
            const newParticles: Particle[] = [];

            for (let i = 0; i < count; i++) {
                // Distribute 360 degrees
                const angle = (i / count) * 360 + (Math.random() * 20 - 10);
                newParticles.push({
                    id: Date.now() + i,
                    angle,
                    distance: 100 + Math.random() * 50, // Start radius offset
                    size: 2 + Math.random() * 4,
                    speed: 0.5 + Math.random() * 0.5
                });
            }

            setParticles(newParticles);

            // Cleanup after animation
            const timer = setTimeout(() => {
                setParticles([]);
            }, 600);

            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (particles.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full animate-out fade-out zoom-out duration-500 ease-out"
                    style={{
                        backgroundColor: theme.primary,
                        width: p.size,
                        height: p.size,
                        transform: `rotate(${p.angle}deg) translateX(${p.distance}px)`,
                        boxShadow: `0 0 ${p.size * 2}px ${theme.primary}`,
                        opacity: 0.8
                    }}
                >
                    {/* Adding an animation class via style tag for strict movement if CSS classes aren't enough */}
                    <style>
                        {`
                    @keyframes moveOut-${p.id} {
                        0% { transform: rotate(${p.angle}deg) translateX(110px) scale(1); opacity: 1; }
                        100% { transform: rotate(${p.angle}deg) translateX(${180 + p.distance}px) scale(0); opacity: 0; }
                    }
                `}
                    </style>
                    <div style={{
                        animation: `moveOut-${p.id} 0.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards`,
                        boxShadow: `0 0 10px ${theme.primary}`
                    }} className="w-full h-full rounded-full bg-white"></div>
                </div>
            ))}
        </div>
    );
};

export default PulseParticles;
