"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  FileText,
  Plus,
  X,
  Search,
  CheckCircle,
  XCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export function DocumentMaster() {
  const [activeSubTab, setActiveSubTab] = useState<"types" | "documents">("documents");

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab("documents")}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            activeSubTab === "documents"
              ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Student Documents
        </button>
        <button
          onClick={() => setActiveSubTab("types")}
          className={`px-4 py-2 rounded-lg text-sm transition-all ${
            activeSubTab === "types"
              ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Document Types
        </button>
      </div>

      {activeSubTab === "types" && <DocumentTypes />}
      {activeSubTab === "documents" && <StudentDocuments />}
    </div>
  );
}

function DocumentTypes() {
  const { data: types, isLoading, refetch } = api.school.getDocumentTypes.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", isRequired: false });

  const createMutation = api.school.createDocumentType.useMutation({
    onSuccess: () => { setShowForm(false); setForm({ name: "", description: "", isRequired: false }); refetch(); },
  });

  const deleteMutation = api.school.deleteDocumentType.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-pink-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Document Types</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Type
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Document Type Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                className="rounded"
              />
              Required Document
            </label>
            <button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types?.map((type: any) => (
          <div key={type.id} className="bg-slate-900 rounded-xl border border-white/10 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{type.name}</p>
                  {type.description && <p className="text-slate-500 text-xs">{type.description}</p>}
                </div>
              </div>
              <button
                onClick={() => { if (confirm("Delete this document type?")) deleteMutation.mutate({ id: type.id }); }}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <span className="text-slate-500 text-xs">{type._count.documents} documents</span>
              {type.isRequired && (
                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>
              )}
            </div>
          </div>
        ))}
        {types?.length === 0 && (
          <div className="col-span-3 text-center py-8 text-slate-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No document types yet. Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDocuments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = api.school.getStudentDocuments.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    documentTypeId: typeFilter || undefined,
  });

  const { data: docTypes } = api.school.getDocumentTypes.useQuery();

  const verifyMutation = api.school.verifyDocument.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = api.school.deleteStudentDocument.useMutation({
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 text-pink-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name or admission no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none"
        >
          <option value="">All Types</option>
          {docTypes?.map((t: any) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Student</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Document Type</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">File</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Branch</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Verified</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Date</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.documents.map((doc: any) => (
                <tr key={doc.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="text-white font-medium text-sm">{doc.studentName}</p>
                    {doc.admissionNumber && (
                      <p className="text-slate-500 text-xs">#{doc.admissionNumber}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-xs px-2 py-1 bg-violet-500/20 text-violet-400 rounded">
                      {doc.documentType.name}
                    </span>
                  </td>
                  <td className="p-4">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {doc.fileName}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {doc.branch?.name || "—"}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => verifyMutation.mutate({ id: doc.id, isVerified: !doc.isVerified })}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        doc.isVerified
                          ? "bg-green-500/20 text-green-400"
                          : "bg-slate-700 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400"
                      }`}
                    >
                      {doc.isVerified ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {doc.isVerified ? "Verified" : "Unverified"}
                    </button>
                  </td>
                  <td className="p-4 text-slate-400 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => { if (confirm("Delete this document?")) deleteMutation.mutate({ id: doc.id }); }}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.documents.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No documents found
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
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50">Previous</button>
          <span className="px-4 py-2 text-slate-400">Page {page} of {data.pages}</span>
          <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
            className="px-4 py-2 bg-slate-800 rounded-lg text-white disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Upload Document Form */}
      {showForm && (
        <UploadDocumentForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}

function UploadDocumentForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    studentName: "",
    admissionNumber: "",
    documentTypeId: "",
    fileName: "",
    fileUrl: "",
    remarks: "",
  });
  const [branchId, setBranchId] = useState("");

  const { data: docTypes } = api.school.getDocumentTypes.useQuery();
  const { data: branches } = api.school.getBranches.useQuery();

  const createMutation = api.school.createStudentDocument.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      branchId: branchId || undefined,
      admissionNumber: form.admissionNumber || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-lg w-full">
        <div className="border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-pink-400" />
            Upload Document
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Student Name *</label>
              <input required value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Admission Number</label>
              <input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Document Type *</label>
            <select required value={form.documentTypeId} onChange={(e) => setForm({ ...form, documentTypeId: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
              <option value="">Select Type</option>
              {docTypes?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">File Name *</label>
              <input required value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })}
                placeholder="e.g. birth_certificate.pdf"
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
                <option value="">-- Select --</option>
                {branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">File URL *</label>
            <input required value={form.fileUrl} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              placeholder="https://..."
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Remarks</label>
            <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <button type="submit" disabled={createMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {createMutation.isPending ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
}
