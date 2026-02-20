"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Building2,
  Plus,
  X,
  MapPin,
  Phone,
  Mail,
  User,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

export function BranchManagement() {
  const { data: branches, isLoading, refetch } = api.school.getBranches.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const deleteMutation = api.school.deleteBranch.useMutation({
    onSuccess: () => refetch(),
  });

  const updateMutation = api.school.updateBranch.useMutation({
    onSuccess: () => { setEditingBranch(null); refetch(); },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">School Branches</h3>
          <p className="text-slate-400 text-sm">Manage main school and sub-branches</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches?.map((branch: any) => (
          <div
            key={branch.id}
            className={`bg-slate-900 rounded-2xl border p-6 ${
              branch.isMain ? "border-pink-500/30 ring-1 ring-pink-500/20" : "border-white/10"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  branch.isMain ? "bg-gradient-to-r from-pink-600 to-violet-600" : "bg-slate-700"
                }`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-bold">{branch.name}</h4>
                    {branch.isMain && (
                      <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full">Main</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">Code: {branch.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateMutation.mutate({ id: branch.id, isActive: !branch.isActive })}
                  className={`p-1.5 rounded-lg ${
                    branch.isActive ? "text-green-400 hover:bg-green-500/20" : "text-red-400 hover:bg-red-500/20"
                  }`}
                  title={branch.isActive ? "Active" : "Inactive"}
                >
                  {branch.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditingBranch(branch)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {!branch.isMain && (
                  <button
                    onClick={() => { if (confirm("Delete this branch?")) deleteMutation.mutate({ id: branch.id }); }}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Branch Details */}
            <div className="space-y-2 text-sm">
              {branch.address && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{branch.address}{branch.city ? `, ${branch.city}` : ""}{branch.state ? `, ${branch.state}` : ""}</span>
                </div>
              )}
              {branch.phone && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{branch.phone}</span>
                </div>
              )}
              {branch.email && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{branch.email}</span>
                </div>
              )}
              {branch.principalName && (
                <div className="flex items-center gap-2 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Principal: {branch.principalName}</span>
                </div>
              )}
            </div>

            {/* Branch Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
              <div className="text-center">
                <p className="text-white font-bold">{branch._count.inquiries}</p>
                <p className="text-slate-500 text-xs">Inquiries</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{branch._count.admissions}</p>
                <p className="text-slate-500 text-xs">Admissions</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold">{branch._count.studentDocuments}</p>
                <p className="text-slate-500 text-xs">Documents</p>
              </div>
            </div>
          </div>
        ))}

        {branches?.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No branches yet. Add your main school branch to get started.</p>
          </div>
        )}
      </div>

      {/* Add Branch Form */}
      {showForm && (
        <BranchForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}

      {/* Edit Branch Form */}
      {editingBranch && (
        <EditBranchForm
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
          onSuccess={() => { setEditingBranch(null); refetch(); }}
        />
      )}
    </div>
  );
}

function BranchForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    principalName: "",
    isMain: false,
  });

  const createMutation = api.school.createBranch.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-pink-400" />
            Add New Branch
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Branch Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Branch Code *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MAIN, BR01"
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Principal Name</label>
            <input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isMain} onChange={(e) => setForm({ ...form, isMain: e.target.checked })} className="rounded" />
            This is the main school branch
          </label>
          <button type="submit" disabled={createMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {createMutation.isPending ? "Creating..." : "Create Branch"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditBranchForm({ branch, onClose, onSuccess }: { branch: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address || "",
    city: branch.city || "",
    state: branch.state || "",
    phone: branch.phone || "",
    email: branch.email || "",
    principalName: branch.principalName || "",
  });

  const updateMutation = api.school.updateBranch.useMutation({
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ id: branch.id, ...form });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Edit Branch: {branch.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Branch Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Principal Name</label>
            <input value={form.principalName} onChange={(e) => setForm({ ...form, principalName: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <button type="submit" disabled={updateMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {updateMutation.isPending ? "Updating..." : "Update Branch"}
          </button>
        </form>
      </div>
    </div>
  );
}
