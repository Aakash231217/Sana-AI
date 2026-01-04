"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { api } from "@/trpc/react";
import {
    Users,
    Calendar,
    Upload,
    Download,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    RefreshCw,
    ChevronDown,
    Search,
    FileSpreadsheet,
    BarChart3,
    Trash2,
    Check,
    X,
    Minus,
    Shield,
} from "lucide-react";

type TabType = "mark" | "history" | "import" | "summary";

export default function AttendancePage() {
    const [activeTab, setActiveTab] = useState<TabType>("mark");
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    const { data: classes, refetch: refetchClasses } = api.teacher.getAllClasses.useQuery();

    return (
        <ProtectedRoute>
            <main className="min-h-screen bg-brand-dark pt-24 px-6 pb-12">
                <Navbar />
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">Attendance Management</h1>
                            <p className="text-slate-400">Track and manage student attendance</p>
                        </div>
                    </div>

                    {/* Class Selector */}
                    <div className="mb-6">
                        <label className="block text-sm text-slate-400 mb-2">Select Class</label>
                        <div className="relative max-w-xs">
                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-pink-500"
                            >
                                <option value="">Select a class...</option>
                                {classes?.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} {cls.section ? `(${cls.section})` : ""} - {cls._count.students} students
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
                        {[
                            { id: "mark", label: "Mark Attendance", icon: CheckCircle },
                            { id: "history", label: "History", icon: Calendar },
                            { id: "import", label: "Excel Import", icon: Upload },
                            { id: "summary", label: "Summary", icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                    activeTab === tab.id
                                        ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "mark" && <MarkAttendanceTab classId={selectedClassId} />}
                    {activeTab === "history" && <HistoryTab classId={selectedClassId} />}
                    {activeTab === "import" && <ImportTab classId={selectedClassId} />}
                    {activeTab === "summary" && <SummaryTab classId={selectedClassId} />}
                </div>
            </main>
        </ProtectedRoute>
    );
}

// ============ MARK ATTENDANCE TAB ============
function MarkAttendanceTab({ classId }: { classId: string }) {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [subjectName, setSubjectName] = useState("");
    const [attendanceData, setAttendanceData] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED">>({});
    const [sessionId, setSessionId] = useState<string | null>(null);

    const { data: students } = api.teacher.getStudentsByClass.useQuery(
        { classId },
        { enabled: !!classId }
    );

    const createSession = api.attendance.createAttendanceSession.useMutation({
        onSuccess: (data) => {
            setSessionId(data.id);
            // Initialize attendance data from session
            const initial: Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"> = {};
            data.records.forEach((r) => {
                initial[r.studentRecordId] = r.status as any;
            });
            setAttendanceData(initial);
        },
    });

    const bulkUpdate = api.attendance.bulkUpdateAttendance.useMutation({
        onSuccess: () => {
            alert("Attendance saved successfully!");
        },
    });

    const handleStartSession = () => {
        if (!classId || !date) return;
        createSession.mutate({
            classId,
            date,
            subjectName: subjectName || undefined,
        });
    };

    const handleSaveAttendance = () => {
        if (!sessionId) return;
        const records = Object.entries(attendanceData).map(([studentRecordId, status]) => ({
            studentRecordId,
            status,
        }));
        bulkUpdate.mutate({ sessionId, records });
    };

    const setAllStatus = (status: "PRESENT" | "ABSENT" | "LATE") => {
        const newData: Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"> = {};
        students?.forEach((s) => {
            newData[s.id] = status;
        });
        setAttendanceData(newData);
    };

    if (!classId) {
        return (
            <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to mark attendance</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Session Setup */}
            {!sessionId ? (
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Start Attendance Session</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Date *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Subject (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g., Mathematics"
                                value={subjectName}
                                onChange={(e) => setSubjectName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleStartSession}
                                disabled={createSession.isPending}
                                className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                            >
                                {createSession.isPending ? (
                                    <RefreshCw className="w-5 h-5 mx-auto animate-spin" />
                                ) : (
                                    "Start Session"
                                )}
                            </button>
                        </div>
                    </div>
                    {createSession.error && (
                        <p className="text-red-400 mt-4 text-sm">{createSession.error.message}</p>
                    )}
                </div>
            ) : (
                <>
                    {/* Quick Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-400">Quick Actions:</span>
                            <button
                                onClick={() => setAllStatus("PRESENT")}
                                className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => setAllStatus("ABSENT")}
                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                            >
                                Mark All Absent
                            </button>
                        </div>
                        <button
                            onClick={handleSaveAttendance}
                            disabled={bulkUpdate.isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                        >
                            {bulkUpdate.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                            Save Attendance
                        </button>
                    </div>

                    {/* Attendance Grid */}
                    <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left p-4 text-slate-400 font-medium">Roll No</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">
                                        <span className="flex items-center justify-center gap-1">
                                            <Check className="w-4 h-4 text-green-400" />
                                            Present
                                        </span>
                                    </th>
                                    <th className="text-center p-4 text-slate-400 font-medium">
                                        <span className="flex items-center justify-center gap-1">
                                            <X className="w-4 h-4 text-red-400" />
                                            Absent
                                        </span>
                                    </th>
                                    <th className="text-center p-4 text-slate-400 font-medium">
                                        <span className="flex items-center justify-center gap-1">
                                            <Clock className="w-4 h-4 text-yellow-400" />
                                            Late
                                        </span>
                                    </th>
                                    <th className="text-center p-4 text-slate-400 font-medium">
                                        <span className="flex items-center justify-center gap-1">
                                            <Shield className="w-4 h-4 text-blue-400" />
                                            Excused
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {students?.map((student) => (
                                    <tr key={student.id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-4 text-white">{student.rollNumber || "-"}</td>
                                        <td className="p-4 text-white font-medium">{student.name}</td>
                                        {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((status) => (
                                            <td key={status} className="p-4 text-center">
                                                <button
                                                    onClick={() =>
                                                        setAttendanceData((prev) => ({
                                                            ...prev,
                                                            [student.id]: status,
                                                        }))
                                                    }
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                        attendanceData[student.id] === status
                                                            ? status === "PRESENT"
                                                                ? "bg-green-500 text-white"
                                                                : status === "ABSENT"
                                                                ? "bg-red-500 text-white"
                                                                : status === "LATE"
                                                                ? "bg-yellow-500 text-white"
                                                                : "bg-blue-500 text-white"
                                                            : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                                                    }`}
                                                >
                                                    {status === "PRESENT" && <Check className="w-4 h-4" />}
                                                    {status === "ABSENT" && <X className="w-4 h-4" />}
                                                    {status === "LATE" && <Clock className="w-4 h-4" />}
                                                    {status === "EXCUSED" && <Shield className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-green-400">
                                {Object.values(attendanceData).filter((s) => s === "PRESENT").length}
                            </p>
                            <p className="text-slate-400 text-sm">Present</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-red-400">
                                {Object.values(attendanceData).filter((s) => s === "ABSENT").length}
                            </p>
                            <p className="text-slate-400 text-sm">Absent</p>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-yellow-400">
                                {Object.values(attendanceData).filter((s) => s === "LATE").length}
                            </p>
                            <p className="text-slate-400 text-sm">Late</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold text-blue-400">
                                {Object.values(attendanceData).filter((s) => s === "EXCUSED").length}
                            </p>
                            <p className="text-slate-400 text-sm">Excused</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ============ HISTORY TAB ============
function HistoryTab({ classId }: { classId: string }) {
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const { data: sessions, isLoading, refetch } = api.attendance.getAttendanceSessions.useQuery(
        {
            classId,
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined,
        },
        { enabled: !!classId }
    );

    const deleteSession = api.attendance.deleteAttendanceSession.useMutation({
        onSuccess: () => refetch(),
    });

    if (!classId) {
        return (
            <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to view attendance history</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">From</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">To</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                    />
                </div>
            </div>

            {/* Sessions List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
                </div>
            ) : sessions && sessions.length > 0 ? (
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="bg-slate-900 rounded-2xl border border-white/10 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {new Date(session.date).toLocaleDateString("en-US", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </h3>
                                    {session.subjectName && (
                                        <p className="text-slate-400 text-sm">{session.subjectName}</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm("Delete this attendance session?")) {
                                            deleteSession.mutate({ sessionId: session.id });
                                        }
                                    }}
                                    className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-green-500/10 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{session.totalPresent}</p>
                                    <p className="text-slate-400 text-xs">Present</p>
                                </div>
                                <div className="bg-red-500/10 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-red-400">{session.totalAbsent}</p>
                                    <p className="text-slate-400 text-xs">Absent</p>
                                </div>
                                <div className="bg-yellow-500/10 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-yellow-400">{session.totalLate}</p>
                                    <p className="text-slate-400 text-xs">Late</p>
                                </div>
                                <div className="bg-slate-800 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-white">{session._count.records}</p>
                                    <p className="text-slate-400 text-xs">Total</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No attendance records found</p>
                </div>
            )}
        </div>
    );
}

// ============ IMPORT TAB ============
function ImportTab({ classId }: { classId: string }) {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [subjectName, setSubjectName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[] | null>(null);
    const [importResult, setImportResult] = useState<any>(null);

    const importAttendance = api.attendance.importAttendanceFromExcel.useMutation({
        onSuccess: (result) => {
            setImportResult(result);
            setPreviewData(null);
            setFile(null);
        },
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setImportResult(null);

        // Parse Excel file
        try {
            const XLSX = await import("xlsx");
            const data = await uploadedFile.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            // Map to expected format
            const mapped = jsonData.map((row: any) => ({
                rollNumber: row["Roll Number"] || row["Roll No"] || row["roll_number"] || row["rollNumber"] || "",
                name: row["Name"] || row["Student Name"] || row["name"] || "",
                status: row["Status"] || row["Attendance"] || row["status"] || "P",
                remarks: row["Remarks"] || row["remarks"] || "",
            }));

            setPreviewData(mapped);
        } catch (error) {
            console.error("Failed to parse Excel:", error);
            alert("Failed to parse Excel file. Please ensure it has the correct format.");
        }
    };

    const handleImport = () => {
        if (!classId || !previewData) return;

        importAttendance.mutate({
            classId,
            date,
            subjectName: subjectName || undefined,
            attendanceData: previewData.map((row) => ({
                rollNumber: String(row.rollNumber),
                name: String(row.name),
                status: row.status.toUpperCase() as any,
                remarks: row.remarks,
            })),
        });
    };

    if (!classId) {
        return (
            <div className="text-center py-12">
                <Upload className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to import attendance</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Import Form */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Import from Excel</h3>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Subject (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g., Mathematics"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Excel File *</label>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-slate-400 cursor-pointer hover:border-pink-500 transition-colors">
                            <FileSpreadsheet className="w-5 h-5" />
                            {file ? file.name : "Choose file..."}
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Format Guide */}
                <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-2">Expected Excel Format:</h4>
                    <p className="text-slate-500 text-sm">
                        Columns: <code className="text-pink-400">Roll Number</code>, <code className="text-pink-400">Name</code>, <code className="text-pink-400">Status</code> (P/A/L/E or PRESENT/ABSENT/LATE/EXCUSED), <code className="text-pink-400">Remarks</code> (optional)
                    </p>
                </div>

                {/* Preview */}
                {previewData && (
                    <div className="mb-6">
                        <h4 className="text-lg font-medium text-white mb-3">Preview ({previewData.length} records)</h4>
                        <div className="bg-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-slate-700 sticky top-0">
                                    <tr>
                                        <th className="text-left p-3 text-slate-400 text-sm">Roll No</th>
                                        <th className="text-left p-3 text-slate-400 text-sm">Name</th>
                                        <th className="text-left p-3 text-slate-400 text-sm">Status</th>
                                        <th className="text-left p-3 text-slate-400 text-sm">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.slice(0, 10).map((row, i) => (
                                        <tr key={i} className="border-t border-white/5">
                                            <td className="p-3 text-white text-sm">{row.rollNumber || "-"}</td>
                                            <td className="p-3 text-white text-sm">{row.name}</td>
                                            <td className="p-3">
                                                <span
                                                    className={`px-2 py-1 rounded text-xs ${
                                                        row.status.toUpperCase() === "P" || row.status.toUpperCase() === "PRESENT"
                                                            ? "bg-green-500/20 text-green-400"
                                                            : row.status.toUpperCase() === "A" || row.status.toUpperCase() === "ABSENT"
                                                            ? "bg-red-500/20 text-red-400"
                                                            : row.status.toUpperCase() === "L" || row.status.toUpperCase() === "LATE"
                                                            ? "bg-yellow-500/20 text-yellow-400"
                                                            : "bg-blue-500/20 text-blue-400"
                                                    }`}
                                                >
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-400 text-sm">{row.remarks || "-"}</td>
                                        </tr>
                                    ))}
                                    {previewData.length > 10 && (
                                        <tr className="border-t border-white/5">
                                            <td colSpan={4} className="p-3 text-slate-400 text-sm text-center">
                                                ... and {previewData.length - 10} more records
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Import Button */}
                {previewData && (
                    <button
                        onClick={handleImport}
                        disabled={importAttendance.isPending}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                    >
                        {importAttendance.isPending ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Import Attendance
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Import Result */}
            {importResult && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Import Successful
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-800 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-white">{importResult.stats.totalImported}</p>
                            <p className="text-slate-400 text-sm">Total Records</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-green-400">{importResult.stats.matched}</p>
                            <p className="text-slate-400 text-sm">Matched Students</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-yellow-400">{importResult.stats.unmatched.length}</p>
                            <p className="text-slate-400 text-sm">Unmatched</p>
                        </div>
                    </div>
                    {importResult.stats.unmatched.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-500/10 rounded-xl">
                            <p className="text-yellow-400 text-sm font-medium mb-2">Unmatched students:</p>
                            <p className="text-slate-400 text-sm">{importResult.stats.unmatched.join(", ")}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============ SUMMARY TAB ============
function SummaryTab({ classId }: { classId: string }) {
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const { data: summary, isLoading } = api.attendance.getClassAttendanceSummary.useQuery(
        {
            classId,
            startDate: dateRange.start || undefined,
            endDate: dateRange.end || undefined,
        },
        { enabled: !!classId }
    );

    if (!classId) {
        return (
            <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to view summary</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">From</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                    />
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">To</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                    />
                </div>
            </div>

            {/* Overall Stats */}
            {summary && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 text-center">
                            <p className="text-4xl font-bold text-white mb-2">{summary.overallStats.totalSessions}</p>
                            <p className="text-slate-400">Total Sessions</p>
                        </div>
                        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6 text-center">
                            <p className="text-4xl font-bold text-green-400 mb-2">
                                {summary.overallStats.averageAttendance}%
                            </p>
                            <p className="text-slate-400">Average Attendance</p>
                        </div>
                    </div>

                    {/* Student-wise Summary */}
                    <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="text-lg font-bold text-white">Student-wise Summary</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left p-4 text-slate-400 font-medium">Roll No</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">Present</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">Absent</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">Late</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">Total</th>
                                    <th className="text-center p-4 text-slate-400 font-medium">Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.studentStats.map((student) => (
                                    <tr key={student.id} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-4 text-white">{student.rollNumber || "-"}</td>
                                        <td className="p-4 text-white font-medium">{student.name}</td>
                                        <td className="p-4 text-center text-green-400">{student.present}</td>
                                        <td className="p-4 text-center text-red-400">{student.absent}</td>
                                        <td className="p-4 text-center text-yellow-400">{student.late}</td>
                                        <td className="p-4 text-center text-white">{student.total}</td>
                                        <td className="p-4 text-center">
                                            <span
                                                className={`px-2 py-1 rounded-full text-sm font-medium ${
                                                    student.percentage >= 75
                                                        ? "bg-green-500/20 text-green-400"
                                                        : student.percentage >= 50
                                                        ? "bg-yellow-500/20 text-yellow-400"
                                                        : "bg-red-500/20 text-red-400"
                                                }`}
                                            >
                                                {student.percentage}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {summary.studentStats.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-slate-400">No attendance data available</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
