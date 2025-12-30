import React, { useEffect, useState, useRef } from 'react';
import { ThemeColors } from '../types';

interface PulseParticlesProps {
    trigger: boolean;
    theme: ThemeColors;
}

interface Particle {
    id: number;
    angle: number;
    size: number;
    delay: number;
    duration: number;
    targetDistance: number;
}

const PulseParticles: React.FC<PulseParticlesProps> = ({ trigger, theme }) => {
    const [waves, setWaves] = useState<{ id: number; particles: Particle[] }[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        if (trigger) {
            const id = nextId.current++;
            const count = 30; // Slightly more particles for a "messier" look
            const newParticles: Particle[] = [];

            for (let i = 0; i < count; i++) {
                newParticles.push({
                    id: i,
                    // More random angle distribution
                    angle: (i / count) * 360 + (Math.random() * 40 - 20),
                    size: 1.5 + Math.random() * 4,
                    // Much more varied delay
                    delay: Math.random() * 0.3,
                    // Varying durations for "slow and messy"
                    duration: 1.2 + Math.random() * 1.5,
                    // Variable travel distance
                    targetDistance: 280 + Math.random() * 150
                });
            }

            setWaves(prev => [...prev, { id, particles: newParticles }]);

            // Cleanup wave after longest possible animation
            setTimeout(() => {
                setWaves(prev => prev.filter(w => w.id !== id));
            }, 3000);
        }
    }, [trigger]);

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            {waves.map(wave => (
                <div key={wave.id} className="absolute inset-0 flex items-center justify-center">
                    {wave.particles.map(p => {
                        const animationName = `particleOut-${wave.id}-${p.id}`;
                        return (
                            <React.Fragment key={p.id}>
                                <style>
                                    {`
                                        @keyframes ${animationName} {
                                            0% { 
                                                transform: rotate(${p.angle}deg) translateX(165px) scale(0.8);
                                                opacity: 0;
                                            }
                                            15% {
                                                opacity: 0.8;
                                            }
                                            100% { 
                                                transform: rotate(${p.angle + (Math.random() * 30 - 15)}deg) translateX(${p.targetDistance}px) scale(0);
                                                opacity: 0;
                                            }
                                        }
                                    `}
                                </style>
                                <div
                                    className="absolute rounded-full"
                                    style={{
                                        backgroundColor: 'white',
                                        width: p.size,
                                        height: p.size,
                                        boxShadow: `0 0 10px ${theme.primary}, 0 0 20px ${theme.primary}44`,
                                        animation: `${animationName} ${p.duration}s cubic-bezier(0.1, 0.5, 0.2, 1) forwards`,
                                        animationDelay: `${p.delay}s`,
                                        opacity: 0
                                    }}
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default PulseParticles;
