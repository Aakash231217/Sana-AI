"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { api } from "@/trpc/react";
import {
    Users,
    GraduationCap,
    FileSpreadsheet,
    Plus,
    Trash2,
    Edit2,
    Upload,
    Download,
    Search,
    BookOpen,
    BarChart3,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    ChevronDown,
} from "lucide-react";

type TabType = "students" | "marks" | "import" | "summary";

export default function TeacherDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>("students");
    const [selectedClassId, setSelectedClassId] = useState<string>("");

    const { data: classes, refetch: refetchClasses } = api.teacher.getAllClasses.useQuery();

    return (
        <ProtectedRoute>
            <main className="min-h-screen bg-brand-dark pt-24 px-6 pb-12">
                <Navbar />
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">Teacher Portal</h1>
                            <p className="text-slate-400">Manage students and their marks</p>
                        </div>
                    </div>

                    {/* Class Selector */}
                    <div className="mb-6">
                        <ClassSelector
                            classes={classes || []}
                            selectedClassId={selectedClassId}
                            onSelect={setSelectedClassId}
                            onClassCreated={refetchClasses}
                        />
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
                        {[
                            { id: "students", label: "Students", icon: Users },
                            { id: "marks", label: "Marks", icon: GraduationCap },
                            { id: "import", label: "Excel Import", icon: FileSpreadsheet },
                            { id: "summary", label: "Class Summary", icon: BarChart3 },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
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
                    {activeTab === "students" && <StudentsTab classId={selectedClassId} />}
                    {activeTab === "marks" && <MarksTab classId={selectedClassId} />}
                    {activeTab === "import" && <ImportTab classId={selectedClassId} />}
                    {activeTab === "summary" && <SummaryTab classId={selectedClassId} />}
                </div>
            </main>
        </ProtectedRoute>
    );
}

// ============ CLASS SELECTOR ============
function ClassSelector({
    classes,
    selectedClassId,
    onSelect,
    onClassCreated,
}: {
    classes: { id: string; name: string; section?: string | null; _count: { students: number } }[];
    selectedClassId: string;
    onSelect: (id: string) => void;
    onClassCreated: () => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [newSection, setNewSection] = useState("");

    const createClass = api.teacher.createClass.useMutation({
        onSuccess: (newClass) => {
            onClassCreated();
            onSelect(newClass.id);
            setShowCreate(false);
            setNewClassName("");
            setNewSection("");
        },
    });

    return (
        <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
                <label className="block text-sm text-slate-400 mb-2">Select Class</label>
                <div className="relative">
                    <select
                        value={selectedClassId}
                        onChange={(e) => onSelect(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-pink-500"
                    >
                        <option value="">Select a class...</option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} {cls.section ? `(${cls.section})` : ""} - {cls._count.students} students
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {!showCreate ? (
                <button
                    onClick={() => setShowCreate(true)}
                    className="mt-6 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-4 h-4" />
                    New Class
                </button>
            ) : (
                <div className="mt-6 flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Class name (e.g., 10-A)"
                        value={newClassName}
                        onChange={(e) => setNewClassName(e.target.value)}
                        className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                    <input
                        type="text"
                        placeholder="Section (optional)"
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 w-32"
                    />
                    <button
                        onClick={() => createClass.mutate({ name: newClassName, section: newSection || undefined })}
                        disabled={!newClassName || createClass.isPending}
                        className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                    >
                        {createClass.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => {
                            setShowCreate(false);
                            setNewClassName("");
                            setNewSection("");
                        }}
                        className="px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                    >
                        <XCircle className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ============ STUDENTS TAB ============
function StudentsTab({ classId }: { classId: string }) {
    const [search, setSearch] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        rollNumber: "",
    });

    const { data: students, refetch, isLoading } = api.teacher.getStudentsByClass.useQuery(
        { classId, search: search || undefined },
        { enabled: !!classId }
    );

    const addStudent = api.teacher.addStudent.useMutation({
        onSuccess: () => {
            refetch();
            setShowAddForm(false);
            setFormData({ name: "", email: "", mobile: "", rollNumber: "" });
        },
    });

    const deleteStudent = api.teacher.deleteStudent.useMutation({
        onSuccess: () => refetch(),
    });

    if (!classId) {
        return (
            <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to view students</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Add */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                    />
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
                >
                    <Plus className="w-4 h-4" />
                    Add Student
                </button>
            </div>

            {/* Add Student Form */}
            {showAddForm && (
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Add New Student</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Student Name *"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                        <input
                            type="text"
                            placeholder="Mobile (optional)"
                            value={formData.mobile}
                            onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                            className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                        <input
                            type="text"
                            placeholder="Roll Number (optional)"
                            value={formData.rollNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, rollNumber: e.target.value }))}
                            className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => addStudent.mutate({ ...formData, classId })}
                            disabled={!formData.name || addStudent.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
                        >
                            {addStudent.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Save Student
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setFormData({ name: "", email: "", mobile: "", rollNumber: "" });
                            }}
                            className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                    {addStudent.error && (
                        <p className="text-red-400 mt-2 text-sm">{addStudent.error.message}</p>
                    )}
                </div>
            )}

            {/* Students Table */}
            {isLoading ? (
                <LoadingSpinner />
            ) : students && students.length > 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th className="text-left p-4 text-slate-400 font-medium">Roll No</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Name</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Email</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Mobile</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Subjects</th>
                                <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white">{student.rollNumber || "-"}</td>
                                    <td className="p-4 text-white font-medium">{student.name}</td>
                                    <td className="p-4 text-slate-400">{student.email || "-"}</td>
                                    <td className="p-4 text-slate-400">{student.mobile || "-"}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                                            {student.marks.length} subjects
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete ${student.name}?`)) {
                                                    deleteStudent.mutate({ studentId: student.id });
                                                }
                                            }}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                            title="Delete student"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No students found. Add your first student!</p>
                </div>
            )}
        </div>
    );
}

// ============ MARKS TAB ============
function MarksTab({ classId }: { classId: string }) {
    const [selectedStudent, setSelectedStudent] = useState("");
    const [formData, setFormData] = useState({
        subjectName: "",
        marks: "",
        maxMarks: "100",
        examType: "",
    });

    const { data: students } = api.teacher.getStudentsByClass.useQuery(
        { classId },
        { enabled: !!classId }
    );

    const { data: marks, refetch: refetchMarks } = api.teacher.getStudentMarks.useQuery(
        { studentId: selectedStudent },
        { enabled: !!selectedStudent }
    );

    const addMarks = api.teacher.addStudentMarks.useMutation({
        onSuccess: () => {
            refetchMarks();
            setFormData({ subjectName: "", marks: "", maxMarks: "100", examType: "" });
        },
    });

    const deleteMarks = api.teacher.deleteMarks.useMutation({
        onSuccess: () => refetchMarks(),
    });

    if (!classId) {
        return (
            <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to manage marks</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Student Selector */}
            <div className="max-w-md">
                <label className="block text-sm text-slate-400 mb-2">Select Student</label>
                <div className="relative">
                    <select
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-pink-500"
                    >
                        <option value="">Select a student...</option>
                        {students?.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.rollNumber ? `${student.rollNumber} - ` : ""}{student.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {selectedStudent && (
                <>
                    {/* Add Marks Form */}
                    <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Add Marks</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <input
                                type="text"
                                placeholder="Subject Name *"
                                value={formData.subjectName}
                                onChange={(e) => setFormData(prev => ({ ...prev, subjectName: e.target.value }))}
                                className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                            <input
                                type="number"
                                placeholder="Marks *"
                                value={formData.marks}
                                onChange={(e) => setFormData(prev => ({ ...prev, marks: e.target.value }))}
                                className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                            <input
                                type="number"
                                placeholder="Max Marks"
                                value={formData.maxMarks}
                                onChange={(e) => setFormData(prev => ({ ...prev, maxMarks: e.target.value }))}
                                className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                            <input
                                type="text"
                                placeholder="Exam Type (optional)"
                                value={formData.examType}
                                onChange={(e) => setFormData(prev => ({ ...prev, examType: e.target.value }))}
                                className="px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <button
                            onClick={() => addMarks.mutate({
                                studentId: selectedStudent,
                                subjectName: formData.subjectName,
                                marks: parseFloat(formData.marks),
                                maxMarks: parseFloat(formData.maxMarks) || 100,
                                examType: formData.examType || undefined,
                            })}
                            disabled={!formData.subjectName || !formData.marks || addMarks.isPending}
                            className="mt-4 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                        >
                            {addMarks.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add Marks
                        </button>
                        {addMarks.error && (
                            <p className="text-red-400 mt-2 text-sm">{addMarks.error.message}</p>
                        )}
                    </div>

                    {/* Marks Table */}
                    {marks && marks.length > 0 ? (
                        <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th className="text-left p-4 text-slate-400 font-medium">Subject</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Marks</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Max Marks</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Percentage</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Exam Type</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marks.map((mark) => {
                                        const percentage = (mark.marks / mark.maxMarks) * 100;
                                        return (
                                            <tr key={mark.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-white font-medium">{mark.subjectName}</td>
                                                <td className="p-4 text-white">{mark.marks}</td>
                                                <td className="p-4 text-slate-400">{mark.maxMarks}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${percentage >= 80 ? "bg-green-500/20 text-green-400" :
                                                            percentage >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                                                                percentage >= 40 ? "bg-orange-500/20 text-orange-400" :
                                                                    "bg-red-500/20 text-red-400"
                                                        }`}>
                                                        {percentage.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-400">{mark.examType || "-"}</td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => deleteMarks.mutate({ markId: mark.id })}
                                                        className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                                        title="Delete marks"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">No marks recorded for this student yet</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============ IMPORT TAB ============
function ImportTab({ classId }: { classId: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState("");

    const bulkImport = api.teacher.bulkImportStudents.useMutation();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError("");
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("/api/teacher/parse-excel", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Failed to parse file");
                setParsedData(null);
            } else {
                setParsedData(result);
            }
        } catch (err) {
            setError("Failed to upload file");
            setParsedData(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImport = async () => {
        if (!parsedData || !classId) return;

        const validRows = parsedData.rows.filter((r: any) => r.errors.length === 0);

        const result = await bulkImport.mutateAsync({
            classId,
            students: validRows.map((row: any) => ({
                studentName: row.studentName,
                email: row.email,
                mobile: row.mobile,
                rollNumber: row.rollNumber,
                subject: row.subject,
                marks: row.marks,
                maxMarks: row.maxMarks,
                examType: row.examType,
            })),
        });

        alert(`Import complete!\n- Students created: ${result.studentsCreated}\n- Students updated: ${result.studentsUpdated}\n- Marks created: ${result.marksCreated}\n- Marks updated: ${result.marksUpdated}`);

        setParsedData(null);
        setFile(null);
    };

    if (!classId) {
        return (
            <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400">Please select a class to import data</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Download Template */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Download Template</h3>
                <p className="text-slate-400 mb-4">
                    Download the Excel template to see the expected format for importing student data.
                </p>
                <a
                    href="/api/teacher/parse-excel"
                    download="student_marks_template.xlsx"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                    <Download className="w-4 h-4" />
                    Download Template
                </a>
            </div>

            {/* Upload Area */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Upload Excel File</h3>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-pink-500/50 transition-colors">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                        id="excel-upload"
                    />
                    <label htmlFor="excel-upload" className="cursor-pointer">
                        {isUploading ? (
                            <RefreshCw className="w-12 h-12 mx-auto text-pink-400 animate-spin mb-4" />
                        ) : (
                            <Upload className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                        )}
                        <p className="text-white mb-2">
                            {file ? file.name : "Click to upload or drag and drop"}
                        </p>
                        <p className="text-slate-500 text-sm">
                            Supports: .xlsx, .xls, .csv
                        </p>
                    </label>
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}
            </div>

            {/* Preview */}
            {parsedData && (
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Preview Data</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">
                                {parsedData.validRows} of {parsedData.totalRows} rows valid
                            </span>
                            <button
                                onClick={handleImport}
                                disabled={parsedData.validRows === 0 || bulkImport.isPending}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                            >
                                {bulkImport.isPending ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="w-4 h-4" />
                                )}
                                Import {parsedData.validRows} Records
                            </button>
                        </div>
                    </div>

                    {parsedData.errors.length > 0 && (
                        <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
                            <p className="font-medium mb-2">Errors:</p>
                            <ul className="list-disc list-inside text-sm">
                                {parsedData.errors.map((err: string, i: number) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left p-3 text-slate-400 font-medium">Row</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Student Name</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Email</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Roll No</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Subject</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Marks</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Max</th>
                                    <th className="text-left p-3 text-slate-400 font-medium">Errors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.rows.map((row: any) => (
                                    <tr
                                        key={row.rowNumber}
                                        className={`border-t border-white/5 ${row.errors.length > 0 ? "bg-red-500/5" : ""}`}
                                    >
                                        <td className="p-3 text-slate-400">{row.rowNumber}</td>
                                        <td className="p-3">
                                            {row.errors.length === 0 ? (
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-400" />
                                            )}
                                        </td>
                                        <td className="p-3 text-white">{row.studentName}</td>
                                        <td className="p-3 text-slate-400">{row.email || "-"}</td>
                                        <td className="p-3 text-slate-400">{row.rollNumber || "-"}</td>
                                        <td className="p-3 text-white">{row.subject}</td>
                                        <td className="p-3 text-white">{row.marks}</td>
                                        <td className="p-3 text-slate-400">{row.maxMarks}</td>
                                        <td className="p-3 text-red-400 text-xs">
                                            {row.errors.join(", ")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ SUMMARY TAB ============
function SummaryTab({ classId }: { classId: string }) {
    const { data: summary, isLoading } = api.teacher.getClassSummary.useQuery(
        { classId },
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
        return <LoadingSpinner />;
    }

    if (!summary) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{summary.totalStudents}</p>
                    <p className="text-slate-400 text-sm">Total Students</p>
                </div>
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                            <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{summary.totalSubjects}</p>
                    <p className="text-slate-400 text-sm">Total Subjects</p>
                </div>
            </div>

            {/* Subject Statistics */}
            {summary.subjectStats.length > 0 && (
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Subject Statistics</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="text-left p-4 text-slate-400 font-medium">Subject</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Students</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Average %</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Highest %</th>
                                    <th className="text-left p-4 text-slate-400 font-medium">Lowest %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary.subjectStats.map((stat) => (
                                    <tr key={stat.subject} className="border-t border-white/5 hover:bg-white/5">
                                        <td className="p-4 text-white font-medium">{stat.subject}</td>
                                        <td className="p-4 text-slate-400">{stat.totalStudents}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs ${stat.average >= 80 ? "bg-green-500/20 text-green-400" :
                                                    stat.average >= 60 ? "bg-yellow-500/20 text-yellow-400" :
                                                        stat.average >= 40 ? "bg-orange-500/20 text-orange-400" :
                                                            "bg-red-500/20 text-red-400"
                                                }`}>
                                                {stat.average}%
                                            </span>
                                        </td>
                                        <td className="p-4 text-green-400">{stat.highest}%</td>
                                        <td className="p-4 text-red-400">{stat.lowest}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Performers */}
            {summary.topPerformers.length > 0 && (
                <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Top Performers</h3>
                    <div className="space-y-3">
                        {summary.topPerformers.map((student, index) => (
                            <div
                                key={student.id}
                                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                                            index === 1 ? "bg-slate-400/20 text-slate-300" :
                                                index === 2 ? "bg-orange-500/20 text-orange-400" :
                                                    "bg-slate-600/20 text-slate-400"
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{student.name}</p>
                                        {student.rollNumber && (
                                            <p className="text-slate-500 text-sm">Roll No: {student.rollNumber}</p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-2xl font-bold text-pink-400">{student.average}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ LOADING SPINNER ============
function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-pink-400 animate-spin" />
        </div>
    );
}
