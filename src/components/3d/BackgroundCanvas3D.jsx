import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Model as RobotModel } from './Robot';

function RobotRig({ mousePosition }) {
  const group = useRef();

  useFrame(() => {
    const scrollY = window.scrollY;
    const maxScroll = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

    if (group.current) {
      const targetX = THREE.MathUtils.lerp(1.2, -1.0, progress * 1.5);
      const targetY = THREE.MathUtils.lerp(-1.2, -0.8, progress);
      const targetZ = THREE.MathUtils.lerp(0, 0.4, progress);
      const targetRotY = THREE.MathUtils.lerp(-0.25, 0.5, progress) + (mousePosition.x * 0.15);

      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetX, 0.04);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.04);
      group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetZ, 0.04);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.04);
    }
  });

  return (
    <group ref={group} position={[1.2, -1.2, 0]} rotation={[0, -0.25, 0]}>
      <RobotModel scale={1.8} />
    </group>
  );
}

export default function BackgroundCanvas3D() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <Canvas
        camera={{ position: [0, 0.5, 4.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          {/* Ambient & Studio Lights */}
          <ambientLight intensity={0.8} />

          {/* Primary Key Light */}
          <directionalLight
            position={[5, 8, 5]}
            intensity={2.2}
            color="#ffffff"
          />

          {/* Cyan Signature Rim Light */}
          <spotLight
            position={[-5, 4, -2]}
            intensity={4.5}
            color="#38bdf8"
            angle={0.6}
            penumbra={0.8}
          />

          {/* Purple Accent Fill */}
          <spotLight
            position={[4, -2, 3]}
            intensity={2.8}
            color="#a855f7"
            angle={0.7}
            penumbra={1}
          />

          {/* Top White Fill */}
          <pointLight position={[0, 4, 2]} intensity={2.0} color="#e2e8f0" />

          {/* Subtle ground shadow */}
          <ContactShadows
            position={[0, -2.1, 0]}
            opacity={0.5}
            scale={7}
            blur={2.5}
            far={3.5}
            color="#1e293b"
          />

          <RobotRig mousePosition={mouse} />
        </Suspense>
      </Canvas>
    </div>
  );
}
