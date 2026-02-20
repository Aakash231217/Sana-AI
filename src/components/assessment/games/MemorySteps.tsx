"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TimeProvider } from "@/utils/assessment/TimeProvider";

/**
 * G3 — Memory Steps
 * Purpose: Working memory under load
 * Specs: 15 sequences, adaptive length based on grade
 */

interface MemoryStepsProps {
    onComplete: (
        trials: any[],
        metrics: { accuracy: number }
    ) => void;
    config: {
        sequences: number;
        gradeCap: number; // passed directly from engine evaluating child's grade
    };
}

export default function MemorySteps({ onComplete, config }: MemoryStepsProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [sequenceIndex, setSequenceIndex] = useState(0);
    const [currentPattern, setCurrentPattern] = useState<number[]>([]);
    const [isShowingPattern, setIsShowingPattern] = useState(false);
    const [activeSquare, setActiveSquare] = useState<number | null>(null);

    const [userInput, setUserInput] = useState<number[]>([]);
    const trialData = useRef<any[]>([]);
    const stepStartMs = useRef<number>(0);
    const interactionLock = useRef<boolean>(false);

    const startSequence = useCallback((index: number) => {
        if (index >= config.sequences) {
            const correctSequences = trialData.current.filter((t) => t.correct).length;
            onComplete(trialData.current, { accuracy: correctSequences / config.sequences });
            return;
        }

        setSequenceIndex(index);
        setUserInput([]);
        setIsShowingPattern(true);
        interactionLock.current = true;

        // Adaptive Length: start at 2, scale up based on index, capped by gradeCap
        const targetLength = Math.min(2 + Math.floor(index / 3), config.gradeCap);

        const newPattern: number[] = [];
        for (let i = 0; i < targetLength; i++) {
            newPattern.push(Math.floor(Math.random() * 9));
        }
        setCurrentPattern(newPattern);

        // Playback pattern visually
        let step = 0;
        const playStep = () => {
            if (step >= newPattern.length) {
                setActiveSquare(null);
                setIsShowingPattern(false);
                interactionLock.current = false;
                stepStartMs.current = TimeProvider.now(); // Start timing response
                return;
            }

            setActiveSquare(newPattern[step]);
            setTimeout(() => {
                setActiveSquare(null);
                setTimeout(() => {
                    step++;
                    playStep();
                }, 300); // Gap between flashes
            }, 700); // Length of flash
        };

        setTimeout(playStep, 1000); // Initial delay before sequence plays
    }, [config, onComplete]);

    const handleSquareClick = (squareIdx: number) => {
        if (interactionLock.current || isShowingPattern) return;

        const rt = TimeProvider.elapsedSince(stepStartMs.current);
        stepStartMs.current = TimeProvider.now(); // reset for next tap

        const newUserInput = [...userInput, squareIdx];
        setUserInput(newUserInput);

        // Provide visual feedback quickly
        setActiveSquare(squareIdx);
        setTimeout(() => setActiveSquare(null), 150);

        const isMatchSoFar = newUserInput.every((val, i) => val === currentPattern[i]);

        if (!isMatchSoFar) {
            // Failed sequence
            trialData.current.push({
                gameId: "G3_MemorySteps",
                trialIndex: sequenceIndex,
                trialStartMs: stepStartMs.current, // timestamp of last step
                stimulusType: `length_${currentPattern.length}`,
                rtMs: rt, // average or sum can be calculated by backend
                correct: false,
            });
            interactionLock.current = true;
            setTimeout(() => startSequence(sequenceIndex + 1), 1000); // move to next
        } else if (newUserInput.length === currentPattern.length) {
            // Completed sequence successfully
            trialData.current.push({
                gameId: "G3_MemorySteps",
                trialIndex: sequenceIndex,
                trialStartMs: stepStartMs.current,
                stimulusType: `length_${currentPattern.length}`,
                rtMs: rt,
                correct: true,
            });
            interactionLock.current = true;
            setTimeout(() => startSequence(sequenceIndex + 1), 1000); // move to next
        }
    };

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Memory Steps</h2>
                <p className="mb-6 text-gray-600 max-w-md">
                    Watch the tiles light up in a pattern.<br />
                    When they stop, tap the tiles in the <strong>exact same order</strong>.
                </p>
                <button
                    onClick={() => {
                        setHasStarted(true);
                        startSequence(0);
                    }}
                    className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                    Start Task
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[500px] border border-gray-200 rounded-xl bg-gray-50 select-none">
            <div className="w-full flex justify-between px-6 py-4 absolute top-0 text-sm text-gray-400">
                <span>Memory Steps</span>
                <span>{Math.min(sequenceIndex + 1, config.sequences)} / {config.sequences}</span>
            </div>

            <div className={`text-sm mb-8 h-6 font-medium ${isShowingPattern ? 'text-blue-500' : 'text-green-600'}`}>
                {isShowingPattern ? "Watch carefully..." : "Your turn!"}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div
                        key={i}
                        onPointerDown={() => handleSquareClick(i)}
                        className={`
              w-24 h-24 rounded-xl shadow-sm border-2 transition-colors duration-100 ease-in
              ${activeSquare === i ? 'bg-blue-500 border-blue-600 ring-4 ring-blue-200' : 'bg-white border-gray-200'}
              ${!isShowingPattern ? 'cursor-pointer hover:bg-gray-50' : ''}
            `}
                    />
                ))}
            </div>
        </div>
    );
}
