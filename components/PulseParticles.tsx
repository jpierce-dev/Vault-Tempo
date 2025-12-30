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
}

const PulseParticles: React.FC<PulseParticlesProps> = ({ trigger, theme }) => {
    const [waves, setWaves] = useState<{ id: number; particles: Particle[] }[]>([]);
    const nextId = useRef(0);

    useEffect(() => {
        if (trigger) {
            const id = nextId.current++;
            const count = 24;
            const newParticles: Particle[] = [];

            for (let i = 0; i < count; i++) {
                newParticles.push({
                    id: i,
                    angle: (i / count) * 360 + (Math.random() * 15 - 7.5),
                    size: 2 + Math.random() * 3,
                    delay: Math.random() * 0.1
                });
            }

            setWaves(prev => [...prev, { id, particles: newParticles }]);

            // Remove wave after animation completes
            setTimeout(() => {
                setWaves(prev => prev.filter(w => w.id !== id));
            }, 1000);
        }
    }, [trigger]);

    return (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
            <style>
                {`
                    @keyframes particleOut {
                        0% { 
                            transform: rotate(var(--angle)) translateX(110px) scale(1);
                            opacity: 0;
                        }
                        10% {
                            opacity: 1;
                        }
                        100% { 
                            transform: rotate(var(--angle)) translateX(250px) scale(0);
                            opacity: 0;
                        }
                    }
                `}
            </style>
            {waves.map(wave => (
                <div key={wave.id} className="absolute inset-0 flex items-center justify-center">
                    {wave.particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute rounded-full"
                            style={{
                                '--angle': `${p.angle}deg`,
                                backgroundColor: 'white',
                                width: p.size,
                                height: p.size,
                                boxShadow: `0 0 12px ${theme.primary}`,
                                animation: `particleOut 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                                animationDelay: `${p.delay}s`,
                                opacity: 0
                            } as any}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

export default PulseParticles;
