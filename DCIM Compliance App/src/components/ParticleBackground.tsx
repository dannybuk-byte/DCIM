/**
 * ParticleBackground Component
 * Animated particle effect for backgrounds
 */

import React from 'react';
import { useAnimatedParticles } from '../utils/animations';

interface ParticleBackgroundProps {
  particleCount?: number;
  color?: string;
  opacity?: number;
  className?: string;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  color = '#22d3ee', // cyan-400
  opacity = 0.3,
  className = '',
}) => {
  const particles = useAnimatedParticles(particleCount);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full transition-all duration-100"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: color,
            opacity: particle.opacity * opacity,
            boxShadow: `0 0 ${particle.size * 2}px ${color}`,
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;

