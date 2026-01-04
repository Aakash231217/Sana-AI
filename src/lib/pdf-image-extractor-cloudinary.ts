import { v2 as cloudinary } from 'cloudinary'

import { PDFDocument } from 'pdf-lib'
import { ExtractedImage } from './pdf-image-extractor'

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface ExtractedImageData {
    pageNumber: number
    imageBuffer: Buffer
    imageUrl?: string
    imageKey?: string
    caption?: string
    contextBefore: string
    contextAfter: string
    nearbyText: string
    boundingBox?: {
        x: number
        y: number
        width: number
        height: number
    }
    imageType?: string
    topics: string[]
}

// Extract text from PDF using custom wrapper
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
        const { getDocument } = await import('./pdfjs-node')
        // @ts-ignore
        const loadingTask = getDocument({ data: new Uint8Array(pdfBuffer) })
        const pdfDocument = await loadingTask.promise
        const totalPages = pdfDocument.numPages

        let extractedText = ''
        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDocument.getPage(i)
            const textContent = await page.getTextContent()
            const pageText = textContent.items.map((item: any) => item.str).join(' ')
            extractedText += pageText + '\n'
        }
        return extractedText
    } catch (error) {
        console.error('Error extracting text:', error)
        return ''
    }
}

// Extract images from PDF using Cloudinary
export async function extractImagesFromPDF(pdfBuffer: Buffer): Promise<ExtractedImageData[]> {
    const images: ExtractedImageData[] = []

    try {
        console.log('[CLOUDINARY] Starting PDF image extraction...')

        // Get text content for context
        const fullText = await extractTextFromPDF(pdfBuffer)

        // Get page count - handle encrypted PDFs
        let pageCount = 0
        try {
            const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer), { ignoreEncryption: true })
            pageCount = pdfDoc.getPageCount()
            console.log('[CLOUDINARY] PDF has', pageCount, 'pages')
        } catch (error) {
            console.log('[CLOUDINARY] Could not get page count, assuming 50 pages')
            pageCount = 50 // Default assumption for encrypted PDFs
        }

        // Upload PDF to Cloudinary
        console.log('[CLOUDINARY] Uploading PDF to Cloudinary...')
        const base64Pdf = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`

        const uploadResult = await cloudinary.uploader.upload(base64Pdf, {
            resource_type: 'image',
            format: 'pdf',
            pages: true, // Enable multi-page support
        })

        console.log('[CLOUDINARY] PDF uploaded successfully:', uploadResult.public_id)

        // Fallback logic for now: Extract first 5 pages or distributed
        const pagesToExtract = [1, 2, 3]

        // Extract each page as an image using Cloudinary's transformation API
        for (const pageNumber of pagesToExtract) {
            try {
                console.log(`[CLOUDINARY] Extracting page ${pageNumber}...`)

                // Generate URL for specific page with transformations
                const pageUrl = cloudinary.url(uploadResult.public_id, {
                    resource_type: 'image',
                    format: 'png',
                    page: pageNumber,
                    width: 1200,
                    quality: 'auto:good',
                })

                console.log(`[CLOUDINARY] Generated URL for page ${pageNumber}:`, pageUrl)

                // Download the image
                const response = await fetch(pageUrl)
                if (!response.ok) {
                    throw new Error(`Failed to fetch page ${pageNumber}: ${response.statusText}`)
                }

                const imageBuffer = Buffer.from(await response.arrayBuffer())

                // Extract context for this page
                const pageTextStart = Math.floor((pageNumber - 1) * fullText.length / pageCount)
                const pageTextEnd = Math.floor(pageNumber * fullText.length / pageCount)
                const pageContext = fullText.substring(pageTextStart, pageTextEnd)

                images.push({
                    pageNumber,
                    imageBuffer,
                    imageUrl: pageUrl, // Store Cloudinary URL directly
                    contextBefore: pageContext.substring(0, 500),
                    contextAfter: pageContext.substring(0, 500),
                    nearbyText: pageContext.substring(0, 1000),
                    imageType: 'page_render',
                    topics: ['general']
                })

            } catch (pageError) {
                console.error(`[CLOUDINARY] Error extracting page ${pageNumber}:`, pageError)
            }
        }

        // Clean up
        await cloudinary.uploader.destroy(uploadResult.public_id, {
            resource_type: 'image',
            type: 'upload'
        })

        return images
    } catch (error) {
        console.error('[CLOUDINARY] Error extracting images from PDF:', error)
        return []
    }
}
