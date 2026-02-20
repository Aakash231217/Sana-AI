"use client";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { api } from "@/trpc/react";
import { ClassManagement } from "@/components/admin/classes/ClassManagement";
import { MarksManagement } from "@/components/admin/MarksManagement";
import { DailyActivities } from "@/components/admin/school/DailyActivities";
import { InquiriesManagement } from "@/components/admin/school/InquiriesManagement";
import { AdmissionsManagement } from "@/components/admin/school/AdmissionsManagement";
import { CalendarYearMaster } from "@/components/admin/school/CalendarYearMaster";
import { DocumentMaster } from "@/components/admin/school/DocumentMaster";
import { BranchManagement } from "@/components/admin/school/BranchManagement";
import {
  Users,
  MessageSquare,
  Flag,
  AlertTriangle,
  TrendingUp,
  Brain,
  Settings,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  BarChart3,
  Activity,
  Target,
  Sparkles,
  GraduationCap,
  School,
  ClipboardList,
  PhoneIncoming,
  UserPlus,
  Calendar,
  FileText,
  Building2,
} from "lucide-react";

type TabType = "overview" | "classes" | "students" | "queries" | "flags" | "settings" | "marks" | "activities" | "inquiries" | "admissions" | "calendar" | "documents" | "branches";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-dark pt-24 px-6 pb-12">
        <Navbar />
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
              <p className="text-slate-400">Monitor student activity and manage Sana-AI</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                System Active
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "activities", label: "Daily Activities", icon: ClipboardList },
              { id: "inquiries", label: "Inquiries", icon: PhoneIncoming },
              { id: "admissions", label: "Admissions", icon: UserPlus },
              { id: "classes", label: "Classes", icon: School },
              { id: "students", label: "Students", icon: Users },
              { id: "marks", label: "Marks", icon: GraduationCap },
              { id: "calendar", label: "Calendar", icon: Calendar },
              { id: "documents", label: "Documents", icon: FileText },
              { id: "branches", label: "Branches", icon: Building2 },
              { id: "queries", label: "Queries", icon: MessageSquare },
              { id: "flags", label: "Flags", icon: Flag },
              { id: "settings", label: "Settings", icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id
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
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "activities" && <DailyActivities />}
          {activeTab === "inquiries" && <InquiriesManagement />}
          {activeTab === "admissions" && <AdmissionsManagement />}
          {activeTab === "classes" && <ClassManagement />}
          {activeTab === "students" && <StudentsTab />}
          {activeTab === "marks" && <MarksManagement />}
          {activeTab === "calendar" && <CalendarYearMaster />}
          {activeTab === "documents" && <DocumentMaster />}
          {activeTab === "branches" && <BranchManagement />}
          {activeTab === "queries" && <QueriesTab />}
          {activeTab === "flags" && <FlagsTab />}
          {activeTab === "settings" && <SettingsTab />}
        </div>
      </main>
    </ProtectedRoute>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab() {
  const { data: stats, isLoading, refetch } = api.admin.getDashboardStats.useQuery();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents || 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Today"
          value={stats?.activeStudents || 0}
          icon={Activity}
          color="bg-green-500"
        />
        <StatCard
          title="Flagged Students"
          value={stats?.flaggedStudents || 0}
          icon={AlertTriangle}
          color="bg-red-500"
          alert={stats?.flaggedStudents ? stats.flaggedStudents > 0 : false}
        />
        <StatCard
          title="Total Queries"
          value={stats?.totalQueries || 0}
          icon={MessageSquare}
          color="bg-violet-500"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          title="Suspicious Queries"
          value={stats?.suspiciousQueries || 0}
          icon={AlertTriangle}
          color="bg-orange-500"
          alert={stats?.suspiciousQueries ? stats.suspiciousQueries > 0 : false}
        />
        <StatCard
          title="Unresolved Flags"
          value={stats?.unresolvedFlags || 0}
          icon={Flag}
          color="bg-pink-500"
          alert={stats?.unresolvedFlags ? stats.unresolvedFlags > 0 : false}
        />
        <StatCard
          title="Queries Today"
          value={stats?.todayQueries || 0}
          icon={TrendingUp}
          color="bg-cyan-500"
        />
      </div>

      {/* Category Distribution */}
      {stats?.categoryDistribution && stats.categoryDistribution.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Query Categories</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.categoryDistribution.map((cat: any) => (
              <div
                key={cat.category}
                className="bg-slate-800/50 rounded-xl p-4 border border-white/5"
              >
                <p className="text-slate-400 text-sm">{cat.category}</p>
                <p className="text-2xl font-bold text-white">{cat._count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Stats
        </button>
      </div>
    </div>
  );
}

// ============ STUDENTS TAB ============
function StudentsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data, isLoading } = api.admin.getAllStudents.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    filterFlagged,
  });

  const analyzeStudentMutation = api.admin.analyzeStudentQueries.useMutation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
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
          onClick={() => setFilterFlagged(!filterFlagged)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${filterFlagged
            ? "bg-red-500/20 border-red-500/50 text-red-400"
            : "bg-slate-800 border-white/10 text-slate-400"
            }`}
        >
          <Filter className="w-4 h-4" />
          Flagged Only
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="text-left p-4 text-slate-400 font-medium">Student</th>
              <th className="text-left p-4 text-slate-400 font-medium">Queries</th>
              <th className="text-left p-4 text-slate-400 font-medium">Status</th>
              <th className="text-left p-4 text-slate-400 font-medium">Career Goal</th>
              <th className="text-left p-4 text-slate-400 font-medium">Last Active</th>
              <th className="text-left p-4 text-slate-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.students.map((student: any) => (
              <tr
                key={student.id}
                className="border-t border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <p className="text-white font-medium">{student.name}</p>
                    <p className="text-slate-500 text-sm">{student.email}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-white">{student._count.queries}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {student.isFlagged ? (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Flagged ({student._count.flags})
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        Normal
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="text-slate-400 text-sm">
                    {student.careerInsight?.careerGoal || "Not analyzed"}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-slate-400 text-sm">
                    {new Date(student.lastActive).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedStudent(student.id)}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => analyzeStudentMutation.mutate({ studentId: student.id })}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-pink-400 transition-colors"
                      title="Analyze with AI"
                      disabled={analyzeStudentMutation.isPending}
                    >
                      <Brain className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-slate-400">
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          studentId={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

// ============ STUDENT DETAIL MODAL ============
function StudentDetailModal({
  studentId,
  onClose,
}: {
  studentId: string;
  onClose: () => void;
}) {
  const { data: student, isLoading } = api.admin.getStudentDetails.useQuery({
    studentId,
  });
  const { data: insight } = api.admin.getCareerInsight.useQuery({ studentId });
  const analyzeMutation = api.admin.analyzeStudentQueries.useMutation();
  const utils = api.useUtils();

  const handleAnalyze = async () => {
    await analyzeMutation.mutateAsync({ studentId });
    utils.admin.getCareerInsight.invalidate({ studentId });
    utils.admin.getStudentDetails.invalidate({ studentId });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{student?.name}</h2>
            <p className="text-slate-400">{student?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Student Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total Queries</p>
              <p className="text-2xl font-bold text-white">{student?.totalQueries}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Active Flags</p>
              <p className="text-2xl font-bold text-white">
                {student?.flags.filter((f: any) => !f.isResolved).length}
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Status</p>
              <p
                className={`text-2xl font-bold ${student?.isFlagged ? "text-red-400" : "text-green-400"}`}
              >
                {student?.isFlagged ? "Flagged" : "Normal"}
              </p>
            </div>
          </div>

          {/* AI Career Insight */}
          <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-xl border border-pink-500/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                AI Career Analysis
              </h3>
              <button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {analyzeMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze Now"}
              </button>
            </div>

            {insight ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  <span className="text-slate-400">Career Goal:</span>
                  <span className="text-white font-medium">
                    {insight.careerGoal || "Not determined"}
                  </span>
                </div>

                {insight.aiSummary && (
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <p className="text-slate-300">{insight.aiSummary}</p>
                  </div>
                )}

                {insight.interests && insight.interests.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Interests:</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.interests.map((interest: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insight.recommendedPaths && insight.recommendedPaths.length > 0 && (
                  <div>
                    <p className="text-slate-400 text-sm mb-2">Recommended Paths:</p>
                    <div className="flex flex-wrap gap-2">
                      {insight.recommendedPaths.map((path: string, i: number) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm"
                        >
                          {path}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insight.lastAnalyzed && (
                  <p className="text-slate-500 text-xs">
                    Last analyzed: {new Date(insight.lastAnalyzed).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-400">
                No analysis yet. Click "Analyze Now" to generate AI insights.
              </p>
            )}
          </div>

          {/* Recent Queries */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Recent Queries</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {student?.queries.slice(0, 20).map((query: any) => (
                <div
                  key={query.id}
                  className={`p-4 rounded-xl border ${query.isSuspicious
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-slate-800/50 border-white/5"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white">{query.query}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                          {query.category}
                        </span>
                        {query.isSuspicious && (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 rounded text-red-400">
                            Suspicious
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {new Date(query.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Flags */}
          {student?.flags && student.flags.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Flags</h3>
              <div className="space-y-2">
                {student.flags.map((flag: any) => (
                  <div
                    key={flag.id}
                    className={`p-4 rounded-xl border ${flag.isResolved
                      ? "bg-slate-800/30 border-white/5"
                      : "bg-red-500/10 border-red-500/30"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${flag.severity === "CRITICAL"
                              ? "bg-red-600 text-white"
                              : flag.severity === "HIGH"
                                ? "bg-orange-500/20 text-orange-400"
                                : flag.severity === "MEDIUM"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                          >
                            {flag.severity}
                          </span>
                          <span className="text-slate-400 text-sm">{flag.flagType}</span>
                        </div>
                        <p className="text-white mt-1">{flag.reason}</p>
                      </div>
                      {flag.isResolved ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ QUERIES TAB ============
function QueriesTab() {
  const [page, setPage] = useState(1);
  const [onlySuspicious, setOnlySuspicious] = useState(false);
  const [category, setCategory] = useState<string>("");

  const { data, isLoading } = api.admin.getRecentQueries.useQuery({
    page,
    limit: 50,
    onlySuspicious,
    category: category || undefined,
  });

  const flagMutation = api.admin.createFlag.useMutation();
  const utils = api.useUtils();

  const handleFlag = async (query: any) => {
    await flagMutation.mutateAsync({
      studentId: query.studentId,
      queryId: query.id,
      flagType: "SUSPICIOUS_BEHAVIOR",
      severity: "MEDIUM",
      reason: "Manually flagged by admin",
      details: `Query: "${query.query}"`,
    });
    utils.admin.getRecentQueries.invalidate();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={() => setOnlySuspicious(!onlySuspicious)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${onlySuspicious
            ? "bg-red-500/20 border-red-500/50 text-red-400"
            : "bg-slate-800 border-white/10 text-slate-400"
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Suspicious Only
        </button>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="GENERAL">General</option>
          <option value="ACADEMIC">Academic</option>
          <option value="CAREER">Career</option>
          <option value="PERSONAL">Personal</option>
          <option value="OFF_TOPIC">Off Topic</option>
          <option value="INAPPROPRIATE">Inappropriate</option>
        </select>
      </div>

      {/* Queries List */}
      <div className="space-y-3">
        {data?.queries.map((query: any) => (
          <div
            key={query.id}
            className={`bg-slate-900 rounded-xl border p-4 ${query.isSuspicious ? "border-red-500/30" : "border-white/10"
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-medium">{query.student.name}</span>
                  {query.student.isFlagged && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                      Flagged Student
                    </span>
                  )}
                </div>
                <p className="text-slate-300">{query.query}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                    {query.category}
                  </span>
                  {query.isSuspicious && (
                    <span className="text-xs px-2 py-0.5 bg-red-500/20 rounded text-red-400">
                      ⚠️ Suspicious
                    </span>
                  )}
                  {query.subjectName && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 rounded text-blue-400">
                      {query.subjectName}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-slate-500 text-xs">
                  {new Date(query.createdAt).toLocaleString()}
                </span>
                {!query.flags?.length && (
                  <button
                    onClick={() => handleFlag(query)}
                    disabled={flagMutation.isPending}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    title="Flag this query"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-slate-400">
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ============ FLAGS TAB ============
function FlagsTab() {
  const [page, setPage] = useState(1);
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [severity, setSeverity] = useState<string>("");

  const { data, isLoading } = api.admin.getAllFlags.useQuery({
    page,
    limit: 20,
    onlyUnresolved,
    severity: severity as any || undefined,
  });

  const resolveMutation = api.admin.resolveFlag.useMutation();
  const utils = api.useUtils();

  const handleResolve = async (flagId: string) => {
    const note = prompt("Enter resolution note:");
    if (note) {
      await resolveMutation.mutateAsync({
        flagId,
        resolutionNote: note,
      });
      utils.admin.getAllFlags.invalidate();
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <button
          onClick={() => setOnlyUnresolved(!onlyUnresolved)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${onlyUnresolved
            ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
            : "bg-slate-800 border-white/10 text-slate-400"
            }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Unresolved Only
        </button>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Flags List */}
      <div className="space-y-3">
        {data?.flags.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <p>No flags to show!</p>
          </div>
        ) : (
          data?.flags.map((flag: any) => (
            <div
              key={flag.id}
              className={`bg-slate-900 rounded-xl border p-4 ${flag.isResolved ? "border-white/10 opacity-60" : "border-red-500/30"
                }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${flag.severity === "CRITICAL"
                        ? "bg-red-600 text-white"
                        : flag.severity === "HIGH"
                          ? "bg-orange-500/20 text-orange-400"
                          : flag.severity === "MEDIUM"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                    >
                      {flag.severity}
                    </span>
                    <span className="text-slate-400 text-sm">{flag.flagType}</span>
                    {flag.isResolved && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">Student: {flag.student.name}</p>
                  <p className="text-slate-300 mt-1">{flag.reason}</p>
                  {flag.query && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded text-sm text-slate-400">
                      Query: "{flag.query.query}"
                    </div>
                  )}
                  {flag.isResolved && flag.resolutionNote && (
                    <div className="mt-2 p-2 bg-green-500/10 rounded text-sm text-green-400">
                      Resolution: {flag.resolutionNote}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-slate-500 text-xs">
                    {new Date(flag.createdAt).toLocaleString()}
                  </span>
                  {!flag.isResolved && (
                    <button
                      onClick={() => handleResolve(flag.id)}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-slate-400">
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab() {
  const { data: settings, isLoading } = api.admin.getAdminSettings.useQuery();
  const updateMutation = api.admin.updateAdminSettings.useMutation();
  const analyzeAllMutation = api.admin.analyzeAllStudents.useMutation();
  const utils = api.useUtils();

  const [keywords, setKeywords] = useState<string>("");
  const [threshold, setThreshold] = useState(5);
  const [autoAnalysis, setAutoAnalysis] = useState(true);

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setKeywords(settings.suspiciousKeywords.join(", "));
      setThreshold(settings.autoFlagThreshold);
      setAutoAnalysis(settings.enableAutoAnalysis);
    }
  });

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      suspiciousKeywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      autoFlagThreshold: threshold,
      enableAutoAnalysis: autoAnalysis,
    });
    utils.admin.getAdminSettings.invalidate();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-6">Admin Settings</h3>

        <div className="space-y-6">
          {/* Suspicious Keywords */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Suspicious Keywords (comma-separated)
            </label>
            <textarea
              value={keywords || settings?.suspiciousKeywords.join(", ")}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 min-h-[100px]"
              placeholder="cheat, hack, answer key..."
            />
            <p className="text-slate-500 text-xs mt-1">
              Queries containing these keywords will be automatically flagged
            </p>
          </div>

          {/* Auto Flag Threshold */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Auto Flag Threshold (suspicious queries before auto-flag)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
              min={1}
              max={20}
            />
          </div>

          {/* Auto Analysis Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Enable Auto Analysis</p>
              <p className="text-slate-500 text-sm">
                Automatically analyze student queries with AI
              </p>
            </div>
            <button
              onClick={() => setAutoAnalysis(!autoAnalysis)}
              className={`w-12 h-6 rounded-full transition-colors ${autoAnalysis ? "bg-pink-600" : "bg-slate-600"
                }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${autoAnalysis ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Bulk Analysis */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Bulk Actions</h3>
        <div className="space-y-4">
          <button
            onClick={() => analyzeAllMutation.mutate()}
            disabled={analyzeAllMutation.isPending}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {analyzeAllMutation.isPending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Analyzing all students...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                Analyze All Students
              </>
            )}
          </button>
          {analyzeAllMutation.data && (
            <p className="text-green-400 text-center">
              ✓ Analyzed {analyzeAllMutation.data.analyzed} students
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ HELPER COMPONENTS ============
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  alert,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-slate-900 rounded-2xl border p-6 ${alert ? "border-red-500/50" : "border-white/10"
        }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
    </div>
  );
}
