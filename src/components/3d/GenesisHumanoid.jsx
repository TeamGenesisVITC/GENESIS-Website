import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * GenesisRobot3D
 * High-definition 3D humanoid robot model with metallic plating,
 * purple neon glow accents, glowing chest core, and articulated joints.
 */
export default function GenesisRobot3D({ mousePosition = { x: 0, y: 0 } }) {
  const robotGroup = useRef();
  const headRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const coreRef = useRef();

  // Premium PBR Materials with Genesis Purple Aesthetic
  const materials = useMemo(() => ({
    bodyDark: new THREE.MeshStandardMaterial({
      color: '#1a1829',
      metalness: 0.85,
      roughness: 0.25,
    }),
    bodySilver: new THREE.MeshStandardMaterial({
      color: '#d1d5db',
      metalness: 0.95,
      roughness: 0.15,
    }),
    carbonFiber: new THREE.MeshStandardMaterial({
      color: '#110f1c',
      metalness: 0.5,
      roughness: 0.5,
    }),
    jointGold: new THREE.MeshStandardMaterial({
      color: '#e5c07b',
      metalness: 0.9,
      roughness: 0.2,
    }),
    purpleGlow: new THREE.MeshStandardMaterial({
      color: '#c084fc',
      emissive: '#a855f7',
      emissiveIntensity: 3,
      toneMapped: false,
    }),
    cyanGlow: new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#00f0ff',
      emissiveIntensity: 2.5,
      toneMapped: false,
    }),
    glassVisor: new THREE.MeshPhysicalMaterial({
      color: '#1e1b4b',
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    }),
  }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Idle breathing & micro-levitation
    if (robotGroup.current) {
      robotGroup.current.position.y = Math.sin(t * 1.5) * 0.05 - 0.2;
    }

    // Head tracking mouse
    if (headRef.current) {
      const targetHeadY = mousePosition.x * 0.4;
      const targetHeadX = -mousePosition.y * 0.25;
      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetHeadY, 0.05);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetHeadX, 0.05);
    }

    // Gentle arm sway
    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(t * 1.2) * 0.08;
      rightArmRef.current.rotation.x = -Math.sin(t * 1.2) * 0.08;
    }

    // Core pulsation
    if (coreRef.current) {
      materials.purpleGlow.emissiveIntensity = 2.5 + Math.sin(t * 3) * 1.2;
    }
  });

  return (
    <group ref={robotGroup} scale={1.25}>
      {/* ─── HEAD ASSEMBLY ─── */}
      <group ref={headRef} position={[0, 1.85, 0]}>
        {/* Main Cranium Helmet */}
        <mesh material={materials.bodyDark}>
          <boxGeometry args={[0.38, 0.42, 0.42]} />
        </mesh>
        {/* Silver Crown Plate */}
        <mesh position={[0, 0.14, 0]} material={materials.bodySilver}>
          <boxGeometry args={[0.34, 0.18, 0.44]} />
        </mesh>
        {/* Purple Glowing Visor */}
        <mesh position={[0, 0.03, 0.22]} material={materials.purpleGlow}>
          <boxGeometry args={[0.32, 0.07, 0.02]} />
        </mesh>
        {/* Carbon Cheek Guards */}
        <mesh position={[-0.18, -0.06, 0.12]} material={materials.carbonFiber}>
          <boxGeometry args={[0.06, 0.22, 0.22]} />
        </mesh>
        <mesh position={[0.18, -0.06, 0.12]} material={materials.carbonFiber}>
          <boxGeometry args={[0.06, 0.22, 0.22]} />
        </mesh>
        {/* Neck Actuator */}
        <mesh position={[0, -0.26, 0]} material={materials.jointGold}>
          <cylinderGeometry args={[0.09, 0.1, 0.12, 16]} />
        </mesh>
      </group>

      {/* ─── CHEST & GENESIS CORE ─── */}
      <group position={[0, 1.15, 0]}>
        {/* Torso Shell */}
        <mesh material={materials.bodyDark}>
          <boxGeometry args={[0.86, 0.68, 0.48]} />
        </mesh>
        {/* Silver Shoulder Clavicle Plates */}
        <mesh position={[0, 0.28, 0.05]} material={materials.bodySilver}>
          <boxGeometry args={[0.92, 0.14, 0.42]} />
        </mesh>
        {/* Carbon Breastplate */}
        <mesh position={[-0.22, 0.06, 0.25]} material={materials.carbonFiber}>
          <boxGeometry args={[0.3, 0.44, 0.04]} />
        </mesh>
        <mesh position={[0.22, 0.06, 0.25]} material={materials.carbonFiber}>
          <boxGeometry args={[0.3, 0.44, 0.04]} />
        </mesh>

        {/* Central Genesis Glowing Core */}
        <group position={[0, 0.08, 0.25]}>
          <mesh material={materials.jointGold}>
            <cylinderGeometry args={[0.12, 0.12, 0.04, 24]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>
          <mesh ref={coreRef} material={materials.purpleGlow}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 24]} rotation={[Math.PI / 2, 0, 0]} />
          </mesh>
        </group>

        {/* Spinal Heat Radiators (Back) */}
        {[-0.14, -0.04, 0.06, 0.16].map((y, i) => (
          <mesh key={i} position={[0, y, -0.25]} material={materials.bodySilver}>
            <boxGeometry args={[0.26, 0.04, 0.05]} />
          </mesh>
        ))}

        {/* Midriff Spine Column */}
        <mesh position={[0, -0.44, 0]} material={materials.jointGold}>
          <cylinderGeometry args={[0.13, 0.11, 0.22, 16]} />
        </mesh>
      </group>

      {/* ─── PELVIS & POWER BUS ─── */}
      <group position={[0, 0.52, 0]}>
        <mesh material={materials.bodyDark}>
          <boxGeometry args={[0.68, 0.36, 0.4]} />
        </mesh>
        <mesh position={[0, 0, 0.21]} material={materials.carbonFiber}>
          <boxGeometry args={[0.48, 0.2, 0.03]} />
        </mesh>
        {/* Hip Joint Rotators */}
        <mesh position={[-0.28, -0.12, 0]} material={materials.jointGold}>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
        <mesh position={[0.28, -0.12, 0]} material={materials.jointGold}>
          <sphereGeometry args={[0.12, 16, 16]} />
        </mesh>
      </group>

      {/* ─── LEFT ARM ─── */}
      <group ref={leftArmRef} position={[-0.56, 1.4, 0]}>
        {/* Shoulder Pauldron */}
        <mesh material={materials.jointGold}>
          <sphereGeometry args={[0.12, 20, 20]} />
        </mesh>
        <mesh position={[-0.06, 0.05, 0]} material={materials.bodySilver}>
          <boxGeometry args={[0.2, 0.2, 0.28]} />
        </mesh>

        {/* Bicep */}
        <group position={[-0.08, -0.34, 0]}>
          <mesh material={materials.bodyDark}>
            <cylinderGeometry args={[0.075, 0.07, 0.4, 16]} />
          </mesh>
          <mesh position={[0.06, 0, 0]} material={materials.jointGold}>
            <cylinderGeometry args={[0.02, 0.02, 0.34, 12]} />
          </mesh>

          {/* Elbow Joint */}
          <group position={[0, -0.26, 0]}>
            <mesh material={materials.jointGold}>
              <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>

            {/* Forearm */}
            <group position={[0, -0.3, 0]}>
              <mesh material={materials.carbonFiber}>
                <boxGeometry args={[0.12, 0.38, 0.13]} />
              </mesh>
              {/* Forearm Neon Stripe */}
              <mesh position={[-0.065, 0, 0]} material={materials.purpleGlow}>
                <boxGeometry args={[0.01, 0.24, 0.04]} />
              </mesh>

              {/* Wrist & Hand */}
              <mesh position={[0, -0.22, 0]} material={materials.jointGold}>
                <cylinderGeometry args={[0.05, 0.05, 0.07, 16]} />
              </mesh>
              <mesh position={[0, -0.32, 0]} material={materials.bodySilver}>
                <boxGeometry args={[0.1, 0.14, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ─── RIGHT ARM ─── */}
      <group ref={rightArmRef} position={[0.56, 1.4, 0]}>
        {/* Shoulder Pauldron */}
        <mesh material={materials.jointGold}>
          <sphereGeometry args={[0.12, 20, 20]} />
        </mesh>
        <mesh position={[0.06, 0.05, 0]} material={materials.bodySilver}>
          <boxGeometry args={[0.2, 0.2, 0.28]} />
        </mesh>

        {/* Bicep */}
        <group position={[0.08, -0.34, 0]}>
          <mesh material={materials.bodyDark}>
            <cylinderGeometry args={[0.075, 0.07, 0.4, 16]} />
          </mesh>
          <mesh position={[-0.06, 0, 0]} material={materials.jointGold}>
            <cylinderGeometry args={[0.02, 0.02, 0.34, 12]} />
          </mesh>

          {/* Elbow Joint */}
          <group position={[0, -0.26, 0]}>
            <mesh material={materials.jointGold}>
              <sphereGeometry args={[0.09, 16, 16]} />
            </mesh>

            {/* Forearm */}
            <group position={[0, -0.3, 0]}>
              <mesh material={materials.carbonFiber}>
                <boxGeometry args={[0.12, 0.38, 0.13]} />
              </mesh>
              {/* Forearm Neon Stripe */}
              <mesh position={[0.065, 0, 0]} material={materials.purpleGlow}>
                <boxGeometry args={[0.01, 0.24, 0.04]} />
              </mesh>

              {/* Wrist & Hand */}
              <mesh position={[0, -0.22, 0]} material={materials.jointGold}>
                <cylinderGeometry args={[0.05, 0.05, 0.07, 16]} />
              </mesh>
              <mesh position={[0, -0.32, 0]} material={materials.bodySilver}>
                <boxGeometry args={[0.1, 0.14, 0.06]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* ─── LEFT LEG ─── */}
      <group position={[-0.28, 0.4, 0]}>
        <mesh position={[0, -0.36, 0]} material={materials.bodyDark}>
          <boxGeometry args={[0.19, 0.54, 0.24]} />
        </mesh>
        <mesh position={[0, -0.36, 0.13]} material={materials.carbonFiber}>
          <boxGeometry args={[0.15, 0.42, 0.02]} />
        </mesh>

        {/* Knee Joint */}
        <group position={[0, -0.7, 0]}>
          <mesh material={materials.jointGold}>
            <cylinderGeometry args={[0.095, 0.095, 0.22, 16]} rotation={[0, 0, Math.PI / 2]} />
          </mesh>

          {/* Shin & Foot */}
          <group position={[0, -0.44, 0]}>
            <mesh material={materials.bodySilver}>
              <boxGeometry args={[0.17, 0.58, 0.19]} />
            </mesh>
            <mesh position={[0, 0, 0.105]} material={materials.purpleGlow}>
              <boxGeometry args={[0.035, 0.38, 0.01]} />
            </mesh>
            {/* Footpad */}
            <mesh position={[0, -0.35, 0.06]} material={materials.bodyDark}>
              <boxGeometry args={[0.21, 0.1, 0.4]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ─── RIGHT LEG ─── */}
      <group position={[0.28, 0.4, 0]}>
        <mesh position={[0, -0.36, 0]} material={materials.bodyDark}>
          <boxGeometry args={[0.19, 0.54, 0.24]} />
        </mesh>
        <mesh position={[0, -0.36, 0.13]} material={materials.carbonFiber}>
          <boxGeometry args={[0.15, 0.42, 0.02]} />
        </mesh>

        {/* Knee Joint */}
        <group position={[0, -0.7, 0]}>
          <mesh material={materials.jointGold}>
            <cylinderGeometry args={[0.095, 0.095, 0.22, 16]} rotation={[0, 0, Math.PI / 2]} />
          </mesh>

          {/* Shin & Foot */}
          <group position={[0, -0.44, 0]}>
            <mesh material={materials.bodySilver}>
              <boxGeometry args={[0.17, 0.58, 0.19]} />
            </mesh>
            <mesh position={[0, 0, 0.105]} material={materials.purpleGlow}>
              <boxGeometry args={[0.035, 0.38, 0.01]} />
            </mesh>
            {/* Footpad */}
            <mesh position={[0, -0.35, 0.06]} material={materials.bodyDark}>
              <boxGeometry args={[0.21, 0.1, 0.4]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
