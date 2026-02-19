"use client";

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Float, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { MascotEmotion } from '@/utils/emotionDetector';

interface Mascot3DProps {
    state: MascotEmotion;
    className?: string;
    onClick?: () => void;
}

// Particle component for visual effects
function EmoteParticles({ emotion }: { emotion: MascotEmotion }) {
    const particlesRef = useRef<THREE.Points>(null);
    const [particles] = useState(() => {
        const count = 20;
        const positions = new Float32Array(count * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                Math.random() * 0.03 + 0.01,
                (Math.random() - 0.5) * 0.02
            ));
        }
        return { positions, velocities };
    });

    useFrame(() => {
        if (!particlesRef.current) return;
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

        for (let i = 0; i < 20; i++) {
            positions[i * 3] += particles.velocities[i].x;
            positions[i * 3 + 1] += particles.velocities[i].y;
            positions[i * 3 + 2] += particles.velocities[i].z;

            // Reset particles that go too high
            if (positions[i * 3 + 1] > 3) {
                positions[i * 3] = (Math.random() - 0.5) * 2;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
            }
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    // Different colors for different emotions
    const particleColor = useMemo(() => {
        switch (emotion) {
            case 'celebrating': return '#ffd700';
            case 'excited': return '#ff6b6b';
            case 'happy': return '#4ade80';
            case 'encouraging': return '#60a5fa';
            default: return '#a78bfa';
        }
    }, [emotion]);

    const shouldShow = ['celebrating', 'excited', 'happy', 'encouraging'].includes(emotion);

    if (!shouldShow) return null;

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[particles.positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color={particleColor}
                transparent
                opacity={0.8}
                sizeAttenuation
            />
        </points>
    );
}

// Emoji bubble component
function EmoteBubble({ emotion }: { emotion: MascotEmotion }) {
    const emojis: Partial<Record<MascotEmotion, string>> = {
        celebrating: '🎉',
        excited: '✨',
        happy: '😊',
        encouraging: '💪',
        confused: '🤔',
        listening: '👂',
    };

    const emoji = emojis[emotion];
    if (!emoji) return null;

    return (
        <Html position={[1.2, 1.5, 0]} center>
            <div className="animate-bounce text-3xl select-none pointer-events-none drop-shadow-lg">
                {emoji}
            </div>
        </Html>
    );
}

const Mascot3DComponent: React.FC<Mascot3DProps> = ({ state, className = '', onClick }) => {
    // Get Float parameters based on emotion
    const floatParams = useMemo(() => {
        switch (state) {
            case 'excited':
            case 'celebrating':
                return { speed: 4, rotationIntensity: 0.8, floatIntensity: 1.2, floatingRange: [-0.25, 0.25] as [number, number] };
            case 'happy':
                return { speed: 3, rotationIntensity: 0.5, floatIntensity: 1.0, floatingRange: [-0.2, 0.2] as [number, number] };
            case 'thinking':
            case 'confused':
                return { speed: 1.5, rotationIntensity: 0.2, floatIntensity: 0.4, floatingRange: [-0.1, 0.1] as [number, number] };
            case 'listening':
                return { speed: 2, rotationIntensity: 0.3, floatIntensity: 0.5, floatingRange: [-0.12, 0.12] as [number, number] };
            default:
                return { speed: 2.5, rotationIntensity: 0.4, floatIntensity: 0.8, floatingRange: [-0.15, 0.15] as [number, number] };
        }
    }, [state]);

    return (
        <div className={`relative w-full h-full ${className}`}>
            <Canvas
                camera={{ position: [0, 0.5, 8], fov: 50 }}
                gl={{ alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={2.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2.5} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1.2} color="#3b82f6" />
                <directionalLight position={[0, 5, 5]} intensity={2} />
                <pointLight position={[5, 0, 5]} intensity={0.8} color="#8b5cf6" />

                <Float
                    speed={floatParams.speed}
                    rotationIntensity={floatParams.rotationIntensity}
                    floatIntensity={floatParams.floatIntensity}
                    floatingRange={floatParams.floatingRange}
                >
                    <Model state={state} onClick={onClick} />
                    <EmoteParticles emotion={state} />
                    <EmoteBubble emotion={state} />
                </Float>
            </Canvas>
        </div>
    );
};

export const Mascot3D = React.memo(Mascot3DComponent);

function Model({ state, onClick }: { state: MascotEmotion; onClick?: () => void }) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF('/robot_mascot.glb');
    const { actions, names } = useAnimations(animations, group);
    const [clickAnim, setClickAnim] = useState<string | null>(null);

    // Identify animation names once
    const waveAnimName = names.find(n => n.includes('Layer0.002')) || names[0];
    const actionAnimName = names.find(n => n.includes('Layer0')) && !names.find(n => n.includes('Layer0.002')) ? 'Armature|mixamo.com|Layer0' : names[1];

    const handleModelClick = (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        const availableAnims = [waveAnimName, actionAnimName].filter(Boolean) as string[];
        const randomAnim = availableAnims[Math.floor(Math.random() * availableAnims.length)];

        if (randomAnim) {
            setClickAnim(randomAnim);
            setTimeout(() => setClickAnim(null), 2500);
        }

        if (onClick) onClick();
    };

    // Get animation settings based on emotion
    const getAnimationSettings = (emotion: MascotEmotion) => {
        switch (emotion) {
            case 'celebrating':
                return { anim: actionAnimName, timeScale: 2.0, loop: THREE.LoopRepeat };
            case 'excited':
                return { anim: actionAnimName, timeScale: 1.8, loop: THREE.LoopRepeat };
            case 'happy':
                return { anim: waveAnimName, timeScale: 1.5, loop: THREE.LoopRepeat };
            case 'thinking':
                return { anim: actionAnimName, timeScale: 1.2, loop: THREE.LoopRepeat };
            case 'speaking':
                return { anim: waveAnimName, timeScale: 2.0, loop: THREE.LoopRepeat };
            case 'encouraging':
                return { anim: waveAnimName, timeScale: 1.3, loop: THREE.LoopRepeat };
            case 'confused':
                return { anim: actionAnimName, timeScale: 0.7, loop: THREE.LoopOnce };
            case 'listening':
                return { anim: waveAnimName, timeScale: 0.8, loop: THREE.LoopOnce };
            case 'idle':
            default:
                return { anim: waveAnimName, timeScale: 1.0, loop: THREE.LoopOnce };
        }
    };

    useEffect(() => {
        // Stop all animations first
        Object.values(actions).forEach(action => action?.fadeOut(0.5));

        if (clickAnim && actions[clickAnim]) {
            // Priority: Click Animation
            actions[clickAnim]?.reset().fadeIn(0.2).play();
            actions[clickAnim]!.timeScale = 1.5;
        } else {
            const settings = getAnimationSettings(state);
            const action = actions[settings.anim];

            if (action) {
                action.reset().fadeIn(0.5).play();
                action.timeScale = settings.timeScale;
                action.setLoop(settings.loop, settings.loop === THREE.LoopOnce ? 1 : Infinity);
                if (settings.loop === THREE.LoopOnce) {
                    action.clampWhenFinished = true;
                }
            }
        }
    }, [state, clickAnim, actions, waveAnimName, actionAnimName]);

    return (
        <group
            ref={group}
            dispose={null}
            onClick={handleModelClick}
            onPointerEnter={() => document.body.style.cursor = 'pointer'}
            onPointerLeave={() => document.body.style.cursor = 'auto'}
        >
            <primitive object={scene} scale={2.5} position={[0, -2.2, 0]} rotation={[0.05, 0, 0]} />
        </group>
    );
}
