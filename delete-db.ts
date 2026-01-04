import { db } from './src/server/db';

async function deleteFile() {
    const fileName = '040 Human Performance & Limitations - 2014.pdf';
    const deleted = await db.file.deleteMany({
        where: { name: fileName }
    });
    console.log('Deleted count:', deleted.count);
}

deleteFile().catch(console.error);
