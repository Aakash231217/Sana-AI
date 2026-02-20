"use client";
import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Search,
  Plus,
  X,
  RefreshCw,
  IndianRupee,
  UserPlus,
  Eye,
  Trash2,
} from "lucide-react";

export function AdmissionsManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<string | null>(null);

  const { data, isLoading, refetch } = api.school.getAdmissions.useQuery({
    page,
    limit: 20,
    status: statusFilter || undefined,
    search: search || undefined,
  });

  const utils = api.useUtils();

  const updateStatusMutation = api.school.updateAdmissionStatus.useMutation({
    onSuccess: () => {
      utils.school.getAdmissions.invalidate();
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
    PENDING: "bg-yellow-500/20 text-yellow-400",
    BOOKED: "bg-blue-500/20 text-blue-400",
    ADMITTED: "bg-green-500/20 text-green-400",
    REJECTED: "bg-red-500/20 text-red-400",
    CANCELLED: "bg-slate-500/20 text-slate-400",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, admission no..."
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
          <option value="PENDING">Pending</option>
          <option value="BOOKED">Booked</option>
          <option value="ADMITTED">Admitted</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Admission
        </button>
      </div>

      {/* Admissions Table */}
      <div className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Student</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Class</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Booking</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Fees Paid</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Pending</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.admissions.map((adm: any) => (
                <tr key={adm.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="text-white font-medium">{adm.studentName}</p>
                    <p className="text-slate-500 text-xs">{adm.parentPhone}</p>
                    {adm.admissionNumber && (
                      <p className="text-slate-500 text-xs">#{adm.admissionNumber}</p>
                    )}
                  </td>
                  <td className="p-4 text-slate-300 text-sm">{adm.classApplied}</td>
                  <td className="p-4">
                    <span className="text-blue-400 text-sm font-medium">
                      ₹{adm.bookingAmount.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-green-400 text-sm font-medium">
                      ₹{adm.feesPaid.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${adm.feesPending > 0 ? "text-red-400" : "text-green-400"}`}>
                      ₹{adm.feesPending.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={adm.admissionStatus}
                      onChange={(e) =>
                        updateStatusMutation.mutate({ id: adm.id, status: e.target.value as any })
                      }
                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer ${statusColors[adm.admissionStatus] || ""}`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="BOOKED">Booked</option>
                      <option value="ADMITTED">Admitted</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedAdmission(adm.id)}
                        className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="View & Add Payment"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data?.admissions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No admissions found
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

      {/* New Admission Form */}
      {showForm && (
        <AdmissionForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}

      {/* Admission Detail with Fee Payments */}
      {selectedAdmission && (
        <AdmissionDetail
          admissionId={selectedAdmission}
          onClose={() => setSelectedAdmission(null)}
        />
      )}
    </div>
  );
}

function AdmissionForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    studentName: "",
    fatherName: "",
    motherName: "",
    dateOfBirth: "",
    gender: "",
    classApplied: "",
    previousSchool: "",
    address: "",
    parentPhone: "",
    parentEmail: "",
    bookingAmount: 0,
    totalFees: 0,
    notes: "",
  });
  const [branchId, setBranchId] = useState("");

  const { data: branches } = api.school.getBranches.useQuery();

  const createMutation = api.school.createAdmission.useMutation({
    onSuccess,
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
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-pink-400" />
            New Student Admission
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
              <label className="block text-slate-400 text-sm mb-1">Class Applied *</label>
              <input required value={form.classApplied} onChange={(e) => setForm({ ...form, classApplied: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Father&apos;s Name</label>
              <input value={form.fatherName} onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Mother&apos;s Name</label>
              <input value={form.motherName} onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Phone *</label>
              <input required value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Email</label>
              <input type="email" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Previous School</label>
            <input value={form.previousSchool} onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>

          {/* Fee Section */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-green-400" />
              Fee Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Total Fees (₹)</label>
                <input type="number" value={form.totalFees} onChange={(e) => setForm({ ...form, totalFees: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Booking Amount (₹)</label>
                <input type="number" value={form.bookingAmount} onChange={(e) => setForm({ ...form, bookingAmount: Number(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
              </div>
            </div>
            {form.totalFees > 0 && (
              <p className="text-slate-400 text-sm mt-2">
                Pending: <span className="text-red-400 font-medium">₹{(form.totalFees - form.bookingAmount).toLocaleString("en-IN")}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full p-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500" />
          </div>

          <button type="submit" disabled={createMutation.isPending}
            className="w-full py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50">
            {createMutation.isPending ? "Creating..." : "Create Admission"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdmissionDetail({ admissionId, onClose }: { admissionId: string; onClose: () => void }) {
  const { data: admissions } = api.school.getAdmissions.useQuery({ page: 1, limit: 100 });
  const admission = admissions?.admissions.find((a: any) => a.id === admissionId);
  const { data: payments, refetch: refetchPayments } = api.school.getFeePayments.useQuery({ admissionId });

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMode: "CASH" as const,
    receiptNumber: "",
    remarks: "",
  });

  const utils = api.useUtils();
  const addPaymentMutation = api.school.addFeePayment.useMutation({
    onSuccess: () => {
      setShowPaymentForm(false);
      setPaymentForm({ amount: 0, paymentMode: "CASH", receiptNumber: "", remarks: "" });
      refetchPayments();
      utils.school.getAdmissions.invalidate();
      utils.school.getDailyActivities.invalidate();
    },
  });

  if (!admission) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">{admission.studentName}</h2>
            <p className="text-slate-400 text-sm">{admission.classApplied} | {admission.parentPhone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Fee Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Total Fees</p>
              <p className="text-xl font-bold text-white">₹{admission.totalFees.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Paid</p>
              <p className="text-xl font-bold text-green-400">₹{admission.feesPaid.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Pending</p>
              <p className={`text-xl font-bold ${admission.feesPending > 0 ? "text-red-400" : "text-green-400"}`}>
                ₹{admission.feesPending.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Payment History</h3>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            </div>

            {showPaymentForm && (
              <div className="bg-slate-800/50 rounded-xl p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Amount (₹) *</label>
                    <input type="number" required value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                      className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Mode</label>
                    <select value={paymentForm.paymentMode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as any })}
                      className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none">
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="ONLINE">Online</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Receipt Number" value={paymentForm.receiptNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                  <input placeholder="Remarks" value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <button
                  onClick={() => addPaymentMutation.mutate({ admissionId, ...paymentForm })}
                  disabled={addPaymentMutation.isPending || paymentForm.amount <= 0}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {addPaymentMutation.isPending ? "Processing..." : "Record Payment"}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {payments && payments.length > 0 ? (
                payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">₹{p.amount.toLocaleString("en-IN")}</p>
                      <p className="text-slate-500 text-xs capitalize">{p.paymentMode.toLowerCase()} {p.receiptNumber ? `• #${p.receiptNumber}` : ""}</p>
                    </div>
                    <span className="text-slate-400 text-xs">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">No payments recorded yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
