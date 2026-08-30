import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';
import GenesisHumanoid from './GenesisHumanoid';

/**
 * RobotTelemetryRig
 * Handles frame-by-frame 3D matrix transforms synchronized with user scroll offset (0.0 to 1.0)
 * and mouse hover parallax.
 */
export default function RobotTelemetryRig({ 
  onTelemetryUpdate,
  wireframe = false,
  highlightSubsystem = null 
}) {
  const scroll = useScroll();
  const groupRef = useRef();
  const smoothedScroll = useRef(0);

  useFrame((state, delta) => {
    if (!scroll) return;

    // Smooth scroll interpolation (lerp)
    const currentOffset = scroll.offset; // 0 to 1
    smoothedScroll.current = THREE.MathUtils.lerp(smoothedScroll.current, currentOffset, 0.08);
    const p = smoothedScroll.current;

    // Mouse parallax
    const targetMouseX = (state.pointer.x * 0.3);
    const targetMouseY = (state.pointer.y * 0.15);

    if (groupRef.current) {
      // ── Stage 0 (0.0 - 0.22): Hero Stance (Centered, full chassis, gentle idle sway)
      if (p < 0.22) {
        const stageP = p / 0.22;
        groupRef.current.position.x = THREE.MathUtils.lerp(0.8, -1.2, stageP);
        groupRef.current.position.y = THREE.MathUtils.lerp(-0.2, -0.4, stageP);
        groupRef.current.position.z = THREE.MathUtils.lerp(0, 0.5, stageP);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(0, 0.45, stageP) + targetMouseX * 0.2;
        groupRef.current.rotation.x = targetMouseY * 0.1;
      }
      // ── Stage 1 (0.22 - 0.48): Specs & AI Compute Core (Zoom close-up into torso & optics)
      else if (p < 0.48) {
        const stageP = (p - 0.22) / 0.26;
        groupRef.current.position.x = THREE.MathUtils.lerp(-1.2, 1.4, stageP);
        groupRef.current.position.y = THREE.MathUtils.lerp(-0.4, -1.1, stageP);
        groupRef.current.position.z = THREE.MathUtils.lerp(0.5, 1.8, stageP);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(0.45, -0.6, stageP) + targetMouseX * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.08, stageP) + targetMouseY * 0.1;
      }
      // ── Stage 2 (0.48 - 0.74): Actuator & Joint Kinematics (Focus on arm/harmonic actuators)
      else if (p < 0.74) {
        const stageP = (p - 0.48) / 0.26;
        groupRef.current.position.x = THREE.MathUtils.lerp(1.4, -1.5, stageP);
        groupRef.current.position.y = THREE.MathUtils.lerp(-1.1, -0.6, stageP);
        groupRef.current.position.z = THREE.MathUtils.lerp(1.8, 1.2, stageP);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(-0.6, 1.1, stageP) + targetMouseX * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(0.08, -0.05, stageP);
      }
      // ── Stage 3 (0.74 - 1.0): Full Platform Deployment (B2B Terminal / Full View)
      else {
        const stageP = (p - 0.74) / 0.26;
        groupRef.current.position.x = THREE.MathUtils.lerp(-1.5, 0.9, stageP);
        groupRef.current.position.y = THREE.MathUtils.lerp(-0.6, -0.3, stageP);
        groupRef.current.position.z = THREE.MathUtils.lerp(1.2, 0.1, stageP);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(1.1, 0.15, stageP) + targetMouseX * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(-0.05, 0, stageP);
      }

      // Continuous subtle breathing / operational micro-movement
      const time = state.clock.getElapsedTime();
      groupRef.current.position.y += Math.sin(time * 1.5) * 0.015;
    }

    // Telemetry callback to notify HUD of live metrics
    if (onTelemetryUpdate) {
      const liveYaw = ((groupRef.current?.rotation.y || 0) * (180 / Math.PI)).toFixed(1);
      const liveTorque = (145 + Math.sin(state.clock.getElapsedTime() * 3) * 12).toFixed(0);
      const coreTemp = (38.4 + p * 6.2).toFixed(1);
      const busVoltage = (48.2 - p * 1.1).toFixed(1);
      
      onTelemetryUpdate({
        progress: p,
        yaw: liveYaw,
        torque: liveTorque,
        temp: coreTemp,
        voltage: busVoltage,
        dof: 32,
      });
    }
  });

  return (
    <group ref={groupRef}>
      <GenesisHumanoid 
        scrollProgress={smoothedScroll.current}
        wireframe={wireframe}
        highlightSubsystem={highlightSubsystem}
      />
    </group>
  );
}
