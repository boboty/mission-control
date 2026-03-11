'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, RoundedBox, Edges, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { type Agent } from '@/lib/types';

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

      {/* 椅子朝向屏幕：屏幕在 -Z，座椅面向 -Z，不再额外 180° 翻转 */}
      <group position={[0, 0, 0.55]} rotation={[0, 0, 0]}>
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
    <group position={[8.2, 0, 0.8]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[3.4, 2.8]} />
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
      <Text position={[0,1.9,-0.5]} fontSize={0.16} color="#0f172a" anchorX="center">茶水间</Text>
    </group>
  );
}

function LoungeZone() {
  return (
    <group position={[-8.2, 0, 1.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[4.2, 3.2]} />
        <meshStandardMaterial color="#ede9fe" roughness={0.96} />
      </mesh>
      <group position={[0,0,0.25]}>
        <RoundedBox args={[1.8,0.28,0.65]} radius={0.06} position={[0,0.16,0]}>
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </RoundedBox>
        <RoundedBox args={[1.8,0.55,0.12]} radius={0.04} position={[0,0.52,-0.28]} rotation={[0.12,0,0]}>
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </RoundedBox>
      </group>
      <RoundedBox args={[0.9,0.05,0.55]} radius={0.03} position={[0,0.3,-0.85]}>
        <meshStandardMaterial color="#8b5e3c" roughness={0.65} />
      </RoundedBox>
      {[[-0.3,0.38,-0.82],[0,0.38,-0.9],[0.25,0.38,-0.78]].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]}><cylinderGeometry args={[0.06,0.06,0.02,18]} /><meshStandardMaterial color={i===0?"#fb7185":i===1?"#fbbf24":"#60a5fa"} /></mesh>
      ))}
      <group position={[1.35,0,0.4]}>
        <mesh position={[0,0.28,0]}><cylinderGeometry args={[0.32,0.36,0.56,20]} /><meshStandardMaterial color="#0f766e" roughness={0.8} /></mesh>
        {[0,1,2,3].map(i=>(
          <mesh key={i} position={[Math.sin(i*1.5)*0.16,0.72+i*0.08,Math.cos(i*1.5)*0.16]} rotation={[0.2,i*0.8,0.15]}><coneGeometry args={[0.1,0.35,5]} /><meshStandardMaterial color="#22c55e" roughness={0.7} /></mesh>
        ))}
      </group>
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

      <group position={[-10.95, 2, 2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.4, 0.9]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} />
        </mesh>
        <Text position={[0, 0, 0.01]} fontSize={0.11} color="#ffffff" anchorX="center" anchorY="middle">
          MISSION CONTROL
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
        <mesh>
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

function BossOffice({ position, state }: { position: [number, number, number]; state: string }) {
  const stateColors: Record<string, string> = {
    working: '#10b981',
    外出: '#f59e0b',
    喝茶: '#8b5cf6',
    巡视: '#3b82f6',
  };
  const accentColor = stateColors[state] || '#10b981';

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

      <Text position={[0, 2, -0.5]} fontSize={0.22} color={accentColor} anchorX="center" outlineWidth={0.015} outlineColor="#000">一波</Text>
      <Text position={[0, 1.7, -0.5]} fontSize={0.13} color="#64748b" anchorX="center">{state === 'working' ? '💻 工作' : state === '外出' ? '🚗 外出' : state === '喝茶' ? '☕ 喝茶' : '🔍 巡视'}</Text>
    </group>
  );
}

function OfficeContent({ agents, onAgentClick }: { agents: Agent[]; onAgentClick?: (agent: Agent) => void }) {
  const rosterAgents = agents.filter((a) => !isBoss(a.agent_key));
  const cols = 4;
  const spacingX = 3.8;
  const spacingZ = 3.4;
  const rows = Math.max(1, Math.ceil(rosterAgents.length / cols));
  const totalWidth = (cols - 1) * spacingX;
  const totalDepth = Math.max(1, rows - 1) * spacingZ;

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight position={[10, 15, 10]} intensity={0.72} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -8]} intensity={0.22} color="#bfdbfe" />

      <Floor />
      <FloorPattern />
      <Walls />
      <Decor />
      <BossOffice position={[0, 0, -4.8]} state="working" />

      {rosterAgents.map((agent, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = -totalWidth / 2 + col * spacingX;
        const z = 0.8 + row * spacingZ;
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
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={7}
        maxDistance={24}
        autoRotate={false}
        target={[0, 1.2, Math.max(1, totalDepth / 3)]}
      />
    </>
  );
}

interface OfficeSceneProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export default function OfficeScene({ agents, onAgentClick }: OfficeSceneProps) {
  const visibleAgents = useMemo(() => agents.filter((a) => !isBoss(a.agent_key)).length, [agents]);

  return (
    <div className="h-[560px] rounded-xl overflow-hidden border border-[var(--border-light)] bg-gradient-to-b from-slate-100 to-slate-200 relative">
      <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/80 text-slate-600 text-xs rounded shadow-sm backdrop-blur-sm">
        🖱️ 拖动旋转 · 滚轮缩放 · 点击查看
      </div>
      <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-white/80 text-slate-600 text-xs rounded shadow-sm backdrop-blur-sm">
        已展示 {visibleAgents} 个 Agent · Boss 办公室保留
      </div>

      <Canvas camera={{ position: [13, 10, 14], fov: 30 }} shadows gl={{ antialias: true }}>
        <OfficeContent agents={agents} onAgentClick={onAgentClick} />
      </Canvas>
    </div>
  );
}
