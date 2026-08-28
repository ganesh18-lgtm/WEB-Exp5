import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './SpatialCarousel.css';

// Audio feedback synthesizer using Web Audio API
class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSwitchSound(pitch = 580) {
    try {
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.8, now + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Audio autoplay policy or unavailable
    }
  }

  playModalSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(740, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio ignored
    }
  }
}

const audioEngine = new SpatialAudioEngine();

export default function SpatialCarousel({
  items,
  categories,
  onActiveItemChange,
  onAddItem
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState('ring'); // 'ring' | 'coverflow' | 'stack' | 'vortex'
  const [isPlaying, setIsPlaying] = useState(true);
  const [playSpeed, setPlaySpeed] = useState(4500); // ms per slide
  const [progress, setProgress] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [likes, setLikes] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New slide form state
  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    category: 'Cyberpunk',
    image: '',
    description: '',
    accentColor: '#00f0ff',
    author: 'Self Creator',
    location: 'User Space',
  });

  // Drag physics state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentDragDelta = useRef(0);
  const dragDistanceRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const carouselContainerRef = useRef(null);

  // Filter items
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return items;
    return items.filter((item) => item.category === selectedCategory);
  }, [items, selectedCategory]);

  const itemCount = filteredItems.length;
  // Derive safe index
  const safeActiveIndex = filteredItems.length > 0 && activeIndex >= filteredItems.length ? 0 : activeIndex;
  const currentSlide = filteredItems[safeActiveIndex] || filteredItems[0] || null;

  // Sync active slide color to parent
  useEffect(() => {
    if (currentSlide && onActiveItemChange) {
      onActiveItemChange(currentSlide);
    }
  }, [currentSlide, onActiveItemChange]);

  // Navigation handlers
  const goToNext = useCallback(() => {
    if (itemCount === 0) return;
    setActiveIndex((prev) => (prev + 1) % itemCount);
    setProgress(0);
    if (soundEnabled) audioEngine.playSwitchSound(620);
  }, [itemCount, soundEnabled]);

  const goToPrev = useCallback(() => {
    if (itemCount === 0) return;
    setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
    setProgress(0);
    if (soundEnabled) audioEngine.playSwitchSound(480);
  }, [itemCount, soundEnabled]);

  const goToIndex = useCallback((index) => {
    setActiveIndex(index);
    setProgress(0);
    if (soundEnabled) audioEngine.playSwitchSound(540);
  }, [soundEnabled]);

  // Autoplay timer with precise progress ticker
  useEffect(() => {
    if (!isPlaying || isHovered || isDragging.current || itemCount <= 1) {
      return;
    }

    const intervalStep = 50; // ms
    const stepRatio = (intervalStep / playSpeed) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + stepRatio;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isPlaying, isHovered, playSpeed, goToNext, itemCount]);

  // Mouse Parallax Tilt
  const handleMouseMove = (e) => {
    if (!carouselContainerRef.current) return;
    const rect = carouselContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2; // -1 to 1
    setTilt({
      x: x * 12, // max 12 deg tilt
      y: -y * 8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedItem || isAddModalOpen) {
        if (e.key === 'Escape') {
          setSelectedItem(null);
          setIsAddModalOpen(false);
        }
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        goToPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === '1') {
        setViewMode('ring');
      } else if (e.key === '2') {
        setViewMode('coverflow');
      } else if (e.key === '3') {
        setViewMode('stack');
      } else if (e.key === '4') {
        setViewMode('vortex');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, selectedItem, isAddModalOpen]);

  // Drag / Swipe handlers
  const handleDragStart = (clientX) => {
    isDragging.current = true;
    startX.current = clientX;
    dragDistanceRef.current = 0;
    currentDragDelta.current = 0;
  };

  const handleDragMove = (clientX) => {
    if (!isDragging.current) return;
    const delta = clientX - startX.current;
    currentDragDelta.current = delta;
    dragDistanceRef.current = Math.abs(delta);
    setDragOffset(delta);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = 60; // minimum drag distance in px
    if (currentDragDelta.current < -threshold) {
      goToNext();
    } else if (currentDragDelta.current > threshold) {
      goToPrev();
    }
    setDragOffset(0);
  };

  // Like card handler
  const handleLike = (id, e) => {
    if (e) e.stopPropagation();
    setLikes((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
    if (soundEnabled) audioEngine.playSwitchSound(880);
  };

  // Open modal handler
  const handleOpenDetail = (item) => {
    setSelectedItem(item);
    if (soundEnabled) audioEngine.playModalSound();
  };

  // Add custom slide submission
  const handleAddSlideSubmit = (e) => {
    e.preventDefault();
    if (!newSlide.image || !newSlide.title) return;

    const createdItem = {
      id: `custom-${Date.now()}`,
      title: newSlide.title,
      subtitle: newSlide.subtitle || 'User Spatial Creation',
      category: newSlide.category || 'Cyberpunk',
      image: newSlide.image,
      description: newSlide.description || 'A custom synthesized visual uploaded directly into the spatial environment.',
      accentColor: newSlide.accentColor || '#00f0ff',
      glowColor: `${newSlide.accentColor}70`,
      author: newSlide.author || 'Spatial Creator',
      location: newSlide.location || 'Local Dimension',
      date: 'Synthesized Now',
      stats: { depth: '620m', resonance: '99.9%', field: 'Hyper-Spatial' },
      tags: [newSlide.category, 'Spatial', 'Custom']
    };

    onAddItem(createdItem);
    setIsAddModalOpen(false);
    setNewSlide({
      title: '',
      subtitle: '',
      category: 'Cyberpunk',
      image: '',
      description: '',
      accentColor: '#00f0ff',
      author: 'Self Creator',
      location: 'User Space',
    });
    if (soundEnabled) audioEngine.playModalSound();
  };

  // Calculate 3D card style according to view mode
  const getCardStyle = (index) => {
    if (itemCount === 0) return {};

    const diff = (index - safeActiveIndex + itemCount) % itemCount;
    // Normalize diff to shortest distance around circular ring (-itemCount/2 to itemCount/2)
    let signedDiff = diff;
    if (signedDiff > itemCount / 2) {
      signedDiff -= itemCount;
    }

    // Include drag dynamic angle offset
    const dragAngleOffset = dragOffset * 0.15;

    if (viewMode === 'ring') {
      // 360-degree cylindrical calculation
      const anglePerCard = 360 / Math.max(itemCount, 5);
      const angle = signedDiff * anglePerCard + dragAngleOffset;
      const radius = Math.min(window.innerWidth > 900 ? 540 : 340, 560);
      const isCenter = signedDiff === 0;

      return {
        transform: `rotateY(${angle}deg) translateZ(${radius}px) scale(${isCenter ? 1.05 : 0.88})`,
        opacity: Math.abs(signedDiff) > 2.5 ? (Math.abs(signedDiff) > 3.5 ? 0 : 0.25) : 1,
        zIndex: Math.round(100 - Math.abs(signedDiff) * 15),
        filter: isCenter ? 'brightness(1.08) drop-shadow(0 20px 35px rgba(0,0,0,0.6))' : 'brightness(0.65) blur(1.5px)',
        pointerEvents: Math.abs(signedDiff) > 2 ? 'none' : 'auto',
      };
    }

    if (viewMode === 'coverflow') {
      const isCenter = signedDiff === 0;
      const distance = Math.abs(signedDiff);
      const spacing = window.innerWidth > 900 ? 230 : 140;
      const translateX = signedDiff * spacing + dragOffset * 0.8;
      const translateZ = isCenter ? 140 : -distance * 160;
      const rotateY = isCenter ? 0 : signedDiff > 0 ? -48 : 48;
      const scale = isCenter ? 1.08 : Math.max(0.72, 1 - distance * 0.14);

      return {
        transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
        opacity: distance > 3 ? 0 : Math.max(0.2, 1 - distance * 0.25),
        zIndex: Math.round(100 - distance * 10),
        filter: isCenter ? 'brightness(1.05)' : `brightness(${0.7 - distance * 0.1}) blur(${distance * 1.2}px)`,
        pointerEvents: distance > 2 ? 'none' : 'auto',
      };
    }

    if (viewMode === 'stack') {
      const isCenter = signedDiff === 0;
      // Stack only cards in front and immediate followers
      if (signedDiff < 0 || signedDiff > 4) {
        return {
          transform: `translateY(60px) translateZ(-600px) scale(0.6)`,
          opacity: 0,
          zIndex: 0,
          pointerEvents: 'none',
        };
      }

      const translateY = signedDiff * 24;
      const translateZ = -signedDiff * 130 + (isCenter ? 40 : 0);
      const scale = 1 - signedDiff * 0.08;
      const rotateX = signedDiff * 4;

      return {
        transform: `translateX(${dragOffset * 0.6}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) scale(${scale})`,
        opacity: 1 - signedDiff * 0.2,
        zIndex: 50 - signedDiff,
        filter: isCenter ? 'brightness(1.05)' : `brightness(${0.8 - signedDiff * 0.15})`,
      };
    }

    if (viewMode === 'vortex') {
      const isCenter = signedDiff === 0;
      const distance = Math.abs(signedDiff);
      const angle = signedDiff * 45 + dragAngleOffset;
      const translateZ = -distance * 220 + (isCenter ? 100 : 0);
      const rotateZ = signedDiff * 14;

      return {
        transform: `rotateZ(${rotateZ}deg) rotateY(${angle * 0.5}deg) translateZ(${translateZ}px) scale(${isCenter ? 1.05 : 0.82})`,
        opacity: distance > 3 ? 0 : 1 - distance * 0.25,
        zIndex: 100 - distance * 15,
        filter: isCenter ? 'brightness(1.1)' : `brightness(${0.75 - distance * 0.15}) blur(${distance * 2}px)`,
      };
    }

    return {};
  };

  return (
    <div className="spatial-carousel-root">
      {/* Top Holographic Navigation & Mode Filter Pill */}
      <div className="spatial-top-bar">
        {/* Category Selection Tabs */}
        <div className="spatial-category-tabs" role="tablist">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveIndex(0);
                setProgress(0);
                if (soundEnabled) audioEngine.playSwitchSound(700);
              }}
            >
              <span>{cat}</span>
              {selectedCategory === cat && (
                <div
                  className="active-pill-glow"
                  style={{ background: currentSlide ? currentSlide.accentColor : '#00f0ff' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* View Mode & Sound Toggles */}
        <div className="spatial-view-mode-selector">
          <div className="view-mode-group" title="Select 3D Spatial Geometry">
            <button
              className={`mode-btn ${viewMode === 'ring' ? 'active' : ''}`}
              onClick={() => setViewMode('ring')}
              title="360° Cylindrical Ring"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>Ring 360°</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'coverflow' ? 'active' : ''}`}
              onClick={() => setViewMode('coverflow')}
              title="Spatial Vision Coverflow"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="7" y="4" width="10" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="3" y1="7" x2="3" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="7" x2="21" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Coverflow</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'stack' ? 'active' : ''}`}
              onClick={() => setViewMode('stack')}
              title="Spatial Quantum Deck"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="5" y="8" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M7 5h10M9 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Deck</span>
            </button>
            <button
              className={`mode-btn ${viewMode === 'vortex' ? 'active' : ''}`}
              onClick={() => setViewMode('vortex')}
              title="Depth Vortex Tunnel"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span>Vortex</span>
            </button>
          </div>

          {/* Sound & Add Slide buttons */}
          <button
            className={`spatial-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? 'Mute Spatial Audio' : 'Enable Spatial Audio'}
          >
            {soundEnabled ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            )}
          </button>

          <button
            className="spatial-icon-btn add-btn"
            onClick={() => setIsAddModalOpen(true)}
            title="Inject Custom 3D Slide"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="add-btn-text">Add Slide</span>
          </button>
        </div>
      </div>

      {/* Main 3D Spatial Carousel Viewport */}
      <div
        className="spatial-stage-viewport"
        ref={carouselContainerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMoveCapture={(e) => isDragging.current && handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        {/* Spatial Stage with Dynamic Parallax Gyroscope */}
        <div
          className={`spatial-stage ${viewMode}`}
          style={{
            transform: `perspective(1300px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
          }}
        >
          {filteredItems.map((item, index) => {
            const isCurrent = index === safeActiveIndex;
            const cardStyle = getCardStyle(index);

            return (
              <div
                key={item.id}
                className={`spatial-card ${isCurrent ? 'is-active' : ''}`}
                style={{
                  ...cardStyle,
                  '--card-accent': item.accentColor,
                  '--card-glow': item.glowColor || `${item.accentColor}66`,
                }}
                onClick={() => {
                  if (dragDistanceRef.current > 10) return; // Prevent click if user dragged
                  if (isCurrent) {
                    handleOpenDetail(item);
                  } else {
                    goToIndex(index);
                  }
                }}
              >
                {/* 3D Frosted Glass Card Container */}
                <div className="card-glass-frame">
                  {/* Holographic Specular Glare */}
                  <div className="card-specular-glare" />

                  {/* Top Badge: Category & Resolution Index */}
                  <div className="card-header-badge">
                    <span className="category-tag">{item.category}</span>
                    <span className="dimension-tag">3D SPATIAL #{index + 1}</span>
                  </div>

                  {/* Card Image with Depth Layer */}
                  <div className="card-image-wrap">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="card-media"
                      loading="lazy"
                      draggable={false}
                    />
                    <div className="card-image-gradient" />
                  </div>

                  {/* Card Content Footer */}
                  <div className="card-footer-info">
                    <div className="card-title-group">
                      <h3 className="card-title">{item.title}</h3>
                      <p className="card-subtitle">{item.subtitle}</p>
                    </div>

                    <div className="card-action-row">
                      <div className="card-stats-preview">
                        <span className="stats-pill">
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="12 6 12 12 16 14" />
                          </svg>
                          {item.stats?.depth || 'Depth 3D'}
                        </span>
                      </div>

                      <div className="card-quick-actions">
                        <button
                          className={`card-like-btn ${likes[item.id] ? 'liked' : ''}`}
                          onClick={(e) => handleLike(item.id, e)}
                          title="Like Hologram"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill={likes[item.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{likes[item.id] || 24 + index * 7}</span>
                        </button>

                        <button
                          className="card-inspect-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(item);
                          }}
                          title="Inspect in Full Spatial Hologram"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Glowing Border Edge */}
                  <div className="card-glow-border" />
                </div>

                {/* Ground Mirror Reflection (For coverflow and ring modes) */}
                <div className="card-reflection" aria-hidden="true">
                  <img src={item.image} alt="" draggable={false} />
                  <div className="reflection-fade" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Side Nav Controls */}
        <button
          className="spatial-nav-arrow prev"
          onClick={goToPrev}
          aria-label="Previous Slide"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          className="spatial-nav-arrow next"
          onClick={goToNext}
          aria-label="Next Slide"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Floating Bottom HUD Controller & Meta Details */}
      {currentSlide && (
        <div className="spatial-hud-wrapper">
          <div className="spatial-hud-pill">
            {/* Play / Pause Toggle with Radial Timer Ring */}
            <div className="hud-play-control">
              <button
                className="hud-play-btn"
                onClick={() => setIsPlaying((p) => !p)}
                title={isPlaying ? 'Pause Autoplay' : 'Start Autoplay'}
              >
                {/* SVG Progress Ring */}
                <svg className="progress-ring" viewBox="0 0 44 44" width="44" height="44">
                  <circle
                    className="progress-ring-bg"
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="2.5"
                  />
                  <circle
                    className="progress-ring-circle"
                    cx="22"
                    cy="22"
                    r="18"
                    fill="none"
                    stroke={currentSlide.accentColor}
                    strokeWidth="2.5"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 * (1 - progress / 100)}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="play-icon-inner">
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <rect x="6" y="5" width="4" height="14" rx="1" />
                      <rect x="14" y="5" width="4" height="14" rx="1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {/* Slide Index Counter & Info */}
            <div className="hud-info-section">
              <div className="hud-slide-index">
                <span className="current-num">{String(safeActiveIndex + 1).padStart(2, '0')}</span>
                <span className="divider">/</span>
                <span className="total-num">{String(itemCount).padStart(2, '0')}</span>
              </div>
              <div className="hud-meta-text">
                <span className="hud-title">{currentSlide.title}</span>
                <span className="hud-location">{currentSlide.location}</span>
              </div>
            </div>

            {/* Pagination Holographic Dots */}
            <div className="hud-dots-bar">
              {filteredItems.map((_, i) => (
                <button
                  key={i}
                  className={`hud-dot ${i === safeActiveIndex ? 'active' : ''}`}
                  onClick={() => goToIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  style={{
                    backgroundColor: i === safeActiveIndex ? currentSlide.accentColor : undefined,
                    boxShadow: i === safeActiveIndex ? `0 0 10px ${currentSlide.accentColor}` : undefined,
                  }}
                />
              ))}
            </div>

            {/* Speed Selector */}
            <div className="hud-speed-selector">
              <button
                className={`speed-tag ${playSpeed === 6000 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(6000)}
                title="Slow Rotation"
              >
                0.5x
              </button>
              <button
                className={`speed-tag ${playSpeed === 4500 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(4500)}
                title="Standard Rotation"
              >
                1.0x
              </button>
              <button
                className={`speed-tag ${playSpeed === 2800 ? 'active' : ''}`}
                onClick={() => setPlaySpeed(2800)}
                title="Fast Rotation"
              >
                1.5x
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Holographic Detail Modal Lightbox */}
      {selectedItem && (
        <div className="spatial-modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div
            className="spatial-modal-card"
            style={{
              '--modal-accent': selectedItem.accentColor,
              '--modal-glow': selectedItem.glowColor,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              className="modal-close-btn"
              onClick={() => setSelectedItem(null)}
              title="Close Hologram View (Esc)"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="modal-inner-grid">
              {/* Media Section */}
              <div className="modal-media-col">
                <div className="modal-image-wrap">
                  <img src={selectedItem.image} alt={selectedItem.title} className="modal-media" />
                  <div className="modal-image-overlay" />
                  <div className="modal-lens-flare" />
                </div>
              </div>

              {/* Data & Specs Section */}
              <div className="modal-content-col">
                <div className="modal-header-meta">
                  <span className="modal-category-badge">{selectedItem.category}</span>
                  <span className="modal-date-badge">{selectedItem.date}</span>
                </div>

                <h2 className="modal-title">{selectedItem.title}</h2>
                <h4 className="modal-subtitle">{selectedItem.subtitle}</h4>

                <p className="modal-description">{selectedItem.description}</p>

                {/* Technical Specs HUD */}
                <div className="modal-specs-grid">
                  <div className="spec-card">
                    <span className="spec-label">Spatial Depth</span>
                    <span className="spec-val">{selectedItem.stats?.depth || '1200m'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Quantum Resonance</span>
                    <span className="spec-val">{selectedItem.stats?.resonance || '99.4%'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Chroma Field</span>
                    <span className="spec-val">{selectedItem.stats?.field || 'Matrix-Dense'}</span>
                  </div>
                  <div className="spec-card">
                    <span className="spec-label">Spatial Vector</span>
                    <span className="spec-val">{selectedItem.location || 'Deep Field'}</span>
                  </div>
                </div>

                {/* Tag Clouds */}
                <div className="modal-tags-row">
                  {selectedItem.tags?.map((t, idx) => (
                    <span key={idx} className="modal-tag-chip">#{t}</span>
                  ))}
                </div>

                {/* Author & Action buttons */}
                <div className="modal-footer-row">
                  <div className="modal-author-info">
                    <span className="author-label">Synthesized by</span>
                    <span className="author-name">{selectedItem.author}</span>
                  </div>

                  <div className="modal-action-buttons">
                    <button
                      className="modal-like-btn"
                      onClick={() => handleLike(selectedItem.id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={likes[selectedItem.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span>{likes[selectedItem.id] || 24} Likes</span>
                    </button>

                    <a
                      href={selectedItem.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal-raw-btn"
                    >
                      <span>Full Resolution</span>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom 3D Slide Modal */}
      {isAddModalOpen && (
        <div className="spatial-modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="spatial-modal-card add-slide-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="add-slide-form-wrap">
              <h2 className="add-modal-title">Inject New 3D Spatial Slide</h2>
              <p className="add-modal-subtitle">Add your custom image asset into the holographic environment.</p>

              <form onSubmit={handleAddSlideSubmit} className="add-slide-form">
                <div className="form-group">
                  <label>Image URL (Direct link or Unsplash)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newSlide.image}
                    onChange={(e) => setNewSlide({ ...newSlide, image: e.target.value })}
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Prism Horizon Zero"
                      value={newSlide.title}
                      onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Subtitle</label>
                    <input
                      type="text"
                      placeholder="e.g. Sub-Atomic Singularity"
                      value={newSlide.subtitle}
                      onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={newSlide.category}
                      onChange={(e) => setNewSlide({ ...newSlide, category: e.target.value })}
                    >
                      {categories.filter((c) => c !== 'All').map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Accent Neon Color</label>
                    <div className="color-picker-row">
                      {['#00f0ff', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#38bdf8'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`color-swatch ${newSlide.accentColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewSlide({ ...newSlide, accentColor: color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    rows="3"
                    placeholder="Enter spatial narrative or visual details..."
                    value={newSlide.description}
                    onChange={(e) => setNewSlide({ ...newSlide, description: e.target.value })}
                  />
                </div>

                {/* Live Preview of Image */}
                {newSlide.image && (
                  <div className="image-preview-box">
                    <span>Asset Preview</span>
                    <img
                      src={newSlide.image}
                      alt="Preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}

                <div className="form-submit-row">
                  <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    <span>Synthesize Slide</span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
