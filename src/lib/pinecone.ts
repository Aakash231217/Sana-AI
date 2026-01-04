import { Pinecone } from '@pinecone-database/pinecone'

export const getPineconeClient = async () => {
    const apiKey = process.env.PINECONE_API_KEY

    if (!apiKey) {
        throw new Error("PINECONE_API_KEY is not defined")
    }

    const pinecone = new Pinecone({
        apiKey: apiKey,
    })

    return pinecone
}
