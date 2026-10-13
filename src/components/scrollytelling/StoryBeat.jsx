"use client";

import React, { useLayoutEffect, useRef } from 'react';

/**
 * Editorial StoryBeat - Fluid Crossfade & Snappy Expo-Out Transition
 * Smoothly interpolates with zero blank gaps between consecutive spec beats.
 *
 * The card's enter/exit transitions are CSS transitions (GenesisLanding.css, "Story beat
 * transitions") with the same poses, durations, easing and item stagger as the framer-motion
 * variants they replace. framer-motion animated the card and each of its items from JavaScript
 * on every frame and mounted/unmounted the card on every beat change, right while the canvas
 * behind it needed the main thread to draw the sequence; the compositor runs these instead.
 *
 * The card's state classes: .is-visible (shown / entering), .is-leaving (exit transition
 * running), neither (hidden, waiting in the enter pose). Transitions start from the current
 * values, so a transition that is reversed halfway turns around smoothly.
 *
 * aria-hidden on inactive cards is set here too rather than in the markup: the prerendered page
 * must expose every card, because without JavaScript all five are shown (GenesisLanding.css,
 * "Without JavaScript"), and hydration does not patch attributes that differ from the server's.
 */
export default function StoryBeat({ visible, align = 'left', id, children, className = '' }) {
  const alignClass = `beat-${align}`;
  const cardRef = useRef(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (visible) card.removeAttribute('aria-hidden');
    else card.setAttribute('aria-hidden', 'true');
    if (visible) {
      if (!card.classList.contains('is-leaving')) {
        // Coming from the hidden enter pose (also on mount): commit that pose first so the
        // transition starts from it.
        void card.offsetWidth;
      }
      card.classList.remove('is-leaving');
      card.classList.add('is-visible');
    } else if (card.classList.contains('is-visible')) {
      card.classList.remove('is-visible');
      card.classList.add('is-leaving');
    }
  }, [visible]);

  // Once the exit has finished, park the card in the enter pose for next time.
  const handleTransitionEnd = (e) => {
    const card = cardRef.current;
    if (e.target === card && e.propertyName === 'opacity' && card.classList.contains('is-leaving')) {
      card.classList.remove('is-leaving');
    }
  };

  return (
    <div
      id={id}
      className={`story-beat ${alignClass} ${visible ? 'story-beat--visible' : ''}`}
      style={{
        pointerEvents: visible ? 'auto' : 'none',
        position: 'absolute',
        top: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        zIndex: 20,
      }}
    >
      <div
        ref={cardRef}
        className={`beat-editorial-container ${className}`}
        onTransitionEnd={handleTransitionEnd}
      >
        {children}
      </div>
    </div>
  );
}
