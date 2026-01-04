

export interface TocChapter {
    chapterNumber: number
    title: string
    pageNumber: number
}

export class TableOfContentsExtractor {
    /**
     * Extract chapters from a PDF by finding the Table of Contents page
     */
    async extractChaptersFromTOC(pdfBuffer: Buffer): Promise<TocChapter[] | null> {
        console.log('[TOC_EXTRACTOR] Starting table of contents extraction...')

        try {
            const { getDocument } = await import('./pdfjs-node')
            // @ts-ignore
            const loadingTask = getDocument({ data: new Uint8Array(pdfBuffer) })
            const pdfDocument = await loadingTask.promise
            const totalPages = pdfDocument.numPages

            // Extract text from the first 10 pages or all pages if less
            // pdf-parse logic was: return text + '\n\f' for page break
            const searchLimit = Math.min(10, totalPages)
            const pages: string[] = []

            for (let i = 1; i <= searchLimit; i++) {
                const page = await pdfDocument.getPage(i)
                const textContent = await page.getTextContent()
                let text = ''
                for (const item of textContent.items) {
                    text += (item as any).str + ' '
                }
                pages.push(text + '\n')
            }

            console.log(`[TOC_EXTRACTOR] Analyzing ${pages.length} pages for TOC...`)

            // Look for TOC in extracted pages
            for (let i = 0; i < pages.length; i++) {
                const pageText = pages[i]
                const lowerText = pageText.toLowerCase()

                // Check if this page contains table of contents
                if (lowerText.includes('contents') || lowerText.includes('table of contents') || lowerText.includes('index')) {
                    console.log(`[TOC_EXTRACTOR] Found potential TOC on page ${i + 1}`)

                    const chapters = this.parseTableOfContents(pageText)
                    if (chapters.length > 0) {
                        console.log(`[TOC_EXTRACTOR] Successfully extracted ${chapters.length} chapters from TOC`)
                        return chapters
                    }
                }
            }

            console.log('[TOC_EXTRACTOR] No table of contents found')
            return null

        } catch (error) {
            console.error('[TOC_EXTRACTOR] Error:', error)
            return null
        }
    }

    /**
     * Parse a table of contents page to extract chapter information
     */
    private parseTableOfContents(tocText: string): TocChapter[] {
        const chapters: TocChapter[] = []

        // First try splitting by newlines
        let lines = tocText.split('\n').map(line => line.trim()).filter(line => line.length > 0)

        // If we only get one line, it might be that line breaks weren't preserved
        // Try to split by chapter patterns
        if (lines.length === 1) {
            console.log('[TOC_EXTRACTOR] Single line detected, attempting to split by chapter patterns')
            const singleLine = lines[0]

            // First, try to find where each chapter entry starts
            // Look for pattern: number + dot + space (e.g., "1. ", "2. ", "10. ")
            const chapterStarts: number[] = []
            const chapterPattern = /\b(\d{1,2})\.\s+[A-Z]/g
            let match
            while ((match = chapterPattern.exec(singleLine)) !== null) {
                chapterStarts.push(match.index)
            }

            // Extract each chapter line
            if (chapterStarts.length > 0) {
                lines = []
                for (let i = 0; i < chapterStarts.length; i++) {
                    const start = chapterStarts[i]
                    const end = i < chapterStarts.length - 1 ? chapterStarts[i + 1] : singleLine.length
                    const chapterLine = singleLine.substring(start, end).trim()
                    if (chapterLine) {
                        lines.push(chapterLine)
                    }
                }
                console.log(`[TOC_EXTRACTOR] Split into ${lines.length} chapter lines`)
            }
        }

        console.log('[TOC_EXTRACTOR] Parsing TOC with', lines.length, 'lines')


        const patterns = [
            /^(\d+)\.\s+(.+?)\s+\.+\s+(\d+)\s*$/,
            /^(\d+)\.\s+(.+?)\s{2,}(\d+)\s*$/,
            /^Chapter\s+(\d+)[:\s]+([^.]+?)[\s.]+(\d+)\s*$/i,
            /^(\d+)\.\s+(.+?)\s+(\d+)\s*$/
        ]

        for (const line of lines) {
            // Skip lines that are too short or don't contain numbers
            if (line.length < 5 || !line.match(/\d/)) continue

            // Skip common non-chapter lines
            if (line.toLowerCase().includes('contents') ||
                line.toLowerCase().includes('index') ||
                line.toLowerCase().includes('page')) continue

            let matched = false
            for (const pattern of patterns) {
                const match = line.match(pattern)
                if (match) {
                    const chapterNumber = parseInt(match[1])
                    let title = match[2].trim().replace(/\.+$/, '') // Remove trailing dots
                    const pageNumber = parseInt(match[3])

                    title = title.replace(/\s*[.\s]+$/, '').trim() // Remove trailing dots and spaces

                    if (chapterNumber > 0 && chapterNumber < 100 &&
                        title.length > 2 &&
                        pageNumber > 0 && pageNumber < 1000) {

                        chapters.push({
                            chapterNumber,
                            title,
                            pageNumber
                        })
                        matched = true
                        break // Found a match, move to next line
                    }
                }
            }
        }

        return chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
    }
}
