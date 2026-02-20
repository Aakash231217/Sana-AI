import { MathUtils } from "./FFTUtils";

/**
 * Calculates cognitive indices based on the specific required formulas.
 * ASI, ICI, WME, PCI, CFI.
 * 
 * Each index should implement exactly the clamp(0,1) specifications.
 */
export class IndexCalculator {
    static computeASI(g1_missRate: number, g1_rM: number, g1_rL: number): number {
        // Example formula conceptualization (would use real ones from the config)
        // Assume inverse severity
        const val = 1.0 - (g1_missRate * 0.5 + g1_rL * 0.3 + g1_rM * 0.2);
        return MathUtils.clamp(val, 0, 1);
    }

    static computeICI(g2_commission: number, g2_rH: number): number {
        const val = 1.0 - (g2_commission * 0.6 + g2_rH * 0.4);
        return MathUtils.clamp(val, 0, 1);
    }

    static computeWME(g3_accuracy: number): number {
        // Pure accuracy bounded mapping
        return MathUtils.clamp(g3_accuracy, 0, 1);
    }

    static computePCI(g4_cv: number, g4_rH: number): number {
        const val = 1.0 - (g4_cv * 0.5 + g4_rH * 0.5);
        return MathUtils.clamp(val, 0, 1);
    }

    static computeCFI(g5_switchCost: number): number {
        // Normalized by 400ms as per spec
        const normalizedSC = g5_switchCost / 400.0;
        const val = 1.0 - normalizedSC;
        return MathUtils.clamp(val, 0, 1);
    }

    static determinePriorityDomain(indices: {
        ASI: number;
        ICI: number;
        WME: number;
        PCI: number;
        CFI: number;
    }): string {
        const mapped = [
            { name: "Sustained Attention", val: indices.ASI },
            { name: "Impulse Control", val: indices.ICI },
            { name: "Working Memory", val: indices.WME },
            { name: "Processing Speed", val: indices.PCI },
            { name: "Cognitive Flexibility", val: indices.CFI },
        ];

        // Priority domain = lowest index
        mapped.sort((a, b) => a.val - b.val);
        return mapped[0].name;
    }
}
