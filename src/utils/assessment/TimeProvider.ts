/**
 * Centralized monotonic time provider for accurate cognitive task timing.
 * Uses performance.now() which is monotonic and highly accurate.
 * Avoids Date.now() which can be shifted by system clock changes.
 */
export class TimeProvider {
    /**
     * Returns current time in milliseconds with high resolution.
     */
    static now(): number {
        if (typeof performance !== "undefined" && performance.now) {
            return performance.now();
        }
        // Fallback for environments where performance is not available
        return Date.now();
    }

    /**
     * Measures time elapsed since a given start timestamp.
     * @param startMs Timestamp from TimeProvider.now()
     */
    static elapsedSince(startMs: number): number {
        return this.now() - startMs;
    }
}
