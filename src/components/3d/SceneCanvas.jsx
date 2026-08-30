import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, ContactShadows } from '@react-three/drei';
import RobotTelemetryRig from './RobotTelemetryRig';

/**
 * SceneCanvas
 * Fixed full-viewport WebGL container hosting 3D humanoid and synchronized scroll layout.
 */
export default function SceneCanvas({
  children,
  onTelemetryUpdate,
  wireframe = false,
  highlightSubsystem = null,
}) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
      <Canvas
        camera={{ position: [0, 0.4, 4.5], fov: 42 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        {/* Studio Lighting Environment */}
        <ambientLight intensity={0.4} />
        
        {/* Key Lighting */}
        <directionalLight
          position={[5, 6, 4]}
          intensity={1.8}
          color="#ffffff"
        />

        {/* Rim / Back Accent (Electric Cyan) */}
        <spotLight
          position={[-6, 4, -4]}
          intensity={3.5}
          color="#00f0ff"
          angle={0.6}
          penumbra={0.8}
        />

        {/* Fill Accent (Neon Purple) */}
        <spotLight
          position={[4, -2, 2]}
          intensity={2.2}
          color="#9333ea"
          angle={0.8}
          penumbra={1}
        />

        {/* Subtle ground reflection & ambient shadow */}
        <ContactShadows
          position={[0, -2.2, 0]}
          opacity={0.6}
          scale={8}
          blur={2.4}
          far={4}
          color="#00f0ff"
        />

        <Suspense fallback={null}>
          <ScrollControls pages={4.5} damping={0.25} distance={1.2}>
            {/* 3D Model Telemetry Rig */}
            <RobotTelemetryRig
              onTelemetryUpdate={onTelemetryUpdate}
              wireframe={wireframe}
              highlightSubsystem={highlightSubsystem}
            />

            {/* DOM Content Overlay Layer */}
            <Scroll html style={{ width: '100vw' }}>
              {children}
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
