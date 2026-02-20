"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  X,
  ChevronDown,
  RefreshCw,
  Trash2,
} from "lucide-react";

export function InquiriesManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = api.school.getInquiries.useQuery({
    page,
    limit: 20,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
    search: search || undefined,
  });

  const utils = api.useUtils();

  const updateStatusMutation = api.school.updateInquiryStatus.useMutation({
    onSuccess: () => {
      utils.school.getInquiries.invalidate();
      utils.school.getDailyActivities.invalidate();
    },
  });

  const deleteMutation = api.school.deleteInquiry.useMutation({
    onSuccess: () => {
      utils.school.getInquiries.invalidate();
      utils.school.getDailyActivities.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500/20 text-blue-400",
    CONTACTED: "bg-yellow-500/20 text-yellow-400",
    FOLLOW_UP: "bg-orange-500/20 text-orange-400",
    CONVERTED: "bg-green-500/20 text-green-400",
    CLOSED: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="FOLLOW_UP">Follow Up</option>
          <option value="CONVERTED">Converted</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
        >
          <option value="">All Sources</option>
          <option value="WALK_IN">Walk In</option>
          <option value="PHONE">Phone</option>
          <option value="WEBSITE">Website</option>
          <option value="REFERRAL">Referral</option>
          <option value="SOCIAL_MEDIA">Social Media</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Inquiry
        </button>
      </div>

      {/* Inquiries Table */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Student</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Parent</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Class</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Source</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.inquiries.map((inq: any) => (
                <tr key={inq.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="text-white font-medium">{inq.studentName}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-white text-sm">{inq.parentName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-400 text-xs">{inq.parentPhone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-300 text-sm">{inq.classAppliedFor}</td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 capitalize">
                      {inq.source.replace("_", " ").toLowerCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={inq.status}
                      onChange={(e) =>
                        updateStatusMutation.mutate({ id: inq.id, status: e.target.value as any })
                      }
                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${statusColors[inq.status] || "bg-slate-700 text-slate-300"}`}
                    >
                      <option value="NEW">New</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="FOLLOW_UP">Follow Up</option>
                      <option value="CONVERTED">Converted</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {new Date(inq.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        if (confirm("Delete this inquiry?")) {
                          deleteMutation.mutate({ id: inq.id });
                        }
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.inquiries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No inquiries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* New Inquiry Form Modal */}
      {showForm && <InquiryForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refetch(); }} />}
    </div>
  );
}

function InquiryForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    studentName: "",
    classAppliedFor: "",
    source: "WALK_IN" as const,
    notes: "",
    followUpDate: "",
  });

  const { data: branches } = api.school.getBranches.useQuery();

  const [branchId, setBranchId] = useState("");

  const createMutation = api.school.createInquiry.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      branchId: branchId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">New Inquiry</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Student Name *</label>
              <input
                required
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Class Applied For *</label>
              <input
                required
                value={form.classAppliedFor}
                onChange={(e) => setForm({ ...form, classAppliedFor: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Parent Name *</label>
              <input
                required
                value={form.parentName}
                onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Phone *</label>
              <input
                required
                value={form.parentPhone}
                onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Email</label>
            <input
              type="email"
              value={form.parentEmail}
              onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
              >
                <option value="WALK_IN">Walk In</option>
                <option value="PHONE">Phone</option>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
              >
                <option value="">-- Select Branch --</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Follow-up Date</label>
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Inquiry"}
          </button>
        </form>
      </div>
    </div>
  );
}
