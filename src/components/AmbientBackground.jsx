import { useEffect, useRef } from 'react';

export default function AmbientBackground({ activeColor = '#00f0ff' }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX / width - 0.5) * 40;
      mouseRef.current.targetY = (e.clientY / height - 0.5) * 40;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Generate 3D Star / Particle field
    const PARTICLE_COUNT = 90;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * 1000 + 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.4 + 0.2,
    }));

    // Floating glowing orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.3, radius: 260, vx: 0.3, vy: 0.2 },
      { x: width * 0.8, y: height * 0.7, radius: 320, vx: -0.2, vy: 0.3 },
      { x: width * 0.5, y: height * 0.5, radius: 200, vx: 0.1, vy: -0.2 },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const { x: mx, y: my } = mouseRef.current;

      // 1. Draw glowing background orbs with dynamic color tint
      orbs.forEach((orb, i) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -100 || orb.x > width + 100) orb.vx *= -1;
        if (orb.y < -100 || orb.y > height + 100) orb.vy *= -1;

        const grad = ctx.createRadialGradient(
          orb.x - mx * 1.5,
          orb.y - my * 1.5,
          0,
          orb.x - mx * 1.5,
          orb.y - my * 1.5,
          orb.radius
        );

        if (i === 0) {
          grad.addColorStop(0, `${activeColor}22`);
          grad.addColorStop(0.5, `${activeColor}0a`);
          grad.addColorStop(1, 'transparent');
        } else if (i === 1) {
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.14)');
          grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.04)');
          grad.addColorStop(1, 'transparent');
        } else {
          grad.addColorStop(0, 'rgba(6, 182, 212, 0.12)');
          grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.02)');
          grad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x - mx * 1.5, orb.y - my * 1.5, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw 3D Depth Particles
      const fov = 400;
      particles.forEach((p) => {
        p.z -= p.speed;
        if (p.z <= 10) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * width * 1.5;
          p.y = (Math.random() - 0.5) * height * 1.5;
        }

        const scale = fov / p.z;
        const projX = width / 2 + (p.x - mx * 15) * scale;
        const projY = height / 2 + (p.y - my * 15) * scale;
        const projSize = Math.max(0.6, p.size * scale);

        if (projX >= 0 && projX <= width && projY >= 0 && projY <= height) {
          ctx.beginPath();
          ctx.arc(projX, projY, projSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(230, 240, 255, ${Math.min(1, p.opacity * scale * 1.8)})`;
          ctx.shadowColor = activeColor;
          ctx.shadowBlur = 8 * scale;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeColor]);

  return (
    <div className="spatial-background-wrapper" aria-hidden="true">
      <canvas ref={canvasRef} className="spatial-canvas" />
      <div className="spatial-grid-overlay" />
      <div
        className="spatial-dynamic-glow"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${activeColor}28 0%, rgba(13, 14, 24, 0) 80%)`,
        }}
      />
    </div>
  );
}
