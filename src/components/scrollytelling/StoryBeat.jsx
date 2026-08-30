"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Editorial StoryBeat — Fluid Crossfade & Snappy Expo-Out Transition
 * Smoothly interpolates with zero blank gaps between consecutive spec beats.
 */

const containerVariants = {
  hidden: { 
    opacity: 0, 
    y: 22, 
    scale: 0.98,
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.42,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.98,
    filter: 'blur(6px)',
    transition: { 
      duration: 0.28, 
      ease: [0.16, 1, 0.3, 1] 
    },
  },
};

export const beatItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export default function StoryBeat({ visible, align = 'left', id, children, className = '' }) {
  const alignClass = `beat-${align}`;

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
        alignItems: 'center',
        zIndex: 20,
      }}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key={id || 'beat-editorial'}
            className={`beat-editorial-container ${className}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}