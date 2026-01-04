import { db } from './src/server/db';

async function checkFile() {
    const fileName = '040 Human Performance & Limitations - 2014.pdf';
    const file = await db.file.findFirst({
        where: { name: fileName }
    });
    console.log('File found:', file);
}

checkFile().catch(console.error);
