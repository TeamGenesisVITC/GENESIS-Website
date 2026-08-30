import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * High-Performance Hardware Video Scrollytelling Engine
 * - Non-blocking seek queue with `video.seeking` backpressure control
 * - Continuous exponential spring deceleration
 * - Seamless stopping without decoder freeze or frame drops
 * - Native 60fps GPU acceleration
 */
export default function ScrollVideo({ targetProgressRef }) {
  const videoRef = useRef(null);
  const currentTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Metadata ready
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration || 1;
    setDuration(dur);
    setIsReady(true);
    video.currentTime = 0.001;
  }, []);

  // Self-regulating video seek handler
  const requestSeek = useCallback((targetTime) => {
    const video = videoRef.current;
    if (!video || !video.duration || isSeekingRef.current) return;

    const clampedTime = Math.max(0, Math.min(video.duration - 0.02, targetTime));

    if (Math.abs(video.currentTime - clampedTime) > 0.015) {
      isSeekingRef.current = true;
      if ('fastSeek' in video) {
        try {
          video.fastSeek(clampedTime);
        } catch {
          video.currentTime = clampedTime;
        }
      } else {
        video.currentTime = clampedTime;
      }
    }
  }, []);

  // Listen to 'seeked' event to release lock and process next queued frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleSeeked = () => {
      isSeekingRef.current = false;
      // If the target has moved while seeking, immediately catch up
      if (duration > 0) {
        const targetTime = (targetProgressRef.current || 0) * duration;
        if (Math.abs(video.currentTime - targetTime) > 0.02) {
          requestSeek(currentTimeRef.current);
        }
      }
    };

    video.addEventListener('seeked', handleSeeked);
    return () => video.removeEventListener('seeked', handleSeeked);
  }, [duration, targetProgressRef, requestSeek]);

  // CONTINUOUS 60/120Hz SMOOTH MOMENTUM DECORRELATION & DAMPING
  useEffect(() => {
    if (!isReady || duration <= 0) return;

    let animId;
    let lastTime = performance.now();

    const renderLoop = (now) => {
      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;

      const progress = targetProgressRef.current || 0;
      const targetTime = progress * duration;
      const diff = targetTime - currentTimeRef.current;

      // Exponential damping factor (smooth cinematic deceleration)
      const smoothingFactor = 1 - Math.exp(-14 * dt);

      if (Math.abs(diff) > 0.005) {
        currentTimeRef.current += diff * smoothingFactor;
        requestSeek(currentTimeRef.current);
      } else if (Math.abs(diff) > 0) {
        currentTimeRef.current = targetTime;
        requestSeek(targetTime);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [isReady, duration, targetProgressRef, requestSeek]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#050505',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <video
        ref={videoRef}
        src="/robot.mov"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        style={{
          width: '100vw',
          height: '100vh',
          objectFit: 'contain',
          display: 'block',
          background: '#050505',
          pointerEvents: 'none',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        <source src="/robot.mov" type="video/quicktime" />
        <source src="/My%20Movie.MOV" type="video/quicktime" />
      </video>
    </div>
  );
}
