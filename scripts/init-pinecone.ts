
import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'

dotenv.config()

const run = async () => {
    const apiKey = process.env.PINECONE_API_KEY
    const indexName = process.env.PINECONE_INDEX_NAME || 'sana-ai'

    if (!apiKey) {
        throw new Error("PINECONE_API_KEY is not defined")
    }

    const pinecone = new Pinecone({ apiKey })

    console.log(`Checking for index: ${indexName}...`)

    // List indexes properly
    const indexList = await pinecone.listIndexes()
    const indexes = indexList.indexes || []

    // Check if index exists by name
    const exists = indexes.some(idx => idx.name === indexName)

    if (exists) {
        console.log(`Index ${indexName} already exists.`)
    } else {
        console.log(`Creating index ${indexName}...`)
        await pinecone.createIndex({
            name: indexName,
            dimension: 1536, // OpenAI embeddings dimension
            metric: 'cosine',
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        })
        console.log(`Index ${indexName} created successfully!`)
    }
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})
