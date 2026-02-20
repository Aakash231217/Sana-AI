/**
 * Custom math and FFT utility for cognitive assessment metrics.
 * Built into the app to avoid heavy external dependencies.
 */

export class MathUtils {
    /**
     * Clamp a value between min and max
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Median Absolute Deviation
     */
    static getMAD(arr: number[]): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const absoluteDeviations = arr.map((x) => Math.abs(x - median));
        const sortedDeviations = absoluteDeviations.sort((a, b) => a - b);
        return sortedDeviations[Math.floor(sortedDeviations.length / 2)];
    }

    static getMedian(arr: number[]): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
    }

    static getMean(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

export class FFTUtils {
    /**
     * Preprocessing pipeline for RT arrays
     */
    static preprocessRT(
        rawRTs: (number | null)[],
        minRt: number = 150,
        maxRt: number = 3000
    ): number[] {
        // 1. Array of numeric RTs or nulls for misses
        let processed = rawRTs.map((rt) => {
            if (rt === null) return null;
            if (rt < minRt) return null; // remove anticipations
            if (rt > maxRt) return maxRt; // winsorize upper bound
            return rt;
        });

        // 2. Impute misses (Median + 2*Sigma/MAD)
        const validRTs = processed.filter((rt): rt is number => rt !== null);
        if (validRTs.length === 0) return Array(rawRTs.length).fill(0);

        const median = MathUtils.getMedian(validRTs);
        const mad = MathUtils.getMAD(validRTs);
        const imputedValue = median + 2 * (1.4826 * mad); // 1.4826 scale factor for normal distribution approx

        processed = processed.map((rt) => (rt === null ? imputedValue : rt));

        // 3. Linear detrend
        const detrended = this.linearDetrend(processed as number[]);

        // 4. Hann Window
        return this.applyHannWindow(detrended);
    }

    static linearDetrend(arr: number[]): number[] {
        const n = arr.length;
        let sumX = 0,
            sumY = 0,
            sumXY = 0,
            sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += arr[i];
            sumXY += i * arr[i];
            sumXX += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return arr.map((y, i) => y - (slope * i + intercept));
    }

    static applyHannWindow(arr: number[]): number[] {
        const n = arr.length;
        return arr.map(
            (val, i) => val * (0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))))
        );
    }

    /**
     * Radix-2 Cooley-Tukey FFT
     * Array length must be power of 2
     */
    static computeFFT(real: number[], imag: number[]): void {
        const n = real.length;
        if (n <= 1) return;

        // Bit reversal
        let j = 0;
        for (let i = 0; i < n - 1; i++) {
            if (i < j) {
                let tempReal = real[i];
                let tempImag = imag[i];
                real[i] = real[j];
                imag[i] = imag[j];
                real[j] = tempReal;
                imag[j] = tempImag;
            }
            let m = n >> 1;
            while (m >= 1 && j >= m) {
                j -= m;
                m >>= 1;
            }
            j += m;
        }

        // Cooley-Tukey decimation-in-time
        for (let size = 2; size <= n; size *= 2) {
            const halfSize = size / 2;
            const angleStep = (-2 * Math.PI) / size;
            for (let i = 0; i < n; i += size) {
                for (let k = 0; k < halfSize; k++) {
                    const angle = k * angleStep;
                    const wReal = Math.cos(angle);
                    const wImag = Math.sin(angle);

                    const evenReal = real[i + k];
                    const evenImag = imag[i + k];
                    const oddReal = real[i + k + halfSize];
                    const oddImag = imag[i + k + halfSize];

                    const tReal = wReal * oddReal - wImag * oddImag;
                    const tImag = wReal * oddImag + wImag * oddReal;

                    real[i + k] = evenReal + tReal;
                    imag[i + k] = evenImag + tImag;
                    real[i + k + halfSize] = evenReal - tReal;
                    imag[i + k + halfSize] = evenImag - tImag;
                }
            }
        }
    }

    /**
     * Computes power spectrum and extracts standard bands
     * Assuming standard cycle times of 1.0s or close to it
     */
    static extractFeatures(
        processedRTs: number[],
        cycleMs: number
    ): { rL: number; rM: number; rH: number; fpeak: number; slope: number } {
        // Pad to next power of 2
        let n = 1;
        while (n < processedRTs.length) n *= 2;

        const real = new Array(n).fill(0);
        const imag = new Array(n).fill(0);
        for (let i = 0; i < processedRTs.length; i++) {
            real[i] = processedRTs[i];
        }

        this.computeFFT(real, imag);

        const samplingFreq = 1000 / cycleMs; // Hz
        const freqResolution = samplingFreq / n;

        let totalPower = 0;
        let powerSpectrum = [];
        let freqs = [];

        // Parse up to Nyquist
        for (let i = 1; i < n / 2; i++) {
            const freq = i * freqResolution;
            const power = (real[i] * real[i] + imag[i] * imag[i]) / n; // normalized power
            powerSpectrum.push(power);
            freqs.push(freq);
            totalPower += power;
        }

        if (totalPower === 0) return { rL: 0, rM: 0, rH: 0, fpeak: 0, slope: 0 };

        let pL = 0,
            pM = 0,
            pH = 0;
        let maxPower = 0;
        let fpeak = 0;

        // Standard Bands implementation
        for (let i = 0; i < freqs.length; i++) {
            const f = freqs[i];
            const p = powerSpectrum[i];

            if (f >= 0.01 && f <= 0.05) pL += p;
            if (f > 0.05 && f <= 0.1) pM += p;
            if (f > 0.1 && f <= 0.25) pH += p;

            if (p > maxPower) {
                maxPower = p;
                fpeak = f;
            }
        }

        // Slope calculation (simple linear fit of spectrum)
        const slope = this.linearDetrend(powerSpectrum)[0] || 0; // naive slice calculation

        return {
            rL: pL / totalPower,
            rM: pM / totalPower,
            rH: pH / totalPower,
            fpeak,
            slope,
        };
    }
}
