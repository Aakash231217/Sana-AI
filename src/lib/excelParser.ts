import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  studentName: string;
  email?: string;
  mobile?: string;
  rollNumber?: string;
  subject: string;
  marks: number;
  maxMarks: number;
  examType?: string;
  rowNumber: number;
  errors: string[];
}

export interface ParsedExcelResult {
  success: boolean;
  rows: ParsedStudentRow[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

const EXPECTED_HEADERS = [
  'Student Name',
  'Email',
  'Mobile',
  'Roll Number',
  'Subject',
  'Marks',
  'Max Marks',
  'Exam Type',
];

const REQUIRED_HEADERS = ['Student Name', 'Subject', 'Marks'];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_\s]+/g, ' ');
}

function findHeaderIndex(headers: string[], targetHeader: string): number {
  const normalizedTarget = normalizeHeader(targetHeader);
  return headers.findIndex(h => normalizeHeader(h) === normalizedTarget);
}

export function parseExcelBuffer(buffer: Buffer): ParsedExcelResult {
  const errors: string[] = [];
  const rows: ParsedStudentRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    if (workbook.SheetNames.length === 0) {
      return { success: false, rows: [], errors: ['No sheets found in Excel file'], totalRows: 0, validRows: 0 };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      return { success: false, rows: [], errors: ['Excel file must have at least a header row and one data row'], totalRows: 0, validRows: 0 };
    }

    // Get headers from first row
    const headers = (jsonData[0] as any[]).map(h => String(h || ''));
    
    // Find column indices
    const studentNameIdx = findHeaderIndex(headers, 'Student Name');
    const emailIdx = findHeaderIndex(headers, 'Email');
    const mobileIdx = findHeaderIndex(headers, 'Mobile');
    const rollNumberIdx = findHeaderIndex(headers, 'Roll Number');
    const subjectIdx = findHeaderIndex(headers, 'Subject');
    const marksIdx = findHeaderIndex(headers, 'Marks');
    const maxMarksIdx = findHeaderIndex(headers, 'Max Marks');
    const examTypeIdx = findHeaderIndex(headers, 'Exam Type');

    // Validate required headers
    if (studentNameIdx === -1) {
      errors.push('Missing required column: "Student Name"');
    }
    if (subjectIdx === -1) {
      errors.push('Missing required column: "Subject"');
    }
    if (marksIdx === -1) {
      errors.push('Missing required column: "Marks"');
    }

    if (errors.length > 0) {
      return { success: false, rows: [], errors, totalRows: 0, validRows: 0 };
    }

    // Parse data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue; // Skip empty rows
      }

      const rowErrors: string[] = [];
      
      const studentName = row[studentNameIdx] ? String(row[studentNameIdx]).trim() : '';
      const email = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : undefined;
      const mobile = mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : undefined;
      const rollNumber = rollNumberIdx !== -1 && row[rollNumberIdx] ? String(row[rollNumberIdx]).trim() : undefined;
      const subject = row[subjectIdx] ? String(row[subjectIdx]).trim() : '';
      const marksRaw = row[marksIdx];
      const maxMarksRaw = maxMarksIdx !== -1 ? row[maxMarksIdx] : 100;
      const examType = examTypeIdx !== -1 && row[examTypeIdx] ? String(row[examTypeIdx]).trim() : undefined;

      // Validate required fields
      if (!studentName) {
        rowErrors.push('Student Name is required');
      }
      if (!subject) {
        rowErrors.push('Subject is required');
      }

      // Parse and validate marks
      let marks = 0;
      if (marksRaw === null || marksRaw === undefined || marksRaw === '') {
        rowErrors.push('Marks is required');
      } else {
        marks = parseFloat(String(marksRaw));
        if (isNaN(marks)) {
          rowErrors.push('Marks must be a number');
        } else if (marks < 0) {
          rowErrors.push('Marks cannot be negative');
        }
      }

      // Parse max marks
      let maxMarks = 100;
      if (maxMarksRaw !== null && maxMarksRaw !== undefined && maxMarksRaw !== '') {
        maxMarks = parseFloat(String(maxMarksRaw));
        if (isNaN(maxMarks)) {
          maxMarks = 100;
        } else if (maxMarks <= 0) {
          rowErrors.push('Max Marks must be greater than 0');
        }
      }

      // Validate marks doesn't exceed max marks
      if (marks > maxMarks) {
        rowErrors.push(`Marks (${marks}) cannot exceed Max Marks (${maxMarks})`);
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push('Invalid email format');
      }

      rows.push({
        studentName,
        email,
        mobile,
        rollNumber,
        subject,
        marks,
        maxMarks,
        examType,
        rowNumber: i + 1,
        errors: rowErrors,
      });
    }

    const validRows = rows.filter(r => r.errors.length === 0).length;
    
    return {
      success: validRows > 0,
      rows,
      errors,
      totalRows: rows.length,
      validRows,
    };
  } catch (error) {
    return {
      success: false,
      rows: [],
      errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      totalRows: 0,
      validRows: 0,
    };
  }
}

export function generateSampleExcelBuffer(): Buffer {
  const sampleData = [
    ['Student Name', 'Email', 'Mobile', 'Roll Number', 'Subject', 'Marks', 'Max Marks', 'Exam Type'],
    ['John Doe', 'john@example.com', '9876543210', '101', 'Mathematics', 85, 100, 'midterm'],
    ['John Doe', 'john@example.com', '9876543210', '101', 'Science', 78, 100, 'midterm'],
    ['Jane Smith', 'jane@example.com', '', '102', 'Mathematics', 92, 100, 'midterm'],
    ['Jane Smith', 'jane@example.com', '', '102', 'Science', 88, 100, 'midterm'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
}
