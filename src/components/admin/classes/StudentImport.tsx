"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/Button";
import { Loader2, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface StudentImportProps {
    classId: string;
}

export const StudentImport: React.FC<StudentImportProps> = ({ classId }) => {
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stats, setStats] = useState({ count: 0 });

    const utils = api.useUtils();
    const importMutation = api.admin.bulkImportStudents.useMutation({
        onSuccess: (data) => {
            toast.success(`Imported ${data.success} students successfully`);
            if (data.failed > 0) {
                toast.error(`Failed to import ${data.failed} students`);
                setValidationErrors(data.errors);
            } else {
                setParsedData([]);
                setValidationErrors([]);
            }
            utils.admin.getStudentsByClass.invalidate({ classId });
            utils.admin.getClasses.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

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
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (jsonData.length === 0) {
                    toast.error("File is empty");
                    return;
                }

                // Smart Mapping
                // We look for common headers
                const mappedData = jsonData.map((row: any) => {
                    const keys = Object.keys(row);
                    const nameKey = keys.find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("student"));
                    const rollKey = keys.find(k => k.toLowerCase().includes("roll") || k.toLowerCase().includes("id"));
                    const admKey = keys.find(k => k.toLowerCase().includes("admission") || k.toLowerCase().includes("reg"));
                    const emailKey = keys.find(k => k.toLowerCase().includes("email") || k.toLowerCase().includes("mail"));
                    const mobileKey = keys.find(k => k.toLowerCase().includes("mobile") || k.toLowerCase().includes("phone"));

                    if (!nameKey) return null; // Name is mandatory

                    return {
                        name: String(row[nameKey]),
                        rollNumber: rollKey ? String(row[rollKey]) : undefined,
                        admissionNumber: admKey ? String(row[admKey]) : undefined,
                        email: emailKey ? String(row[emailKey]) : undefined,
                        mobile: mobileKey ? String(row[mobileKey]) : undefined
                    };
                }).filter(Boolean); // Remove nulls

                if (mappedData.length === 0) {
                    toast.error("Could not detect a 'Name' column in your Excel sheet.");
                    return;
                }

                setParsedData(mappedData);
                setStats({ count: mappedData.length });
                setValidationErrors([]);

            } catch (err) {
                toast.error("Failed to parse Excel file");
                console.error(err);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        maxFiles: 1,
    });

    const handleImport = () => {
        if (parsedData.length === 0) return;
        importMutation.mutate({
            classId,
            students: parsedData
        });
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-white mb-2">Bulk Student Import</h3>
            <p className="text-sm text-slate-400 mb-4">
                Upload an Excel sheet with columns like <strong>Name</strong>, <strong>Roll Number</strong>, <strong>Admission No</strong>, etc.
                <br />The system will auto-detect the columns.
            </p>

            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive
                    ? "border-brand-primary bg-brand-primary/10"
                    : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
                    }`}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-full bg-slate-800">
                        <Upload className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-base font-medium text-white">
                            {isDragActive ? "Drop the file here" : "Drag & drop Excel file"}
                        </p>
                    </div>
                </div>
            </div>

            {parsedData.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="text-green-400 w-5 h-5" />
                            <div>
                                <p className="font-medium text-green-400">Ready to Import</p>
                                <p className="text-sm text-green-300/80">
                                    Found <strong>{stats.count}</strong> valid student records.
                                </p>
                            </div>
                        </div>
                        <Button onClick={handleImport} disabled={importMutation.isPending} variant="primary">
                            {importMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Start Import
                        </Button>
                    </div>

                    {/* Simple Preview */}
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700 max-h-40 overflow-y-auto">
                        <table className="w-full text-xs text-left text-slate-300">
                            <thead className="text-slate-500 uppercase sticky top-0 bg-slate-900">
                                <tr>
                                    <th className="px-2 py-1">Name</th>
                                    <th className="px-2 py-1">Roll</th>
                                    <th className="px-2 py-1">Adm No</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.map((s, i) => (
                                    <tr key={i} className="border-b border-slate-700/50">
                                        <td className="px-2 py-1">{s.name}</td>
                                        <td className="px-2 py-1 font-mono text-slate-400">{s.rollNumber || "-"}</td>
                                        <td className="px-2 py-1 font-mono text-slate-400">{s.admissionNumber || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {validationErrors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-medium">
                        <AlertCircle className="w-5 h-5" />
                        Import Errors
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-300 max-h-40 overflow-y-auto">
                        {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};
