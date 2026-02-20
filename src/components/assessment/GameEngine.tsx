"use client";
import React, { useState, useEffect } from "react";
import FocusFlow from "./games/FocusFlow";
import StopAndGo from "./games/StopAndGo";
import MemorySteps from "./games/MemorySteps";
import SteadySpeed from "./games/SteadySpeed";
import SwitchSmart from "./games/SwitchSmart";
import { api } from "@/trpc/react";
import { FFTUtils } from "@/utils/assessment/FFTUtils";
import { IndexCalculator } from "@/utils/assessment/IndexCalculator";
import { PrescriptionEngine } from "@/utils/assessment/PrescriptionEngine";

// Using require to load JSON synchronously
const config = require("../../../public/assets/assessment_config.json");

interface GameEngineProps {
    childId: string;
    grade: number;
    onSessionComplete: () => void;
}

export default function GameEngine({ childId, grade, onSessionComplete }: GameEngineProps) {
    const [currentGame, setCurrentGame] = useState(1);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const startSessionMut = api.assessment.startSession.useMutation();
    const logTrialsMut = api.assessment.logTrials.useMutation();
    const saveTaskResultMut = api.assessment.saveTaskResult.useMutation();
    const finalizeSessionMut = api.assessment.finalizeSession.useMutation();

    // Temporary storage for gathered indices before finalization
    const [gatheredIndices, setGatheredIndices] = useState<any>({
        ASI: 0, ICI: 0, WME: 0, PCI: 0, CFI: 0
    });

    useEffect(() => {
        // Start session in DB on mount
        startSessionMut.mutate(
            { childId, configVersion: config.version },
            { onSuccess: (data) => setSessionId(data.id) }
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [childId]);

    const handleGameComplete = async (gameId: string, trials: any[], rawMetrics: any, nextGame: number) => {
        if (!sessionId) return;

        // 1. Log Trials Batch
        await logTrialsMut.mutateAsync({ sessionId, trials });

        let finalIndices = { ...gatheredIndices };

        // 2. Process FFT & Task Results based on game
        if (gameId === "G1_FocusFlow") {
            const rtList = trials.map(t => t.rtMs);
            const processed = FFTUtils.preprocessRT(rtList);
            const fft = FFTUtils.extractFeatures(processed, config.games.G1_FocusFlow.cycleMs);

            const asi = IndexCalculator.computeASI(rawMetrics.missRate, fft.rM, fft.rL);
            finalIndices.ASI = asi;

            await saveTaskResultMut.mutateAsync({
                sessionId, gameId,
                missRate: rawMetrics.missRate, commissionRate: rawMetrics.commissionRate,
                ...fft
            });
        }
        else if (gameId === "G2_StopAndGo") {
            const rtList = trials.map(t => t.rtMs);
            const processed = FFTUtils.preprocessRT(rtList);
            const fft = FFTUtils.extractFeatures(processed, config.games.G2_StopAndGo.cycleMs);

            const ici = IndexCalculator.computeICI(rawMetrics.commissionRate, fft.rH);
            finalIndices.ICI = ici;

            await saveTaskResultMut.mutateAsync({
                sessionId, gameId,
                commissionRate: rawMetrics.commissionRate,
                ...fft
            });
        }
        else if (gameId === "G3_MemorySteps") {
            const wme = IndexCalculator.computeWME(rawMetrics.accuracy);
            finalIndices.WME = wme;

            await saveTaskResultMut.mutateAsync({
                sessionId, gameId,
                accuracy: rawMetrics.accuracy
            });
        }
        else if (gameId === "G4_SteadySpeed") {
            const rtList = trials.map(t => t.rtMs);
            const processed = FFTUtils.preprocessRT(rtList);
            // G4 is response driven, so cycleMs approximation (gap + meanRt)
            const approxCycle = config.games.G4_SteadySpeed.gapMs + (rawMetrics.meanRt || 300);
            const fft = FFTUtils.extractFeatures(processed, approxCycle);

            const pci = IndexCalculator.computePCI(rawMetrics.cv, fft.rH);
            finalIndices.PCI = pci;

            await saveTaskResultMut.mutateAsync({
                sessionId, gameId,
                ...fft
            });
        }
        else if (gameId === "G5_SwitchSmart") {
            const rtList = trials.map(t => t.rtMs);
            const processed = FFTUtils.preprocessRT(rtList);
            const fft = FFTUtils.extractFeatures(processed, config.games.G5_SwitchSmart.cycleMs);

            const cfi = IndexCalculator.computeCFI(rawMetrics.switchCostMs);
            finalIndices.CFI = cfi;

            await saveTaskResultMut.mutateAsync({
                sessionId, gameId,
                switchCostMs: rawMetrics.switchCostMs, accuracy: rawMetrics.accuracy,
                ...fft
            });
        }

        setGatheredIndices(finalIndices);

        // Transition or finalize
        if (nextGame > 5) {
            // Finalize Session
            const priority = IndexCalculator.determinePriorityDomain(finalIndices);
            const plan = PrescriptionEngine.generatePlan({ ...finalIndices, priorityDomain: priority });

            await finalizeSessionMut.mutateAsync({
                sessionId,
                status: "COMPLETED",
                reportPlanJson: plan,
                indices: {
                    asi: finalIndices.ASI,
                    ici: finalIndices.ICI,
                    wme: finalIndices.WME,
                    pci: finalIndices.PCI,
                    cfi: finalIndices.CFI,
                    priorityDomain: priority
                }
            });
            onSessionComplete();
        } else {
            setCurrentGame(nextGame);
        }
    };

    if (!sessionId) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Initializing Secure Session...</div>;
    }

    // Determine grade cap dynamically
    let gradeCap = 4;
    if (grade >= 5 && grade <= 6) gradeCap = 5;
    if (grade >= 7 && grade <= 8) gradeCap = 6;
    if (grade >= 9) gradeCap = 7;

    return (
        <div className="max-w-4xl mx-auto w-full p-4">
            {currentGame === 1 && <FocusFlow config={config.games.G1_FocusFlow} onComplete={(t, m) => handleGameComplete("G1_FocusFlow", t, m, 2)} />}
            {currentGame === 2 && <StopAndGo config={config.games.G2_StopAndGo} onComplete={(t, m) => handleGameComplete("G2_StopAndGo", t, m, 3)} />}
            {currentGame === 3 && <MemorySteps config={{ ...config.games.G3_MemorySteps, gradeCap }} onComplete={(t, m) => handleGameComplete("G3_MemorySteps", t, m, 4)} />}
            {currentGame === 4 && <SteadySpeed config={config.games.G4_SteadySpeed} onComplete={(t, m) => handleGameComplete("G4_SteadySpeed", t, m, 5)} />}
            {currentGame === 5 && <SwitchSmart config={config.games.G5_SwitchSmart} onComplete={(t, m) => handleGameComplete("G5_SwitchSmart", t, m, 6)} />}
        </div>
    );
}
