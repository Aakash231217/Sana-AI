import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer } from '@/lib/excelParser';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            return NextResponse.json(
                { error: 'Invalid file type. Please upload an Excel or CSV file.' },
                { status: 400 }
            );
        }

        // Parse the file
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = parseExcelBuffer(buffer);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error parsing Excel file:', error);
        return NextResponse.json(
            { error: 'Failed to parse Excel file', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Return a sample Excel template
    const { generateSampleExcelBuffer } = await import('@/lib/excelParser');
    const buffer = generateSampleExcelBuffer();

    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="student_marks_template.xlsx"',
        },
    });
}
