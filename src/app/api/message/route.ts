import { db } from '@/server/db'
import { getPineconeClient } from '@/lib/pinecone'
import { SendMessageValidator } from '@/lib/validators/SendMessageValidator'
import { OpenAIEmbeddings } from "@langchain/openai";
import { NextRequest } from 'next/server'

import { OpenAI } from 'openai'

export const POST = async (req: NextRequest) => {
    try {
        // endpoint for asking a question to a pdf file

        const body = await req.json()

        const { fileId, message } = SendMessageValidator.parse(body)

        const file = await db.file.findFirst({
            where: {
                id: fileId,
            },
        })

        // Fetch chapters separately to avoid TypeScript errors
        const chapters = await db.chapter.findMany({
            where: {
                fileId: fileId,
            },
            include: {
                topics: true
            },
            orderBy: {
                chapterNumber: 'asc'
            }
        })

        if (!file) return new Response('Not found', { status: 404 })

        // Check for special "START_SESSION" message
        const isStartSession = message === '[START_SESSION]'

        if (!isStartSession) {
            await db.message.create({
                data: {
                    text: message,
                    isUserMessage: true,
                    fileId,
                },
            })
        } else {
            console.log('[TUTOR] Received START_SESSION trigger')
        }

        // ============ NEW: AI TUTOR LOGIC ============
        // Get session key from headers OR body
        const sessionKey = req.headers.get('x-session-key') ||
            body.sessionKey ||
            `session-${Date.now()}`

        console.log('[TUTOR] Using session key:', sessionKey)

        // Get or create learning state
        let learningState = await db.learningState.findUnique({
            where: { sessionKey },
        })

        console.log('[TUTOR] Found learning state:', learningState)

        if (!learningState) {
            console.log('[TUTOR] Creating new learning state')

            // Try to recover state from StudentProgress (Analytics) to be smart
            const progress = await db.studentProgress.findUnique({
                where: { fileId }
            })

            const initialChapter = progress?.currentChapter || 1
            const initialTopic = progress?.currentTopic || 1

            learningState = await db.learningState.create({
                data: {
                    fileId,
                    sessionKey,
                    currentChapter: initialChapter,
                    currentTopic: initialTopic,
                    learningPhase: progress ? 'learning' : 'introduction', // Skip intro if resuming
                    messageCount: 0,
                },
            })
            console.log('[TUTOR] Created state (recovered):', learningState)
        }

        // Increment message count and update last interaction
        const updatedState = await db.learningState.update({
            where: { sessionKey },
            data: {
                messageCount: { increment: 1 },
                lastInteraction: new Date(),
            },
        })


        console.log('[TUTOR] Updated message count to:', updatedState.messageCount)
        // Get current chapter for context
        const currentChapter = chapters.find((ch: { chapterNumber: number }) => ch.chapterNumber === updatedState.currentChapter)
        const currentTopic = currentChapter?.topics.find((t: { topicNumber: number }) => t.topicNumber === updatedState.currentTopic)
        const isLastTopic = currentTopic && currentChapter && currentTopic.topicNumber === currentChapter.topics.length
        // We default to false because we now use strict gatekeeping via completeTopic
        const shouldTriggerQuiz = false

        // Check if the query is asking about chapters/topics
        const isChapterQuery = /chapter|topic|section|unit|module/i.test(message)
        const chapterNumberMatch = message.match(/chapter\s*(\d+)/i)

        let chapterInfo = ''
        if (isChapterQuery && chapters.length > 0) {
            if (chapterNumberMatch) {
                // User is asking about a specific chapter
                const chapterNum = parseInt(chapterNumberMatch[1])
                const chapter = chapters.find((ch: { chapterNumber: number }) => ch.chapterNumber === chapterNum)
                if (chapter) {
                    chapterInfo = `\n\nChapter ${chapter.chapterNumber}: ${chapter.title}\n`
                    chapterInfo += `Pages: ${chapter.startPage}-${chapter.endPage}\n`
                    if (chapter.topics.length > 0) {
                        chapterInfo += `\nTopics in this chapter:\n`
                        chapter.topics.forEach((topic: { topicNumber: any; title: any; estimatedTime: any }) => {
                            chapterInfo += `- Topic ${topic.topicNumber}: ${topic.title} (Est. ${topic.estimatedTime} mins)\n`
                        })
                    }
                }
            } else {
                // User is asking about chapters in general
                chapterInfo = `\n\nAvailable Chapters:\n`
                chapters.forEach((chapter: { chapterNumber: any; title: any; startPage: any; endPage: any }) => {
                    chapterInfo += `- Chapter ${chapter.chapterNumber}: ${chapter.title} (Pages ${chapter.startPage}-${chapter.endPage})\n`
                })
            }
        }

        // 1: vectorize message
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        })

        const pinecone = await getPineconeClient()
        const pineconeIndex = pinecone.Index('sana-ai')

        // Create embedding for the query
        // Build a richer query for short/vague messages so Pinecone returns relevant chunks
        let queryText = message
        if (isStartSession) {
            queryText = `Chapter ${updatedState.currentChapter} ${currentChapter?.title || ''} Topic ${updatedState.currentTopic} ${currentTopic?.title || ''}`
        } else if (message.trim().split(/\s+/).length <= 3) {
            // Short messages like "yes", "hi", "ready" produce bad embeddings.
            // Enrich with current chapter/topic so Pinecone returns relevant content.
            queryText = `${message} Chapter ${updatedState.currentChapter} ${currentChapter?.title || ''} Topic ${updatedState.currentTopic} ${currentTopic?.title || ''}`
            console.log('[CHAT] Enriched short query:', queryText)
        }

        const queryEmbedding = await embeddings.embedQuery(queryText)

        // Query Pinecone with chapter filter so we only get content from the current chapter
        console.log('[CHAT] Querying Pinecone with namespace:', file.id, 'chapter filter:', updatedState.currentChapter)
        let queryResponse = await pineconeIndex
            .namespace(file.id)
            .query({
                vector: queryEmbedding,
                topK: 15,
                includeValues: false,
                includeMetadata: true,
                filter: {
                    chapterNumber: { '$eq': updatedState.currentChapter }
                }
            })

        // If chapter-filtered results are too few, fall back to unfiltered query
        if (!queryResponse.matches || queryResponse.matches.length < 3) {
            console.log('[CHAT] Too few chapter-filtered results, falling back to unfiltered query')
            queryResponse = await pineconeIndex
                .namespace(file.id)
                .query({
                    vector: queryEmbedding,
                    topK: 15,
                    includeValues: false,
                    includeMetadata: true,
                })
        }

        console.log('[CHAT] Query response:', JSON.stringify(queryResponse, null, 2))

        // Extract the text content from the results with page numbers and image references
        const results = queryResponse.matches?.map((match) => ({
            pageContent: (match.metadata?.text as string) || '',
            metadata: {
                pageNumber: match.metadata?.pageNumber,
                score: match.score,
                imageIds: match.metadata?.imageIds || [],
                referencedImageIds: match.metadata?.referencedImageIds || [],
                hasImages: match.metadata?.hasImages || false,
                source: match.metadata?.source, // Track if this is OCR content
            },
        })) || []

        console.log('[CHAT] Extracted results:', results.length, 'documents')

        // Check if we got any OCR results from Pinecone
        const ocrResults = results.filter(r => r.metadata.source === 'OCR')
        const hasOcrResults = ocrResults.length > 0
        const hasGoodOcrContent = ocrResults.some(r => r.pageContent.length > 50)

        console.log('[CHAT] OCR results from Pinecone:', ocrResults.length)
        console.log('[CHAT] Has good OCR content:', hasGoodOcrContent)

        // If file used OCR but we have poor/no results, add full OCR text as fallback
        let ocrContext = ''
        if (file.usedOCR && file.ocrText) {
            if (!hasOcrResults || !hasGoodOcrContent) {
                console.log('[CHAT] Adding full OCR text from database (', file.ocrText.length, 'chars)')
                // Use more of the OCR text if we have no good results at all
                const maxLength = hasOcrResults ? 3000 : 8000
                ocrContext = `\n\n---------------- OCR EXTRACTED TEXT ----------------\n${file.ocrText.substring(0, maxLength)}\n`
            } else {
                console.log('[CHAT] Using OCR results from Pinecone')
            }
        }

        // Collect all unique image IDs from the results
        const allImageIds = new Set<string>()
        results.forEach(result => {
            // @ts-ignore
            if (result.metadata.imageIds && Array.isArray(result.metadata.imageIds)) {
                // @ts-ignore
                result.metadata.imageIds.forEach((id: string) => allImageIds.add(id))
            }
            // @ts-ignore
            if (result.metadata.referencedImageIds && Array.isArray(result.metadata.referencedImageIds)) {
                // @ts-ignore
                result.metadata.referencedImageIds.forEach((id: string) => allImageIds.add(id))
            }
        })

        // Fetch image data if any images are referenced
        let images: any[] = []
        if (allImageIds.size > 0) {
            console.log('[CHAT] Fetching', allImageIds.size, 'images')
            images = await db.extractedImage.findMany({
                where: {
                    id: {
                        in: Array.from(allImageIds)
                    }
                },
                select: {
                    id: true,
                    imageUrl: true,
                    caption: true,
                    pageNumber: true,
                    imageType: true,
                    topics: true,
                }
            })
            console.log('[CHAT] Found', images.length, 'images')
        }

        // Format context with page numbers
        const contextWithPages = results
            .filter(r => r.pageContent.trim().length > 0) // Filter out empty content
            .map((r) => {
                // @ts-ignore
                const pageNum = r.metadata.pageNumber ? `[Page ${r.metadata.pageNumber}]` : '[Page unknown]'
                // @ts-ignore
                const sourceTag = r.metadata.source === 'OCR' ? ' [OCR]' : ''
                return `${pageNum}${sourceTag} ${r.pageContent}`
            }).join('\n\n')

        // Get the LAST 6 messages (most recent conversation context)
        const prevMessages = isStartSession ? [] : await db.message.findMany({
            where: {
                fileId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 6,
        })
        // Reverse to chronological order for the prompt
        prevMessages.reverse()

        const formattedPrevMessages = prevMessages.map((msg: { isUserMessage: boolean; text: string }) => ({
            role: msg.isUserMessage
                ? ('user' as const)
                : ('assistant' as const),
            content: msg.text,
        }))


        // ============ NEW: BUILD AI TUTOR SYSTEM PROMPT ============
        let tutorPrompt = ''


        if (updatedState.learningPhase === 'introduction') {
            const allChaptersList = chapters.map((c: { chapterNumber: number; title: string }) => `- Chapter ${c.chapterNumber}: ${c.title}`).join('\n')

            if (updatedState.currentChapter === 1) {
                tutorPrompt = `\n\nTUTOR CONTEXT: This is the student's first session with "${file.name}".
Chapters: ${allChaptersList}
Give a warm, brief (2-3 sentence) overview of the book, mention ${chapters.length} chapters, and ask if they're ready to start Chapter 1: ${currentChapter?.title}.
Do NOT use "[TOPIC_COMPLETED]".`
            } else {
                const topicList = currentChapter?.topics.map((t: { title: string }) => `- ${t.title}`).join('\n') || 'Topics not listed.'

                tutorPrompt = `\n\nTUTOR CONTEXT: Student just unlocked Chapter ${updatedState.currentChapter}: ${currentChapter?.title}.
Topics: ${topicList}
Briefly congratulate them, preview this chapter in 1-2 sentences, and ask if they're ready.
Do NOT use "[TOPIC_COMPLETED]".`
            }

            // Update phase to learning after introduction
            await db.learningState.update({
                where: { sessionKey },
                data: { learningPhase: 'learning' },
            })
        }
        else if (updatedState.learningPhase === 'learning') {
            if (isStartSession) {
                tutorPrompt = `\n\nTUTOR CONTEXT: Resuming session.
Chapter ${updatedState.currentChapter}: ${currentChapter?.title}, Topic ${updatedState.currentTopic}: ${currentTopic?.title || 'Overview'}.
Welcome them back briefly and ask if they're ready to continue.`
            } else {
                const totalTopics = currentChapter?.topics.length || 0
                const remainingTopicsCount = totalTopics - updatedState.currentTopic

                tutorPrompt = `\n\nTUTOR CONTEXT: Teaching mode.
Chapter ${updatedState.currentChapter}: ${currentChapter?.title}
Current Topic: ${currentTopic?.title || 'Overview'}
Topics remaining: ${remainingTopicsCount}

IMPORTANT RULES:
- Answer the student's actual question directly using the book content below. Do NOT redirect them to a scripted lesson flow.
- Use specific content, examples, and quotes from the book. Cite page numbers.
- Be conversational and natural — respond to what they said, not a pre-planned curriculum.
- If the student demonstrates clear mastery of the current topic, start your response with "[TOPIC_COMPLETED]".
- If student asks to skip ahead and ${remainingTopicsCount} topics remain, gently say there are more topics to cover first.`
            }
        }
        else if (updatedState.learningPhase === 'review') {
            // Fetch latest quiz attempt for context
            const lastAttempt = await db.quizAttempt.findFirst({
                where: {
                    sessionKey,
                    chapterNumber: updatedState.currentChapter
                },
                orderBy: { createdAt: 'desc' }
            })

            let quizContext = ''
            if (lastAttempt && Array.isArray(lastAttempt.answers)) {
                quizContext = '\n\nQUIZ RESULTS CONTEXT:\n'
                // @ts-ignore
                lastAttempt.answers.forEach((ans: any, i: number) => {
                    const status = ans.isCorrect ? '✅ CORRET' : '❌ WRONG'
                    quizContext += `Q${i + 1}: ${status}\n`
                    if (!ans.isCorrect) {
                        quizContext += `   - Your Answer: ${ans.selectedAnswer}\n`
                        quizContext += `   - Correct Answer: ${ans.correctAnswer}\n`
                        quizContext += `   - Topic: ${ans.topicCovered}\n`
                    }
                })
            }

            tutorPrompt = `\n\n🎓 AI TUTOR MODE: REVIEW
The student just FAILED the quiz for Chapter ${updatedState.currentChapter}.
Weak Topics: ${updatedState.reviewTopics.join(', ')}

${quizContext}

Review Guidelines:
1.  **Analyze Mistakes**: Specifically reference the questions they got wrong (e.g., "I noticed you struggled with Question 3 regarding...").
2.  **Explain Concepts**: Don't just give the answer; explain the underlying concept they missed.
3.  **Encourage**: Remind them it's part of learning.
4.  **Retake**: When you feel they understand the weak topics, explicitly suggested retaking the quiz.

CRITICAL GATEKEEPING:
- **Refuse Progression**: If the student asks to move to the next chapter (Chapter ${updatedState.currentChapter + 1}), REFUSE.
- **redirect**: Say "We need to fix these weak topics and pass the quiz first."
- **NO TOKENS**: Do NOT emit [TOPIC_COMPLETED] under any circumstances in this phase. The only way forward is retaking the quiz.`
        }
        else if (updatedState.learningPhase === 'quiz-ready') {
            tutorPrompt = `\n\n🎓 AI TUTOR MODE: GATEKEEPER
Status: Chapter ${updatedState.currentChapter} COMPLETED.
Goal: Student MUST pass the quiz to unlock Chapter ${updatedState.currentChapter + 1}.

Guidelines:
1.  **Refuse Movement**: If they ask to teaching Chapter ${updatedState.currentChapter + 1}, REFUSE.
2.  **Redirect**: Say "You've finished Chapter ${updatedState.currentChapter}! To unlock the next chapter, you need to pass the quiz."
3.  **Encourage**: Tell them they are ready and to click the "Take Quiz" button.`
        }
        // ============ END NEW LOGIC ============

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
            stream: true,
            messages: [
                {
                    role: 'system',
                    content: `You are a friendly, knowledgeable tutor helping a student learn from their textbook. Your personality is warm, patient, and encouraging — like a real teacher who genuinely cares.
${tutorPrompt}

CRITICAL RULES:
1. ALWAYS answer based on the actual book content provided below. Use specific details, quotes, and examples from the text.
2. Cite page numbers naturally (e.g., "On page 7, the story says...").
3. Keep responses concise (3-6 sentences for simple questions, longer only when explaining complex concepts).
4. Be conversational — respond to what the student actually said. Do NOT give scripted lesson plans or numbered menu options unless they ask for a plan.
5. If the student asks something and the book content is available, TEACH the actual content. Don't just describe what the book contains — explain it.
6. If you truly cannot find the answer in the provided context, say so honestly.
7. Reference relevant images when available.

YouTube: When a visual explanation would genuinely help, suggest ONE video using: [YOUTUBE:VIDEO_ID:Title]`,
                },
                {
                    role: 'user',
                    content: `Use the book content below to answer the student's question. Cite page numbers when referencing specific content. If the context doesn't cover their question, say so honestly.
        
  \n----------------\n
  
  PREVIOUS CONVERSATION:
  ${formattedPrevMessages.map((message: { role: string; content: string }) => {
                        if (message.role === 'user')
                            return `User: ${message.content}\n`
                        return `Assistant: ${message.content}\n`
                    })}
  
  \n----------------\n
  
  ${chapterInfo ? `CHAPTER INFORMATION:${chapterInfo}\n----------------\n` : ''}
  
  CONTEXT WITH PAGE NUMBERS:
  ${contextWithPages}
  ${ocrContext}
  
  ${images.length > 0 ? `RELEVANT IMAGES:
  ${images.map((img: { caption?: string; pageNumber: number; imageType?: string }) => `- ${img.caption || `Image on page ${img.pageNumber}`} (Page ${img.pageNumber}, Type: ${img.imageType || 'diagram'})`).join('\n')}
  
  Note: The actual images will be displayed to the user alongside your response. Reference them naturally in your answer when relevant.
  ` : ''}
  
  USER INPUT: ${message}`,
                },
            ],
        })

        // Convert the response into a readable stream
        const stream = new ReadableStream({
            async start(controller) {
                let fullResponse = ''

                try {
                    // @ts-ignore
                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || ''
                        fullResponse += content

                        // Encode and send the chunk
                        const bytes = new TextEncoder().encode(content)
                        controller.enqueue(bytes)
                    }

                    // Save the complete message after streaming is done
                    await db.message.create({
                        data: {
                            text: fullResponse,
                            isUserMessage: false,
                            fileId,
                        },
                    })

                    // ============ NEW: CHECK SMART COMPLETION ============
                    console.log('[TUTOR] Checking smart completion...')
                    const isTopicCompleted = fullResponse.includes('[TOPIC_COMPLETED]')

                    if (isTopicCompleted && updatedState.learningPhase === 'learning') {
                        console.log('[TUTOR] ✅ AI detected topic completion!')
                        // We don't automatically update state here because we want the frontend to handle the transition
                        // (showing a button or toast) to give user control.
                        // The frontend will see the token in the stream and act accordingly.
                    }
                    // ============ END NEW LOGIC ============
                    // ============ END NEW LOGIC ============
                } catch (error) {
                    console.error('[TUTOR] Error:', error)
                    controller.error(error)
                } finally {
                    controller.close()
                }
            },
        })

        // Return both the stream and images data + learning state
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'X-Images-Data': JSON.stringify(images),
                'X-Learning-Phase': updatedState.learningPhase,
                'X-Should-Quiz': shouldTriggerQuiz.toString(),
                'X-Current-Chapter': updatedState.currentChapter.toString(),
                'X-Message-Count': updatedState.messageCount.toString(),
            },
        })
    } catch (error) {
        console.error('[MESSAGE_ERROR]', error)
        return new Response('Internal error', { status: 500 })
    }
}
