'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Float, Text, RoundedBox, Edges, Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { type Agent } from '@/lib/types';

// 判断是否在线
function isOnline(state: string): boolean {
  return state === 'online' || state === 'active' || state === 'running' || state === 'working';
}

// 判断是否老板（一波）
function isBoss(agentKey: string): boolean {
  return agentKey === 'boss' || agentKey === 'main';
}

// 可交互的 Agent 小人
function AgentFigure({ position, online, agentName, onClick, rotation = [0, 0, 0] }: { 
  position: [number, number, number]; 
  online: boolean; 
  agentName: string;
  onClick?: () => void;
  rotation?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useCursor(hovered);
  
  const bodyColor = online ? '#10b981' : '#6b7280';
  const headColor = online ? '#06b6d4' : '#9ca3af';
  const glowColor = online ? '#34d399' : '#4b5563';
  const hoverScale = hovered ? 1.15 : 1;

  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      <Float speed={online ? 2 : 0} rotationIntensity={0.1} floatIntensity={online ? 0.3 : 0}>
        <group scale={hoverScale} rotation={rotation}>
          {/* 头部 */}
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color={headColor} roughness={0.3} metalness={0.2} />
          </mesh>
          
          {/* 眼睛 */}
          {online && (
            <>
              <mesh position={[-0.06, 0.58, 0.16]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
              </mesh>
              <mesh position={[0.06, 0.58, 0.16]}>
                <sphereGeometry args={[0.035, 8, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
              </mesh>
              {/* 瞳孔 */}
              <mesh position={[-0.06, 0.58, 0.19]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="#1f2937" />
              </mesh>
              <mesh position={[0.06, 0.58, 0.19]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="#1f2937" />
              </mesh>
            </>
          )}
          
          {/* 身体 */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 0.35, 16]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
          
          {/* 手臂 */}
          <mesh position={[-0.22, 0.32, 0]} rotation={[0, 0, Math.PI / 6]}>
            <capsuleGeometry args={[0.045, 0.15, 4, 8]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
          <mesh position={[0.22, 0.32, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <capsuleGeometry args={[0.045, 0.15, 4, 8]} />
            <meshStandardMaterial color={bodyColor} roughness={0.4} />
          </mesh>
          
          {/* 状态光环 - 在线呼吸效果 */}
          {online && (
            <mesh position={[0, 0.28, 0]}>
              <sphereGeometry args={[0.28, 16, 16]} />
              <meshStandardMaterial 
                color={glowColor} 
                transparent 
                opacity={0.15} 
                side={THREE.BackSide}
              />
            </mesh>
          )}
        </group>
      </Float>
      
      {/* 底座 */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.38, 32]} />
        <meshStandardMaterial 
          color={hovered ? '#f59e0b' : glowColor} 
          transparent 
          opacity={hovered ? 0.8 : 0.5} 
        />
      </mesh>
      
      {/* 名字标签 */}
      <Text
        position={[0, 1.0, 0]}
        fontSize={0.18}
        color={hovered ? '#fbbf24' : (online ? '#34d399' : '#9ca3af')}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
      >
        {agentName}
      </Text>
      
      {/* 悬停提示 */}
      {hovered && (
        <Html position={[0, 1.3, 0]} center distanceFactor={8}>
          <div className="px-3 py-1.5 bg-gray-900/90 text-white text-xs rounded-lg whitespace-nowrap backdrop-blur-sm border border-gray-700">
            {online ? '🟢 在线工作' : '⚪ 空闲等待'}
          </div>
        </Html>
      )}
    </group>
  );
}

// 工位 - 可点击
function Desk({ position, online, agentName, onClick }: { 
  position: [number, number, number]; 
  online: boolean;
  agentName: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  
  const accentColor = online ? '#10b981' : '#94a3b8';
  const deskColor = hovered ? '#f1f5f9' : '#e2e8f0';
  
  return (
    <group 
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onClick}
    >
      {/* 桌面 */}
      <RoundedBox args={[1.5, 0.06, 0.75]} radius={0.02} position={[0, 0.38, 0]}>
        <meshStandardMaterial 
          color={deskColor} 
          roughness={0.5} 
        />
        <Edges color={hovered ? accentColor : '#94a3b8'} threshold={15} />
      </RoundedBox>
      
      {/* 桌腿 */}
      {[[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.19, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.38, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      
      {/* 显示器支架 */}
      <mesh position={[0, 0.5, -0.28]}>
        <cylinderGeometry args={[0.03, 0.08, 0.25, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* 显示器 */}
      <RoundedBox args={[0.7, 0.45, 0.04]} radius={0.03} position={[0, 0.72, -0.28]}>
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </RoundedBox>
      
      {/* 屏幕内容 - 根据状态显示不同颜色 */}
      <mesh position={[0, 0.72, -0.255]}>
        <planeGeometry args={[0.6, 0.38]} />
        <meshStandardMaterial 
          color={accentColor} 
          emissive={accentColor} 
          emissiveIntensity={online ? 0.5 : 0.2} 
        />
      </mesh>
      
      {/* 键盘 */}
      <RoundedBox args={[0.45, 0.025, 0.16]} radius={0.01} position={[0, 0.41, 0.18]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </RoundedBox>
      
      {/* 鼠标 */}
      <RoundedBox args={[0.07, 0.025, 0.11]} radius={0.02} position={[0.32, 0.4, 0.18]}>
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </RoundedBox>
      
      {/* 音箱 */}
      <RoundedBox args={[0.08, 0.12, 0.08]} radius={0.01} position={[-0.6, 0.47, -0.2]}>
        <meshStandardMaterial color="#94a3b8" roughness={0.6} />
      </RoundedBox>
      
      {/* 小植物 */}
      <group position={[-0.58, 0.41, 0.1]}>
        {/* 花盆 */}
        <mesh>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 8]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.8} />
        </mesh>
        {/* 土壤 */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        {/* 植物 */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.sin(i * 2.1) * 0.03, 0.1 + i * 0.04, Math.cos(i * 2.1) * 0.03]} rotation={[0.2, i * 0.5, 0]}>
            <coneGeometry args={[0.025, 0.08, 4]} />
            <meshStandardMaterial color={i === 0 ? '#22c55e' : '#16a34a'} roughness={0.6} />
          </mesh>
        ))}
      </group>
      
      {/* 椅子 - 浅色 */}
      <group position={[0, 0, 0.55]}>
        <RoundedBox args={[0.4, 0.08, 0.4]} radius={0.02} position={[0, 0.22, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.38, 0.35, 0.04]} radius={0.01} position={[0, 0.42, -0.18]} rotation={[0.15, 0, 0]}>
          <meshStandardMaterial color="#94a3b8" roughness={0.7} />
        </RoundedBox>
        {/* 椅子腿 */}
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

// 地板
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
    </mesh>
  );
}

// 地板装饰图案
function FloorPattern() {
  return (
    <group>
      <gridHelper args={[16, 16, '#94a3b8', '#cbd5e1']} position={[0, 0.005, 0]} />
      {/* 主走道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <planeGeometry args={[2, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} />
      </mesh>
    </group>
  );
}

// 墙壁
function Walls() {
  return (
    <group>
      {/* 背面墙 - 带窗户 */}
      <mesh position={[0, 2.5, -5.5]}>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>
      
      {/* 窗户 - 蓝天白云效果 */}
      <group position={[-4, 2.8, -5.48]}>
        <mesh>
          <boxGeometry args={[2.5, 1.8, 0.05]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.6} />
        </mesh>
        {/* 窗框 */}
        <mesh>
          <boxGeometry args={[2.6, 0.06, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 1.9, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
      </group>
      
      <group position={[4, 2.8, -5.48]}>
        <mesh>
          <boxGeometry args={[2.5, 1.8, 0.05]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.6, 0.06, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.06, 1.9, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.4} />
        </mesh>
      </group>
      
      {/* 侧面墙 */}
      <mesh position={[-8, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
      </mesh>
    </group>
  );
}

// 装饰元素
function Decor() {
  return (
    <group>
      {/* 吸顶灯 - 日光效果 */}
      <group position={[0, 4, 0]}>
        <mesh>
          <boxGeometry args={[1.2, 0.08, 0.4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        <pointLight position={[0, -0.1, 0]} intensity={1} color="#ffffff" distance={15} decay={2} />
      </group>
      
      {/* 区域灯光 - 温暖色调 */}
      {[[-4, 3.5, -2], [0, 3.5, -2], [4, 3.5, -2]].map(([x, y, z], i) => (
        <pointLight key={i} position={[x, y, z]} intensity={0.4} color="#fef3c7" distance={8} decay={2} />
      ))}
      
      {/* 空调出风口 */}
      <group position={[6, 3.8, -4]}>
        <mesh>
          <boxGeometry args={[1.5, 0.12, 0.4]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.2} />
        </mesh>
      </group>
      
      {/* 墙壁装饰 - 地图/海报 */}
      <group position={[-7.95, 2, 2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.8} />
        </mesh>
        <Text
          position={[0, 0, 0.01]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          MISSION CONTROL
        </Text>
      </group>
      
      {/* 柱子 - 淡灰色 */}
      {[[-6, 0, -4], [6, 0, -4], [-6, 0, 4], [6, 0, 4]].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 4, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.6} />
          </mesh>
        </group>
      ))}
      
      {/* 角落植物 - 花盆 */}
      <group position={[7, 0, 4]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.25, 0.5, 8]} />
          <meshStandardMaterial color="#d97706" roughness={0.8} />
        </mesh>
        {/* 大叶子植物 */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.sin(i * 1.2) * 0.15, 0.5 + i * 0.15, Math.cos(i * 1.2) * 0.15]} rotation={[0.3, i * 0.8, 0.2]}>
            <coneGeometry args={[0.12, 0.4, 4]} />
            <meshStandardMaterial color="#22c55e" roughness={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// 老板办公室 - 一波的专属空间
function BossOffice({ position, state }: { position: [number, number, number]; state: string }) {
  const stateColors: Record<string, string> = {
    'working': '#10b981',
    '外出': '#f59e0b',
    '喝茶': '#8b5cf6',
    '巡视': '#3b82f6',
  };
  const accentColor = stateColors[state] || '#10b981';
  
  return (
    <group position={position}>
      {/* 地面 - 地毯 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[4, 3.5]} />
        <meshStandardMaterial color="#92400e" roughness={0.9} />
      </mesh>
      
      {/* 墙壁 - 半透明隔断 */}
      <mesh position={[-2, 1.5, 1.75]}>
        <boxGeometry args={[0.08, 3, 0.08]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
      </mesh>
      <mesh position={[2, 1.5, 1.75]}>
        <boxGeometry args={[0.08, 3, 0.08]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
      </mesh>
      
      {/* 老板桌 */}
      <group position={[0, 0, 0]}>
        <RoundedBox args={[2.0, 0.08, 0.9]} radius={0.03} position={[0, 0.42, 0]}>
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </RoundedBox>
        
        {/* 桌腿 */}
        {[[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.21, z]}>
            <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
            <meshStandardMaterial color="#374151" metalness={0.6} />
          </mesh>
        ))}
        
        {/* 大显示器 */}
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
        
        {/* 键盘垫 */}
        <RoundedBox args={[0.5, 0.02, 0.2]} radius={0.01} position={[0, 0.47, 0.2]}>
          <meshStandardMaterial color="#1f2937" />
        </RoundedBox>
        
        {/* 盆栽 */}
        <group position={[-0.85, 0.45, -0.25]}>
          <mesh><cylinderGeometry args={[0.08, 0.06, 0.15, 8]} /><meshStandardMaterial color="#b45309" /></mesh>
          {[0,1,2].map(i => (
            <mesh key={i} position={[Math.sin(i*2)*0.05, 0.15+i*0.1, Math.cos(i*2)*0.05]} rotation={[0.2,i*0.6,0.1]}>
              <coneGeometry args={[0.06, 0.2, 4]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
          ))}
        </group>
      </group>
      
      {/* 老板椅 */}
      <group position={[0, 0, 0.75]}>
        <RoundedBox args={[0.55, 0.1, 0.55]} radius={0.03} position={[0, 0.28, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.75, 0.06]} radius={0.03} position={[0, 0.65, -0.25]} rotation={[0.1, 0, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </RoundedBox>
      </group>
      
      {/* 沙发 - 接待客人 */}
      <group position={[1.3, 0, 0.8]}>
        {/* 底座 */}
        <RoundedBox args={[1.2, 0.25, 0.5]} radius={0.05} position={[0, 0.125, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        {/* 靠背 */}
        <RoundedBox args={[1.2, 0.5, 0.12]} radius={0.04} position={[0, 0.5, -0.2]} rotation={[0.15, 0, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        {/* 扶手 */}
        <RoundedBox args={[0.1, 0.35, 0.4]} radius={0.03} position={[-0.55, 0.35, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[0.1, 0.35, 0.4]} radius={0.03} position={[0.55, 0.35, 0]}>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        {/* 沙发垫 */}
        <RoundedBox args={[1.1, 0.08, 0.4]} radius={0.02} position={[0, 0.29, 0.05]}>
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </RoundedBox>
      </group>
      
      {/* 茶几 */}
      <group position={[1.3, 0, -0.3]}>
        <RoundedBox args={[0.5, 0.04, 0.35]} radius={0.02} position={[0, 0.32, 0]}>
          <meshStandardMaterial color="#78350f" roughness={0.6} />
        </RoundedBox>
        <mesh position={[-0.18, 0.16, 0]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[0.18, 0.16, 0]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[-0.18, 0.16, -0.12]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
        <mesh position={[0.18, 0.16, -0.12]}><cylinderGeometry args={[0.02, 0.02, 0.3, 6]} /><meshStandardMaterial color="#374151" /></mesh>
      </group>
      
      {/* 名字+状态标签 */}
      <Text position={[0, 2, -0.5]} fontSize={0.22} color={accentColor} anchorX="center" outlineWidth={0.015} outlineColor="#000">一波</Text>
      <Text position={[0, 1.7, -0.5]} fontSize={0.13} color="#64748b" anchorX="center">
        {state === 'working' ? '💻 工作' : state === '外出' ? '🚗 外出' : state === '喝茶' ? '☕ 喝茶' : '🔍 巡视'}
      </Text>
    </group>
  );
}

// 整个办公室场景
function OfficeContent({ agents, onAgentClick }: { agents: Agent[]; onAgentClick?: (agent: Agent) => void }) {
  const cols = 3;
  const spacingX = 3.5;
  const spacingZ = 3;
  const offsetX = -((Math.min(agents.length, cols) - 1) * spacingX) / 2;

  return (
    <>
      {/* 灯光 - 明亮自然 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 15, 10]} intensity={0.7} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-8, 10, -8]} intensity={0.2} color="#bfdbfe" />
      
      {/* 环境 */}
      <Floor />
      <FloorPattern />
      <Walls />
      <Decor />
      
      {/* 老板办公室 - 一波 */}
      <BossOffice position={[0, 0, -4.5]} state="working" />
      
      {/* 工位和小人 - 排除 boss */}
      {agents.filter(a => a.agent_key !== 'boss').slice(0, 5).map((agent, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = offsetX + col * spacingX;
        const z = -2 + row * spacingZ;
        const online = isOnline(agent.state);
        
        return (
          <group key={agent.id}>
            <Desk 
              position={[x, 0, z]} 
              online={online} 
              agentName={agent.display_name || agent.agent_key}
              onClick={() => onAgentClick?.(agent)}
            />
            <AgentFigure 
              position={[x, 0.4, z + 0.65]} 
              rotation={[0, Math.PI, 0]}
              online={online} 
              agentName={agent.display_name || agent.agent_key}
              onClick={() => onAgentClick?.(agent)}
            />
          </group>
        );
      })}
      
      {/* 交互控制 */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={18}
        autoRotate={false}
      />
    </>
  );
}

interface OfficeSceneProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
}

export default function OfficeScene({ agents, onAgentClick }: OfficeSceneProps) {
  return (
    <div className="h-[380px] rounded-xl overflow-hidden border border-[var(--border-light)] bg-gradient-to-b from-slate-100 to-slate-200 relative">
      {/* 提示标签 */}
      <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-white/80 text-slate-600 text-xs rounded shadow-sm backdrop-blur-sm">
        🖱️ 拖动旋转 · 滚轮缩放 · 点击查看
      </div>
      
      <Canvas
        camera={{ position: [10, 8, 10], fov: 32 }}
        shadows
        gl={{ antialias: true }}
      >
        <OfficeContent agents={agents} onAgentClick={onAgentClick} />
      </Canvas>
    </div>
  );
}
