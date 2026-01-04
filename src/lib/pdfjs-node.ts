// Wrapper for pdfjs-dist to work in Node.js environment
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

import path from 'path';

// Disable the worker to avoid issues in Node.js
// We explicitly point to the legacy worker file to allow the fake worker to set up correctly.
if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
}

// Export the configured library with a wrapper for getDocument
export const getDocument = (src: any) => {
    // Clone the data if it's a Uint8Array or Buffer to prevent the worker from detaching it
    // because we need to reuse the original buffer for other tasks
    if (src && src.data && (src.data instanceof Uint8Array || Buffer.isBuffer(src.data))) {
        // Create a copy of the data
        const originalData = src.data;
        const newBuffer = new Uint8Array(originalData.length);
        newBuffer.set(originalData);
        src.data = newBuffer;
    }
    return pdfjsLib.getDocument(src);
};
export const GlobalWorkerOptions = pdfjsLib.GlobalWorkerOptions;
export const version = pdfjsLib.version;

// Re-export types from the main package
export type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api';
