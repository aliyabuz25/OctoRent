import React, { useEffect, useRef } from 'react';

export default function AppleWatchNebula({
  mode = 'orbiting', // 'orbiting' | 'imploding' | 'success'
  size = 320,
  className = '',
  style = {},
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const numParticles = 110;

    // Single-tone Starlight & Silver palette
    const colors = [
      'rgba(255, 255, 255, ',    // Crisp Starlight White
      'rgba(241, 245, 249, ',    // Ethereal White
      'rgba(226, 232, 240, ',    // Slate Light
      'rgba(203, 213, 225, ',    // Soft Silver
      'rgba(148, 163, 184, ',    // Muted Slate
    ];

    const particles = Array.from({ length: numParticles }, (_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;
      const baseRadius = (size * 0.42) + (Math.random() - 0.5) * (size * 0.12);
      return {
        theta,
        phi,
        baseRadius,
        currentRadius: baseRadius,
        speed: 0.008 + Math.random() * 0.016,
        size: 1.5 + Math.random() * 2.2,
        colorBase: colors[i % colors.length],
        alpha: 0.3 + Math.random() * 0.65,
        pulseOffset: Math.random() * Math.PI * 2,
      };
    });

    let frame = 0;
    let collapseProgress = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      frame += 1;

      // Handle mode transitions
      if (mode === 'imploding') {
        collapseProgress = Math.min(1, collapseProgress + 0.04);
      } else if (mode === 'success') {
        collapseProgress = Math.max(0, collapseProgress - 0.02);
      } else {
        collapseProgress = 0;
      }

      // Draw subtle orbital ring backdrop
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.43, 0, Math.PI * 2);
      ctx.strokeStyle = mode === 'success' ? 'rgba(52, 199, 89, 0.45)' : 'rgba(0, 122, 255, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.restore();

      // Sort particles by 3D z-depth for correct perspective
      const sorted = particles.map((p) => {
        p.theta += p.speed;
        const targetRadius = mode === 'imploding'
          ? p.baseRadius * (1 - collapseProgress)
          : p.baseRadius;

        p.currentRadius += (targetRadius - p.currentRadius) * 0.15;

        const x3d = p.currentRadius * Math.cos(p.theta) * Math.cos(p.phi);
        const y3d = p.currentRadius * Math.sin(p.phi);
        const z3d = p.currentRadius * Math.sin(p.theta) * Math.cos(p.phi);

        // Perspective projection
        const scale = (z3d + size) / size;
        const x2d = cx + x3d;
        const y2d = cy + y3d * 0.95;

        return {
          x: x2d,
          y: y2d,
          scale,
          z: z3d,
          size: p.size * Math.max(0.6, scale),
          colorBase: p.colorBase,
          alpha: p.alpha * Math.max(0.3, (z3d + p.baseRadius) / (2 * p.baseRadius)),
          pulse: Math.sin(frame * 0.05 + p.pulseOffset),
        };
      }).sort((a, b) => a.z - b.z);

      // Render glowing particle cloud
      sorted.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

        const currentAlpha = Math.min(1, Math.max(0.1, p.alpha + p.pulse * 0.15));
        ctx.fillStyle = `${p.colorBase}${currentAlpha})`;
        ctx.shadowColor = p.colorBase.replace('rgba', 'rgb').replace(', ', ')');
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [mode, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`apple-watch-nebula ${className}`.trim()}
      style={{
        width: size,
        height: size,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}
