"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/Button";
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface ExcelUploadProps {
    classId: string;
    examId: string;
}

interface ParsedRow {
    rollNumber: string;
    [subject: string]: string | number;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ classId, examId }) => {
    const [showConfig, setShowConfig] = useState(false);
    const [subjectConfig, setSubjectConfig] = useState<Record<string, number>>({});
    const [nameMismatches, setNameMismatches] = useState<string[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [subjectsDetected, setSubjectsDetected] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch students for validation
    const { data: students } = api.admin.getStudentsByClass.useQuery({ classId }, { enabled: !!classId });

    const utils = api.useUtils();
    const uploadMutation = api.admin.uploadMarksBulk.useMutation({
        onSuccess: (data) => {
            toast.success(`Successfully uploaded marks for ${data.success} entries`);
            if (data.failed > 0) {
                toast.error(`Failed to upload ${data.failed} entries`);
                setValidationErrors(data.errors);
            } else {
                setParsedData([]);
                setValidationErrors([]);
                setShowConfig(false);
                setNameMismatches([]);
            }
            utils.admin.getStudentsByClass.invalidate({ classId });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // ... (rest of the component logic)

    const handleUpload = () => {
        if (parsedData.length === 0) return;

        const marksToUpload: any[] = [];

        parsedData.forEach(row => {
            subjectsDetected.forEach(subject => {
                const rawScore = row[subject];
                if (rawScore !== undefined && rawScore !== null && rawScore !== "") {
                    const scoreNum = Number(rawScore);
                    if (!isNaN(scoreNum)) {
                        marksToUpload.push({
                            rollNumber: String(row.rollNumber),
                            subject: subject,
                            score: scoreNum,
                            maxMarks: subjectConfig[subject] || 100
                        });
                    }
                }
            });
        });

        uploadMutation.mutate({
            classId,
            examId,
            marks: marksToUpload
        });
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet) as ParsedRow[];

                if (jsonData.length === 0) {
                    toast.error("File is empty");
                    return;
                }

                const firstRow = jsonData[0];
                const keys = Object.keys(firstRow);
                const rollKey = keys.find(k => k.toLowerCase().includes("roll") || k.toLowerCase().includes("id"));
                const nameKey = keys.find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("student"));

                if (!rollKey) {
                    toast.error("Could not find 'Roll Number' column");
                    setIsProcessing(false);
                    return;
                }

                const excludedKeywords = ["roll", "id", "name", "student", "admission", "email", "mobile", "phone", "contact", "address", "father", "mother", "dob", "date"];

                const subjects = keys.filter(k => {
                    const lowerK = k.toLowerCase();
                    if (k === "__rowNum__") return false;
                    return !excludedKeywords.some(keyword => lowerK.includes(keyword));
                });
                setSubjectsDetected(subjects);

                // Initialize config with default 100 or best guess
                const initialConfig: Record<string, number> = {};
                subjects.forEach(s => initialConfig[s] = 100);
                setSubjectConfig(initialConfig);

                const mismatches: string[] = [];
                const normalized = jsonData.map(row => {
                    const roll = String(row[rollKey]);
                    const entry: any = { rollNumber: roll };

                    if (nameKey && students) {
                        const uploadedName = String(row[nameKey]).trim();
                        const matchedStudent = students.find(s => s.rollNumber === roll);
                        if (matchedStudent) {
                            // Simple case-insensitive check
                            if (!matchedStudent.name.toLowerCase().includes(uploadedName.toLowerCase()) &&
                                !uploadedName.toLowerCase().includes(matchedStudent.name.toLowerCase())) {
                                mismatches.push(`Roll ${roll}: Excel says '${uploadedName}', System says '${matchedStudent.name}'`);
                            }
                        }
                    }

                    subjects.forEach(sub => {
                        entry[sub] = row[sub];
                    });
                    return entry;
                });

                setParsedData(normalized);
                setValidationErrors([]);
                setNameMismatches(mismatches);
                setShowConfig(true);

            } catch (err) {
                toast.error("Failed to parse Excel file");
                console.error(err);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    }, [students]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        maxFiles: 1,
    });

    return (
        <div className="space-y-6">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragActive
                    ? "border-brand-primary bg-brand-primary/10"
                    : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full bg-slate-800">
                        <Upload className="w-8 h-8 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-lg font-medium text-white">
                            {isDragActive ? "Drop the file here" : "Drag & drop Excel file"}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                            Supports .xlsx, .xls, .csv
                        </p>
                    </div>
                </div>
            </div>

            {/* Subject Configuration & Preview */}
            {parsedData.length > 0 && showConfig && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 animate-in zoom-in-95 duration-200">
                    <h3 className="text-xl font-bold text-white mb-4">Confirm Upload Details</h3>

                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Detected Subjects</h4>
                        <p className="text-xs text-slate-500 mb-3">Please verify the detected subjects and set the maximum marks for each.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subjectsDetected.map(sub => (
                                <div key={sub} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                                    <span className="font-medium text-white text-sm truncate pr-2" title={sub}>{sub}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Max:</span>
                                        <input
                                            type="number"
                                            className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-right focus:ring-1 focus:ring-brand-primary outline-none"
                                            value={subjectConfig[sub]}
                                            onChange={(e) => setSubjectConfig(prev => ({ ...prev, [sub]: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {nameMismatches.length > 0 && (
                        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Potential Name Mismatches
                            </h4>
                            <ul className="list-disc list-inside text-xs text-yellow-300/80 space-y-1 max-h-32 overflow-y-auto">
                                {nameMismatches.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wide">Data Preview</h4>
                        <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800/20">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="bg-slate-800 text-slate-100 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">Roll No</th>
                                        {subjectsDetected.map(sub => <th key={sub} className="px-4 py-3">{sub}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedData.slice(0, 5).map((row, i) => (
                                        <tr key={i} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30">
                                            <td className="px-4 py-2 font-medium">{row.rollNumber}</td>
                                            {subjectsDetected.map(sub => <td key={sub} className="px-4 py-2">{row[sub]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {parsedData.length > 5 && (
                                <div className="bg-slate-800/50 px-4 py-2 text-xs text-center text-slate-500">
                                    ...and {parsedData.length - 5} more entries
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
                        <Button variant="outline" onClick={() => { setParsedData([]); setShowConfig(false); }}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                            {uploadMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm & Upload
                        </Button>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {validationErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-medium">
                        <AlertCircle className="w-5 h-5" />
                        Upload Errors
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-300 max-h-40 overflow-y-auto">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}

            <div className="flex justify-center">
                <a href="#" className="text-sm text-brand-primary hover:underline flex items-center gap-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    Download Sample Template
                </a>
            </div>
        </div>
    );
};
