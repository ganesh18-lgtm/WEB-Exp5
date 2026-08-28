import React, { useState } from 'react';
import SpatialCarousel from './components/SpatialCarousel';
import AmbientBackground from './components/AmbientBackground';
import { initialCarouselData, categories } from './data/carouselData';
import './App.css';

function App() {
  const [items, setItems] = useState(initialCarouselData);
  const [activeItem, setActiveItem] = useState(initialCarouselData[0]);

  const handleAddItem = (newItem) => {
    setItems((prev) => [newItem, ...prev]);
    setActiveItem(newItem);
  };

  return (
    <div className="app-spatial-container">
      {/* Dynamic 3D Ambient Particle & Glowing Canvas Layer */}
      <AmbientBackground activeColor={activeItem?.accentColor || '#00f0ff'} />

      {/* Main Glassmorphic Application Shell */}
      <div className="app-content-shell">
        {/* Spatial Navigation Header */}
        <header className="spatial-header">
          <div className="brand-group">
            <div className="brand-logo-gem">
              <div
                className="gem-core"
                style={{
                  background: `linear-gradient(135deg, ${activeItem?.accentColor || '#00f0ff'}, #a855f7)`,
                  boxShadow: `0 0 20px ${activeItem?.accentColor || '#00f0ff'}`,
                }}
              />
            </div>
            <div className="brand-text">
              <span className="brand-title">AETHERIA 3D</span>
              <span className="brand-sub">Spatial Visual Engine v3.4</span>
            </div>
          </div>

          <div className="header-status-pill">
            <span className="status-indicator-dot" />
            <span className="status-text">NEURAL RENDER // 60 FPS</span>
          </div>
        </header>

        {/* Hero Spatial Banner */}
        <div className="spatial-hero-title-area">
          <div className="hologram-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span>NEXT-GEN SPATIAL COMPUTING INTERFACE</span>
          </div>

          <h1 className="spatial-main-heading">
            Dimensional <span className="gradient-text">Holographic</span> Carousel
          </h1>

          <p className="spatial-main-desc">
            Interact with reactive 3D perspective transformations, physics-driven gyroscopic parallax,
            and synthesized spatial acoustic feedback in real time.
          </p>
        </div>

        {/* The 3D Spatial Carousel Component */}
        <main className="carousel-main-stage">
          <SpatialCarousel
            items={items}
            categories={categories}
            onActiveItemChange={setActiveItem}
            onAddItem={handleAddItem}
          />
        </main>

        {/* Feature Highlights Grid */}
        <section className="spatial-features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrap" style={{ color: '#00f0ff' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <h3>360° Cylindrical Geometry</h3>
            <p>Calculated dynamic 3D angle trigonometry and depth coordinates with hardware-accelerated transforms.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrap" style={{ color: '#a855f7' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3>Vision Glassmorphism</h3>
            <p>Multi-layered frosted glass with 28px backdrop blur, specular glare highlights, and dynamic accent back-glow.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrap" style={{ color: '#10b981' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l-4 9h6l-2 9" />
              </svg>
            </div>
            <h3>Gyroscopic Tilt & Drag</h3>
            <p>Smooth inertia touch gestures and cursor-responsive 3D parallax tilt for realistic spatial presence.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrap" style={{ color: '#f59e0b' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </div>
            <h3>Web Audio Acoustic Synth</h3>
            <p>Built-in oscillator synthesizer producing instantaneous resonant acoustic clicks and holographic swooshes.</p>
          </div>
        </section>

        {/* Keyboard Shortcuts Navigation Bar */}
        <div className="spatial-shortcuts-pill">
          <span className="shortcuts-title">Keyboard Navigation:</span>
          <div className="shortcut-tag"><kbd>←</kbd> <kbd>→</kbd> Navigate</div>
          <div className="shortcut-tag"><kbd>Space</kbd> Play / Pause</div>
          <div className="shortcut-tag"><kbd>1</kbd>–<kbd>4</kbd> Spatial Modes</div>
          <div className="shortcut-tag"><kbd>Esc</kbd> Close Modal</div>
        </div>

        {/* Futuristic Footer */}
        <footer className="spatial-footer">
          <p>© 2099 Aetheria Spatial UI • Engineered for Modern Immersive Web Experiences</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
