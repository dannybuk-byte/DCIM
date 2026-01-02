/**
 * Interactive Carousel Component
 * Supports auto-rotation, manual navigation, drag gestures, and thumbnails
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Maximize2 } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface CarouselItem {
  id: string;
  content: React.ReactNode;
  title?: string;
  description?: string;
  thumbnail?: React.ReactNode;
}

interface InteractiveCarouselProps {
  items: CarouselItem[];
  autoRotate?: boolean;
  rotationInterval?: number; // milliseconds
  showThumbnails?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
  onItemChange?: (index: number) => void;
  className?: string;
  height?: string;
}

export const InteractiveCarousel = memo(function InteractiveCarousel({
  items,
  autoRotate = false,
  rotationInterval = 5000,
  showThumbnails = true,
  showControls = true,
  showProgress = true,
  onItemChange,
  className = '',
  height = '500px'
}: InteractiveCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoRotate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rotationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Navigate to specific index with animation
  const goToIndex = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, items.length - 1));
    setCurrentIndex(newIndex);
    setProgress(0);
    onItemChange?.(newIndex);
  }, [items.length, onItemChange]);

  // Navigate previous/next
  const goToPrevious = useCallback(() => {
    goToIndex(currentIndex - 1);
  }, [currentIndex, goToIndex]);

  const goToNext = useCallback(() => {
    goToIndex((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, goToIndex]);

  // Auto-rotation logic
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    // Progress bar animation
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 0;
        }
        return prev + (100 / (rotationInterval / 100));
      });
    }, 100);

    // Auto-advance
    rotationTimeoutRef.current = setTimeout(() => {
      goToNext();
    }, rotationInterval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (rotationTimeoutRef.current) clearTimeout(rotationTimeoutRef.current);
    };
  }, [currentIndex, isPaused, rotationInterval, items.length, goToNext]);

  // Drag gesture handling
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    setIsPaused(true);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStart;
    setDragOffset(offset);
  }, [isDragging, dragStart]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    // If dragged more than 50px, navigate
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
    setIsPaused(autoRotate);
  }, [isDragging, dragOffset, goToPrevious, goToNext, autoRotate]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!carouselRef.current) return;

    if (!isFullscreen) {
      if (carouselRef.current.requestFullscreen) {
        carouselRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  if (items.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-400">
        No items to display
      </div>
    );
  }

  return (
    <div
      ref={carouselRef}
      className={`relative bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Main Content Area */}
      <div
        className="relative h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Current Item */}
        <div className="h-full w-full flex items-center justify-center p-6">
          <div className="w-full h-full overflow-auto custom-scrollbar">
            {items[currentIndex].content}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {showProgress && !isPaused && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Navigation Controls */}
      {showControls && items.length > 1 && (
        <>
          {/* Previous Button */}
          <Tooltip content="Previous (←)">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
              aria-label="Previous item"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          </Tooltip>

          {/* Next Button */}
          <Tooltip content="Next (→)">
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
              aria-label="Next item"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </Tooltip>

          {/* Control Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            {/* Play/Pause */}
            {autoRotate && (
              <Tooltip content={isPaused ? 'Play (Space)' : 'Pause (Space)'}>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all duration-200"
                  aria-label={isPaused ? 'Play' : 'Pause'}
                >
                  {isPaused ? (
                    <Play className="w-4 h-4 text-white" />
                  ) : (
                    <Pause className="w-4 h-4 text-white" />
                  )}
                </button>
              </Tooltip>
            )}

            {/* Item Counter */}
            <span className="text-white text-sm font-medium px-2">
              {currentIndex + 1} / {items.length}
            </span>

            {/* Fullscreen */}
            <Tooltip content="Fullscreen">
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-full transition-all duration-200"
                aria-label="Toggle fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </Tooltip>
          </div>
        </>
      )}

      {/* Thumbnails */}
      {showThumbnails && items.length > 1 && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 max-h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
          {items.map((item, index) => (
            <Tooltip key={item.id} content={item.title || `Item ${index + 1}`}>
              <button
                onClick={() => goToIndex(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110 ${
                  index === currentIndex
                    ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                aria-label={`Go to ${item.title || `item ${index + 1}`}`}
              >
                {item.thumbnail || (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </div>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Dot Indicators (alternative to thumbnails) */}
      {!showThumbnails && items.length > 1 && items.length <= 10 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => goToIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-cyan-500 scale-125'
                  : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to item ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Item Title/Description Overlay */}
      {(items[currentIndex].title || items[currentIndex].description) && (
        <div className="absolute top-4 left-4 max-w-md bg-black/50 backdrop-blur-sm rounded-lg p-4">
          {items[currentIndex].title && (
            <h3 className="text-lg font-bold text-white mb-1">
              {items[currentIndex].title}
            </h3>
          )}
          {items[currentIndex].description && (
            <p className="text-sm text-gray-300">
              {items[currentIndex].description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

