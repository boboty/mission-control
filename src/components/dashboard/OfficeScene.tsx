'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, RoundedBox, Edges, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { type Agent } from '@/lib/types';

export type OperatorAction = '工作' | '喝茶' | '巡视';

const OPERATOR_WORK_POSITION = new THREE.Vector3(0, 0.28, -5.82);
const OPERATOR_TEA_POSITION = new THREE.Vector3(6.65, 0, -0.25);
const OPERATOR_PATROL_POINTS = [
  new THREE.Vector3(-6.8, 0, -1.8),
  new THREE.Vector3(-6.8, 0, 6.2),
  new THREE.Vector3(6.4, 0, 6.2),
  new THREE.Vector3(6.4, 0, 0.8),
  new THREE.Vector3(4.8, 0, -1.8),
];

function samplePatrolPath(progress: number) {
  const totalSegments = OPERATOR_PATROL_POINTS.length;
  const normalized = ((progress % 1) + 1) % 1;
  const scaled = normalized * totalSegments;
  const index = Math.floor(scaled);
  const nextIndex = (index + 1) % totalSegments;
  const localT = scaled - index;

  return new THREE.Vector3().lerpVectors(
    OPERATOR_PATROL_POINTS[index],
    OPERATOR_PATROL_POINTS[nextIndex],
    localT
  );
}

function isOnline(state: string): boolean {
  return state === 'online' || state === 'active' || state === 'running' || state === 'working';
}

function isBoss(agentKey: string): boolean {
  return agentKey === 'boss';
}

type AgentVariant = 'capsule' | 'square' | 'antenna' | 'halo' | 'crystal';

function getAgentVariant(index: number): AgentVariant {
  const variants: AgentVariant[] = ['capsule', 'square', 'antenna', 'halo', 'crystal'];
  return variants[index % variants.length];
}

function getAgentPalette(index: number, online: boolean) {
  const palettes = [
    { body: '#3b82f6', head: '#93c5fd', glow: '#60a5fa' },
    { body: '#10b981', head: '#6ee7b7', glow: '#34d399' },
    { body: '#8b5cf6', head: '#c4b5fd', glow: '#a78bfa' },
    { body: '#f59e0b', head: '#fcd34d', glow: '#fbbf24' },
    { body: '#ec4899', head: '#f9a8d4', glow: '#f472b6' },
    { body: '#06b6d4', head: '#67e8f9', glow: '#22d3ee' },
  ];
  if (!online) return { body: '#6b7280', head: '#9ca3af', glow: '#4b5563' };
  return palettes[index % palettes.length];
}

function getOperatorAccent(action: OperatorAction) {
  if (action === '工作') return { primary: '#10b981', glow: '#34d399' };
  if (action === '喝茶') return { primary: '#8b5cf6', glow: '#c4b5fd' };
  return { primary: '#3b82f6', glow: '#93c5fd' };
}

function AgentFigure({
  position,
  online,
  agent,
  variant,
  palette,
  onClick,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  online: boolean;
  agent: Agent;
  variant: AgentVariant;
  palette: { body: string; head: string; glow: string };
  onClick?: () => void;
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(t * (online ? 1.8 : 0.9) + position[0]) * (online ? 0.05 : 0.02);
    groupRef.current.rotation.y = rotation[1] + Math.sin(t * 0.5 + position[2]) * 0.04;
  });

  const hoverScale = hovered ? 1.16 : 1;
  const name = agent.display_name || agent.agent_key;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      <Float speed={online ? 2.2 : 1} rotationIntensity={0.12} floatIntensity={online ? 0.24 : 0.08}>
        <group scale={hoverScale} rotation={rotation}>
          {variant === 'capsule' && (
            <>
              <mesh position={[0, 0.56, 0]}>
                <sphereGeometry args={[0.2, 18, 18]} />
                <meshStandardMaterial color={palette.head} roughness={0.28} metalness={0.2} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.15, 0.18, 0.36, 18]} />
                <meshStandardMaterial color={palette.body} roughness={0.4} />
              </mesh>
            </>
          )}

          {variant === 'square' && (
            <>
              <RoundedBox args={[0.34, 0.34, 0.34]} radius={0.08} position={[0, 0.56, 0]}>
                <meshStandardMaterial color={palette.head} roughness={0.24} metalness={0.25} />
              </RoundedBox>
              <RoundedBox args={[0.34, 0.3, 0.22]} radius={0.06} position={[0, 0.27, 0]}>
                <meshStandardMaterial color={palette.body} roughness={0.42} />
              </RoundedBox>
            </>
          )}

          {variant === 'antenna' && (
            <>
              <mesh position={[0, 0.54, 0]}>
                <sphereGeometry args={[0.19, 18, 18]} />
                <meshStandardMaterial color={palette.head} roughness={0.2} metalness={0.28} />
              </mesh>
              <mesh position={[0, 0.85, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
                <meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={0.4} />
              </mesh>
              <mesh position={[0, 0.98, 0]}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={0.9} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <capsuleGeometry args={[0.11, 0.2, 4, 10]} />
                <meshStandardMaterial color={palette.body} roughness={0.35} />
              </mesh>
            </>
          )}

          {variant === 'halo' && (
            <>
              <mesh position={[0, 0.54, 0]}>
                <sphereGeometry args={[0.18, 18, 18]} />
                <meshStandardMaterial color={palette.head} roughness={0.28} metalness={0.18} />
              </mesh>
              <mesh position={[0, 0.79, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.16, 0.02, 10, 24]} />
                <meshStandardMaterial color={palette.glow} emissive={palette.glow} emissiveIntensity={0.8} />
              </mesh>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.12, 0.18, 0.34, 16]} />
                <meshStandardMaterial color={palette.body} roughness={0.38} />
              </mesh>
            </>
          )}

          {variant === 'crystal' && (
            <>
              <mesh position={[0, 0.56, 0]} rotation={[0.3, 0.2, 0.1]}>
                <octahedronGeometry args={[0.21, 0]} />
                <meshStandardMaterial color={palette.head} roughness={0.18} metalness={0.35} />
              </mesh>
              <mesh position={[0, 0.27, 0]} rotation={[0.1, 0.5, 0]}>
                <octahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial color={palette.body} roughness={0.3} metalness={0.25} />
              </mesh>
            </>
          )}

          {/* 眼睛朝向屏幕：显示器在角色前方 -Z，所以眼睛放在 -Z */}
          <mesh position={[-0.08, 0.58, -0.17]}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0.08, 0.58, -0.17]}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.7} />
          </mesh>

          <mesh position={[-0.22, 0.31, 0]} rotation={[0, 0, Math.PI / 6]}>
            <capsuleGeometry args={[0.04, 0.16, 4, 8]} />
            <meshStandardMaterial color={palette.body} roughness={0.4} />
          </mesh>
          <mesh position={[0.22, 0.31, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <capsuleGeometry args={[0.04, 0.16, 4, 8]} />
            <meshStandardMaterial color={palette.body} roughness={0.4} />
          </mesh>

          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.3, 18, 18]} />
            <meshStandardMaterial color={palette.glow} transparent opacity={online ? 0.13 : 0.06} side={THREE.BackSide} />
          </mesh>
        </group>
      </Float>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.4, 36]} />
        <meshStandardMaterial color={hovered ? '#f59e0b' : palette.glow} transparent opacity={hovered ? 0.85 : 0.55} />
      </mesh>

      <Text
        position={[0, 1.05, 0]}
        fontSize={0.16}
        color={hovered ? '#fbbf24' : palette.glow}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {name}
      </Text>

      {hovered && (
        <Html position={[0, 1.35, 0]} center distanceFactor={8}>
          <div className="px-3 py-1.5 bg-gray-900/90 text-white text-xs rounded-lg whitespace-nowrap backdrop-blur-sm border border-gray-700">
            {online ? '🟢 在线工作' : '⚪ 空闲等待'} · {variant}
          </div>
        </Html>
      )}
    </group>
  );
}

function OperatorFigure({ action, onClick }: { action: OperatorAction; onClick?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const leftUpperArmRef = useRef<THREE.Group>(null);
  const rightUpperArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);
  const leftThighRef = useRef<THREE.Group>(null);
  const rightThighRef = useRef<THREE.Group>(null);
  const leftCalfRef = useRef<THREE.Group>(null);
  const rightCalfRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const accent = getOperatorAccent(action);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();
    const position = groupRef.current.position;
    const seated = action === '工作';
    const patrolling = action === '巡视';
    const drinkingTea = action === '喝茶';

    if (patrolling) {
      const patrolProgress = (t * 0.06) % 1;
      const target = samplePatrolPath(patrolProgress);
      const lookAhead = samplePatrolPath((patrolProgress + 0.012) % 1);
      const direction = new THREE.Vector3().subVectors(lookAhead, target);

      position.lerp(target, 0.14);
      position.y = target.y + Math.sin(t * 4.2) * 0.02;
      groupRef.current.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;
    } else {
      const target = action === '喝茶' ? OPERATOR_TEA_POSITION : OPERATOR_WORK_POSITION;
      position.lerp(target, seated ? 0.18 : 0.1);
      position.y = target.y + Math.sin(t * 2) * (seated ? 0.004 : 0.015);
      groupRef.current.rotation.y = seated ? Math.PI : -Math.PI / 2.6;
    }

    const walkCycle = Math.sin(t * 6);
    const walkCycleInverse = Math.sin(t * 6 + Math.PI);

    if (torsoRef.current) {
      torsoRef.current.rotation.x = seated ? 0.15 : drinkingTea ? 0.03 : 0;
      torsoRef.current.position.y = seated ? 0.02 : 0;
    }
    if (headRef.current) {
      headRef.current.rotation.x = seated ? -0.08 : drinkingTea ? 0.04 : 0;
    }
    if (ringRef.current) {
      ringRef.current.position.y = seated ? -0.25 : 0.03;
    }
    if (leftThighRef.current) {
      leftThighRef.current.position.y = seated ? 0.12 : 0.4;
    }
    if (rightThighRef.current) {
      rightThighRef.current.position.y = seated ? 0.12 : 0.4;
    }
    if (leftCalfRef.current) {
      leftCalfRef.current.position.z = seated ? 0.01 : 0;
    }
    if (rightCalfRef.current) {
      rightCalfRef.current.position.z = seated ? 0.01 : 0;
    }

    if (leftUpperArmRef.current) {
      leftUpperArmRef.current.rotation.x = seated ? 1.02 : drinkingTea ? 0.2 : 0;
      leftUpperArmRef.current.rotation.z = patrolling ? 0.28 * walkCycle : seated ? -0.14 : -0.08;
    }
    if (rightUpperArmRef.current) {
      rightUpperArmRef.current.rotation.x = seated ? 1.1 : drinkingTea ? 0.6 : 0;
      rightUpperArmRef.current.rotation.z = patrolling ? 0.28 * walkCycleInverse : drinkingTea ? -0.1 : 0.08;
    }
    if (leftForearmRef.current) {
      leftForearmRef.current.rotation.x = seated ? -0.85 : drinkingTea ? -0.15 : 0;
      leftForearmRef.current.rotation.z = drinkingTea ? -0.12 : 0;
    }
    if (rightForearmRef.current) {
      rightForearmRef.current.rotation.x = seated ? -0.95 : drinkingTea ? -1.35 : 0;
      rightForearmRef.current.rotation.z = drinkingTea ? -0.18 : 0;
    }
    if (leftThighRef.current) {
      leftThighRef.current.rotation.x = seated ? -1.28 : patrolling ? 0.48 * walkCycle : 0;
    }
    if (rightThighRef.current) {
      rightThighRef.current.rotation.x = seated ? -1.28 : patrolling ? 0.48 * walkCycleInverse : 0;
    }
    if (leftCalfRef.current) {
      leftCalfRef.current.rotation.x = seated ? 1.42 : patrolling ? Math.max(0, -0.38 * walkCycle) : 0;
    }
    if (rightCalfRef.current) {
      rightCalfRef.current.rotation.x = seated ? 1.42 : patrolling ? Math.max(0, -0.38 * walkCycleInverse) : 0;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[OPERATOR_WORK_POSITION.x, OPERATOR_WORK_POSITION.y, OPERATOR_WORK_POSITION.z]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      <group ref={torsoRef}>
        <mesh position={[0, 0.34, 0]}>
          <capsuleGeometry args={[0.125, 0.34, 8, 14]} />
          <meshStandardMaterial color={accent.primary} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.17, 18, 18]} />
          <meshStandardMaterial color="#111827" roughness={0.72} />
        </mesh>
      </group>

      <group ref={headRef} position={[0, 0.76, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#f1c27d" roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.12, -0.01]}>
          <sphereGeometry args={[0.16, 18, 18]} />
          <meshStandardMaterial color="#111827" roughness={0.45} />
        </mesh>
        <mesh position={[-0.055, 0.005, -0.145]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.055, 0.005, -0.145]}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-0.055, 0.005, -0.158]}>
          <sphereGeometry args={[0.009, 10, 10]} />
          <meshStandardMaterial color="#111827" emissive="#0f172a" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0.055, 0.005, -0.158]}>
          <sphereGeometry args={[0.009, 10, 10]} />
          <meshStandardMaterial color="#111827" emissive="#0f172a" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-0.055, 0.005, -0.152]}>
          <torusGeometry args={[0.038, 0.006, 8, 18]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0.055, 0.005, -0.152]}>
          <torusGeometry args={[0.038, 0.006, 8, 18]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.005, -0.152]}>
          <boxGeometry args={[0.04, 0.008, 0.008]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[-0.108, 0.005, -0.135]} rotation={[0, 0.22, 0]}>
          <boxGeometry args={[0.03, 0.006, 0.006]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0.108, 0.005, -0.135]} rotation={[0, -0.22, 0]}>
          <boxGeometry args={[0.03, 0.006, 0.006]} />
          <meshStandardMaterial color="#111827" metalness={0.55} roughness={0.3} />
        </mesh>
      </group>

      <group ref={leftUpperArmRef} position={[-0.18, 0.5, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.032, 0.22, 6, 10]} />
          <meshStandardMaterial color={accent.primary} roughness={0.65} />
        </mesh>
        <group ref={leftForearmRef} position={[0, -0.22, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.028, 0.2, 6, 10]} />
            <meshStandardMaterial color="#f1c27d" roughness={0.82} />
          </mesh>
        </group>
      </group>

      <group ref={rightUpperArmRef} position={[0.18, 0.5, 0]}>
        <mesh position={[0, -0.11, 0]}>
          <capsuleGeometry args={[0.032, 0.22, 6, 10]} />
          <meshStandardMaterial color={accent.primary} roughness={0.65} />
        </mesh>
        <group ref={rightForearmRef} position={[0, -0.22, 0]}>
          <mesh position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.028, 0.2, 6, 10]} />
            <meshStandardMaterial color="#f1c27d" roughness={0.82} />
          </mesh>
        </group>
      </group>

      <group ref={leftThighRef} position={[-0.085, 0.12, 0]}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.038, 0.24, 6, 10]} />
          <meshStandardMaterial color="#111827" roughness={0.72} />
        </mesh>
        <group ref={leftCalfRef} position={[0, -0.24, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.034, 0.24, 6, 10]} />
            <meshStandardMaterial color="#111827" roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.28, -0.03]}>
            <boxGeometry args={[0.09, 0.04, 0.16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
        </group>
      </group>

      <group ref={rightThighRef} position={[0.085, 0.12, 0]}>
        <mesh position={[0, -0.12, 0]}>
          <capsuleGeometry args={[0.038, 0.24, 6, 10]} />
          <meshStandardMaterial color="#111827" roughness={0.72} />
        </mesh>
        <group ref={rightCalfRef} position={[0, -0.24, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.034, 0.24, 6, 10]} />
            <meshStandardMaterial color="#111827" roughness={0.72} />
          </mesh>
          <mesh position={[0, -0.28, -0.03]}>
            <boxGeometry args={[0.09, 0.04, 0.16]} />
            <meshStandardMaterial color="#1f2937" roughness={0.7} />
          </mesh>
        </group>
      </group>

      {action === '喝茶' && (
        <group position={[0.28, 0.42, -0.08]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.045, 0.11, 14]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.75} />
          </mesh>
          <mesh position={[0.05, 0.01, 0]}>
            <torusGeometry args={[0.03, 0.008, 8, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        </group>
      )}

      <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.31, 32]} />
        <meshStandardMaterial color={hovered ? '#f59e0b' : accent.glow} transparent opacity={0.7} />
      </mesh>

      <Text
        position={[0, 1.25, 0]}
        fontSize={0.14}
        color={hovered ? '#fbbf24' : accent.primary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#000000"
      >
        一波 · {action}
      </Text>

      {hovered && (
        <Html position={[0, 1.5, 0]} center distanceFactor={8}>
          <div className="rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            操作者 · {action}
          </div>
        </Html>
      )}
    </group>
  );
}

function Desk({ position, online, accentColor, onClick }: {
  position: [number, number, number];
  online: boolean;
  accentColor: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const deskColor = hovered ? '#f8fafc' : '#e2e8f0';

  return (
    <group position={position} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} onClick={onClick}>
      <RoundedBox args={[1.5, 0.06, 0.75]} radius={0.02} position={[0, 0.38, 0]}>
        <meshStandardMaterial color={deskColor} roughness={0.5} />
        <Edges color={hovered ? accentColor : '#94a3b8'} threshold={15} />
      </RoundedBox>

      {[[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.19, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.38, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, 0.5, -0.28]}>
        <cylinderGeometry args={[0.03, 0.08, 0.25, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
      <RoundedBox args={[0.7, 0.45, 0.04]} radius={0.03} position={[0, 0.72, -0.28]}>
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </RoundedBox>
      <mesh position={[0, 0.72, -0.255]}>
        <planeGeometry args={[0.6, 0.38]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={online ? 0.55 : 0.2} />
      </mesh>

      <RoundedBox args={[0.45, 0.025, 0.16]} radius={0.01} position={[0, 0.41, 0.18]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.07, 0.025, 0.11]} radius={0.02} position={[0.32, 0.4, 0.18]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </RoundedBox>

      <RoundedBox args={[0.08, 0.12, 0.08]} radius={0.01} position={[-0.6, 0.47, -0.2]}>
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </RoundedBox>

      <group position={[-0.58, 0.41, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 8]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.sin(i * 2.1) * 0.03, 0.1 + i * 0.04, Math.cos(i * 2.1) * 0.03]} rotation={[0.2, i * 0.5, 0]}>
            <coneGeometry args={[0.025, 0.08, 4]} />
            <meshStandardMaterial color={i === 0 ? '#22c55e' : '#16a34a'} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* 椅子朝向屏幕：椅子位于桌子 +Z 侧，因此需旋转 PI 朝向 -Z 的显示器 */}
      <group position={[0, 0, 0.55]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[0.4, 0.08, 0.4]} radius={0.02} position={[0, 0.22, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.38, 0.35, 0.04]} radius={0.01} position={[0, 0.42, -0.18]} rotation={[0.15, 0, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </RoundedBox>
        {[[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.1, z]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[22, 15]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
    </mesh>
  );
}

function FloorPattern() {
  return (
    <group>
      <gridHelper args={[22, 22, '#94a3b8', '#cbd5e1']} position={[0, 0.005, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[2.4, 15]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Walls() {
  return (
    <group>
      <mesh position={[0, 2.5, -7]}>
        <planeGeometry args={[22, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>

      <group position={[-5, 2.8, -6.98]}>
        <mesh>
          <boxGeometry args={[2.8, 1.9, 0.05]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.9, 0.06, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 2.0, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
      </group>

      <group position={[5, 2.8, -6.98]}>
        <mesh>
          <boxGeometry args={[2.8, 1.9, 0.05]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.9, 0.06, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 2.0, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
      </group>

      <mesh position={[-11, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>
      <mesh position={[11, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[15, 5]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.95} />
      </mesh>
    </group>
  );
}

function PantryZone() {
  return (
    <group position={[9.2, 0, -1.4]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[3.8, 3.2]} />
        <meshStandardMaterial color="#e0f2fe" roughness={0.95} />
      </mesh>
      <RoundedBox args={[2.8, 0.95, 0.7]} radius={0.04} position={[0, 0.48, -0.7]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.55} />
      </RoundedBox>
      <RoundedBox args={[0.7, 1.6, 0.7]} radius={0.04} position={[1.15, 0.8, -0.75]}>
        <meshStandardMaterial color="#94a3b8" metalness={0.25} roughness={0.35} />
      </RoundedBox>
      <mesh position={[-0.6, 1.1, -0.35]}><boxGeometry args={[0.4, 0.5, 0.35]} /><meshStandardMaterial color="#111827" /></mesh>
      <mesh position={[-0.05, 0.95, -0.35]}><cylinderGeometry args={[0.12, 0.12, 0.35, 18]} /><meshStandardMaterial color="#475569" /></mesh>
      <mesh position={[-0.05, 1.18, -0.35]}><cylinderGeometry args={[0.08, 0.08, 0.08, 18]} /><meshStandardMaterial color="#0f172a" /></mesh>
      {[[-0.8,0.18],[-0.25,0.18],[0.3,0.18]].map(([x,z],i)=>(
        <group key={i} position={[x,0.48,z]}>
          <mesh><cylinderGeometry args={[0.08,0.07,0.16,12]} /><meshStandardMaterial color={i===0?"#f59e0b":i===1?"#38bdf8":"#fb7185"} /></mesh>
          <mesh position={[0,0.08,0]}><torusGeometry args={[0.055,0.012,8,16]} /><meshStandardMaterial color="#ffffff" /></mesh>
        </group>
      ))}
      <mesh position={[0, 1.1, 0.95]}><boxGeometry args={[3.4, 0.08, 0.08]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      <mesh position={[-1.65, 1.1, -0.15]} rotation={[0, 0, 0]}><boxGeometry args={[0.08, 2.0, 1.8]} /><meshStandardMaterial color="#cbd5e1" transparent opacity={0.55} /></mesh>
      <Text position={[0,1.9,-0.5]} fontSize={0.16} color="#0f172a" anchorX="center">茶水间</Text>
    </group>
  );
}

function LoungeZone() {
  return (
    <group position={[-7.8, 0, 2.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[4.8, 3.8]} />
        <meshStandardMaterial color="#ede9fe" roughness={0.96} />
      </mesh>
      <group position={[-0.45,0,0.15]} rotation={[0,-Math.PI/2,0]}>
        <RoundedBox args={[2.1,0.28,0.72]} radius={0.06} position={[0,0.16,0]}>
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[2.1,0.58,0.12]} radius={0.04} position={[0,0.54,-0.3]} rotation={[0.12,0,0]}>
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </RoundedBox>
      </group>
      <RoundedBox args={[1.0,0.05,0.6]} radius={0.03} position={[-1.55,0.3,0.15]}>
        <meshStandardMaterial color="#8b5e3c" roughness={0.65} />
      </RoundedBox>
      {[[-1.82,0.38,0.18],[-1.55,0.38,0.06],[-1.3,0.38,0.2]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]}><cylinderGeometry args={[0.06,0.06,0.02,18]} /><meshStandardMaterial color={i===0?"#fb7185":i===1?"#fbbf24":"#60a5fa"} /></mesh>
      ))}
      <group position={[1.55,0,0.8]}>
        <mesh position={[0,0.28,0]}><cylinderGeometry args={[0.32,0.36,0.56,20]} /><meshStandardMaterial color="#0f766e" roughness={0.8} /></mesh>
        {[0,1,2,3].map(i=>(
          <mesh key={i} position={[Math.sin(i*1.5)*0.16,0.72+i*0.08,Math.cos(i*1.5)*0.16]} rotation={[0.2,i*0.8,0.15]}><coneGeometry args={[0.1,0.35,5]} /><meshStandardMaterial color="#22c55e" roughness={0.7} /></mesh>
        ))}
      </group>
      <mesh position={[0, 0.02, -1.45]} rotation={[-3.1415926/2, 0, 0]}><planeGeometry args={[2.4, 0.5]} /><meshStandardMaterial color="#c7d2fe" roughness={0.95} /></mesh>
      <mesh position={[0, 1.1, 1.55]}><boxGeometry args={[4.1, 0.08, 0.08]} /><meshStandardMaterial color="#94a3b8" /></mesh>
      <Text position={[0,1.75,0]} fontSize={0.16} color="#312e81" anchorX="center">活动区</Text>
    </group>
  );
}

function Decor() {
  return (
    <group>
      <group position={[0, 4, 0]}>
        <mesh>
          <boxGeometry args={[1.6, 0.08, 0.5]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        <pointLight position={[0, -0.1, 0]} intensity={1} color="#ffffff" distance={20} decay={2} />
      </group>

      {[[-6, 3.5, -1], [0, 3.5, -1], [6, 3.5, -1]].map(([x, y, z], i) => (
        <pointLight key={i} position={[x, y, z]} intensity={0.45} color="#fef3c7" distance={10} decay={2} />
      ))}

      <group position={[8, 3.8, -4]}>
        <mesh>
          <boxGeometry args={[1.5, 0.12, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.2} />
        </mesh>
      </group>

      <group position={[-10.9, 2.05, 2.0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.8, 1.1, 0.08]} />
          <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[1.55, 0.88]} />
          <meshStandardMaterial color="#0f172a" emissive="#0ea5e9" emissiveIntensity={0.18} />
        </mesh>
        <Text position={[0, 0.02, 0.06]} fontSize={0.1} color="#e0f2fe" anchorX="center" anchorY="middle">
          Team Live
        </Text>
      </group>

      {[[-8, 0, -5], [8, 0, -5], [-8, 0, 5], [8, 0, 5]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 4, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
        </group>
      ))}

      <group position={[9, 0, 5.5]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i * 1.2) * 0.15, 0.5 + i * 0.15, Math.cos(i * 1.2) * 0.15]} rotation={[0.3, i * 0.8, 0.2]}>
            <coneGeometry args={[0.12, 0.4, 4]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} />
          </mesh>
        ))}
      </group>

      <PantryZone />
      <LoungeZone />
    </group>
  );
}

function BossOffice({ position, action }: { position: [number, number, number]; action: OperatorAction }) {
  const accentColor = getOperatorAccent(action).primary;

  return (
    <group position={position} rotation={[0, Math.PI, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[6.2, 4.8]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>

      <mesh position={[-3.1, 1.5, 2.35]}>
        <boxGeometry args={[0.08, 3, 0.08]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
      </mesh>
      <mesh position={[3.1, 1.5, 2.35]}>
        <boxGeometry args={[0.08, 3, 0.08]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
      </mesh>

      <group position={[0, 0, 0]}>
        <RoundedBox args={[2.0, 0.08, 0.9]} radius={0.03} position={[0, 0.42, 0]}>
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </RoundedBox>
        {[[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.21, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.6} />
          </mesh>
        ))}

        <group position={[0, 0.7, -0.3]}>
          <mesh>
            <boxGeometry args={[0.8, 0.5, 0.04]} />
            <meshStandardMaterial color="#111827" />
          </mesh>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[0.7, 0.43]} />
            <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <cylinderGeometry args={[0.1, 0.12, 0.08, 8]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>

        <RoundedBox args={[0.5, 0.02, 0.2]} radius={0.01} position={[0, 0.47, 0.2]}>
          <meshStandardMaterial color="#1f2937" />
        </RoundedBox>

        <group position={[-0.85, 0.45, -0.25]}>
          <mesh><cylinderGeometry args={[0.08, 0.06, 0.15, 8]} /><meshStandardMaterial color="#b45309" /></mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[Math.sin(i * 2) * 0.05, 0.15 + i * 0.1, Math.cos(i * 2) * 0.05]} rotation={[0.2, i * 0.6, 0.1]}>
              <coneGeometry args={[0.06, 0.2, 4]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          ))}
        </group>
      </group>

      <group position={[0, 0, 0.75]} rotation={[0, Math.PI, 0]}>
        <RoundedBox args={[0.55, 0.1, 0.55]} radius={0.03} position={[0, 0.28, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.75, 0.06]} radius={0.03} position={[0, 0.65, -0.25]} rotation={[0.1, 0, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </RoundedBox>
      </group>

      <group position={[-2.25, 0, 0.25]} rotation={[0, Math.PI / 2, 0]}>
        <RoundedBox args={[1.2, 0.25, 0.5]} radius={0.05} position={[0, 0.125, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[1.2, 0.5, 0.12]} radius={0.04} position={[0, 0.5, -0.2]} rotation={[0.15, 0, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[0.1, 0.35, 0.4]} radius={0.03} position={[-0.55, 0.35, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[0.1, 0.35, 0.4]} radius={0.03} position={[0.55, 0.35, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[1.1, 0.08, 0.4]} radius={0.02} position={[0, 0.29, 0.05]}>
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </RoundedBox>
      </group>

      <group position={[-2.25, 0, -0.9]}>
        <RoundedBox args={[0.5, 0.04, 0.35]} radius={0.02} position={[0, 0.32, 0]}>
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </RoundedBox>
        <mesh position={[-0.18, 0.16, 0]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[0.18, 0.16, 0]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[-0.18, 0.16, -0.12]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[0.18, 0.16, -0.12]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
      </group>

      <Text position={[0, 2, -0.5]} fontSize={0.22} color={accentColor} anchorX="center" outlineWidth={0.015} outlineColor="#000">操作者</Text>
      <Text position={[0, 1.7, -0.5]} fontSize={0.13} color="#64748b" anchorX="center">当前动作 · {action}</Text>
    </group>
  );
}

function OfficeContent({
  agents,
  operatorAction,
  onAgentClick,
  onOperatorClick,
}: {
  agents: Agent[];
  operatorAction: OperatorAction;
  onAgentClick?: (agent: Agent) => void;
  onOperatorClick?: () => void;
}) {
  const rosterAgents = agents.filter((a) => !isBoss(a.agent_key));
  const cols = 3;
  const rows = 2;
  const spacingX = 4.2;
  const spacingZ = 3.8;
  const totalWidth = (cols - 1) * spacingX;
  const totalDepth = (rows - 1) * spacingZ;
  const maxSeats = cols * rows;

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[10, 15, 10]} intensity={0.72} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -8]} intensity={0.22} color="#bfdbfe" />

      <Floor />
      <FloorPattern />
      <Walls />
      <Decor />
      <BossOffice position={[0, 0, -5.1]} action={operatorAction} />
      <OperatorFigure action={operatorAction} onClick={onOperatorClick} />

      {Array.from({ length: maxSeats }).map((_, index) => {
        const agent = rosterAgents[index];
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = -totalWidth / 2 + col * spacingX;
        const z = 1.1 + row * spacingZ;

        if (!agent) {
          return (
            <group key={`empty-seat-${index}`}>
              <Desk position={[x, 0, z]} online={false} accentColor="#94a3b8" />
              <Text
                position={[x, 1.02, z]}
                fontSize={0.16}
                color="#64748b"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.012}
                outlineColor="#ffffff"
              >
                虚位以待
              </Text>
            </group>
          );
        }

        const online = isOnline(agent.state);
        const palette = getAgentPalette(index, online);
        const variant = getAgentVariant(index);

        return (
          <group key={agent.id}>
            <Desk position={[x, 0, z]} online={online} accentColor={palette.glow} onClick={() => onAgentClick?.(agent)} />
            <AgentFigure
              position={[x, 0.42, z + 0.55]}
              rotation={[0, 0, 0]}
              online={online}
              agent={agent}
              variant={variant}
              palette={palette}
              onClick={() => onAgentClick?.(agent)}
            />
          </group>
        );
      })}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        screenSpacePanning={true}
        panSpeed={1.15}
        rotateSpeed={0.85}
        zoomSpeed={0.9}
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={7}
        maxDistance={24}
        autoRotate={false}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        target={[0, 1.2, Math.max(1, totalDepth / 3)]}
      />
    </>
  );
}

interface OfficeSceneProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  onOperatorClick?: () => void;
  forceAllOnline?: boolean;
  operatorAction?: OperatorAction;
}

export default function OfficeScene({
  agents,
  onAgentClick,
  onOperatorClick,
  forceAllOnline = false,
  operatorAction = '巡视',
}: OfficeSceneProps) {
  const visibleAgents = useMemo(() => agents.filter((a) => !isBoss(a.agent_key)).length, [agents]);
  const sceneAgents = useMemo(
    () => forceAllOnline ? agents.map((agent) => (isBoss(agent.agent_key) ? agent : { ...agent, state: 'online' })) : agents,
    [agents, forceAllOnline]
  );

  return (
    <div className="h-[560px] rounded-xl overflow-hidden border border-[var(--border-light)] bg-gradient-to-b from-slate-100 to-slate-200 relative">
      <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/80 text-slate-600 text-xs rounded shadow-sm backdrop-blur-sm">
        左键旋转 · 右键平移 · 滚轮缩放 · 点击查看
      </div>
      <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-white/80 text-slate-600 text-xs rounded shadow-sm backdrop-blur-sm">
        已展示 {visibleAgents} 个 Agent + 1 位操作者{forceAllOnline ? ' · 全员在线预览' : ''}
      </div>

      <Canvas camera={{ position: [13, 10, 14], fov: 30 }} shadows gl={{ antialias: true }}>
        <OfficeContent
          agents={sceneAgents}
          operatorAction={operatorAction}
          onAgentClick={onAgentClick}
          onOperatorClick={onOperatorClick}
        />
      </Canvas>
    </div>
  );
}
