"use client";
import { api } from "@/trpc/react";
import {
  MessageSquare,
  UserPlus,
  IndianRupee,
  Calendar,
  TrendingUp,
  Building2,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export function DailyActivities() {
  const { data, isLoading, refetch } = api.school.getDailyActivities.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ActivityCard
          title="Today's Inquiries"
          value={data?.todayInquiries || 0}
          subtitle={`${data?.totalInquiries || 0} total`}
          icon={MessageSquare}
          color="bg-blue-500"
        />
        <ActivityCard
          title="New Inquiries"
          value={data?.newInquiries || 0}
          subtitle="Pending follow-up"
          icon={AlertCircle}
          color="bg-orange-500"
          alert={(data?.newInquiries || 0) > 0}
        />
        <ActivityCard
          title="Pending Admissions"
          value={data?.pendingAdmissions || 0}
          subtitle={`${data?.bookedAdmissions || 0} booked`}
          icon={UserPlus}
          color="bg-green-500"
        />
        <ActivityCard
          title="Active Branches"
          value={data?.totalBranches || 0}
          subtitle="Sub-branches"
          icon={Building2}
          color="bg-violet-500"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Booking Amount</p>
              <p className="text-2xl font-bold text-white">
                ₹{(data?.totalBookingAmount || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Fees Collected</p>
              <p className="text-2xl font-bold text-white">
                ₹{(data?.totalFeesPaid || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Fees Pending</p>
              <p className="text-2xl font-bold text-red-400">
                ₹{(data?.totalFeesPending || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Collection + Upcoming Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Payments */}
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Today&apos;s Collection
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Transactions</p>
              <p className="text-2xl font-bold text-white">{data?.todayPayments?.count || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm">Amount</p>
              <p className="text-2xl font-bold text-green-400">
                ₹{(data?.todayPayments?.amount || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-400" />
            Upcoming Holidays
          </h3>
          {data?.upcomingHolidays && data.upcomingHolidays.length > 0 ? (
            <div className="space-y-2">
              {data.upcomingHolidays.map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3"
                >
                  <span className="text-white text-sm">{event.title}</span>
                  <span className="text-slate-400 text-xs">
                    {new Date(event.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No upcoming holidays</p>
          )}
        </div>
      </div>

      {/* Inquiry Sources + Admission Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.inquiryBySource && data.inquiryBySource.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Inquiry Sources
            </h3>
            <div className="space-y-3">
              {data.inquiryBySource.map((item: any) => (
                <div key={item.source} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm capitalize">
                    {item.source.replace("_", " ").toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (item._count / (data.totalInquiries || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-white text-sm font-medium w-8 text-right">
                      {item._count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.admissionByStatus && data.admissionByStatus.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" />
              Admissions by Status
            </h3>
            <div className="space-y-3">
              {data.admissionByStatus.map((item: any) => {
                const colors: Record<string, string> = {
                  PENDING: "text-yellow-400",
                  BOOKED: "text-blue-400",
                  ADMITTED: "text-green-400",
                  REJECTED: "text-red-400",
                  CANCELLED: "text-slate-400",
                };
                return (
                  <div key={item.admissionStatus} className="flex items-center justify-between">
                    <span className={`text-sm capitalize ${colors[item.admissionStatus] || "text-slate-300"}`}>
                      {item.admissionStatus.toLowerCase()}
                    </span>
                    <span className="text-white text-sm font-medium">{item._count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inquiry Trend */}
      {data?.inquiryTrend && (
        <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Inquiry Trend (Last 7 Days)</h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(data.inquiryTrend)
              .reverse()
              .map(([date, count]) => {
                const maxCount = Math.max(...Object.values(data.inquiryTrend as Record<string, number>), 1);
                const height = ((count as number) / maxCount) * 100;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-white text-xs font-medium">{count as number}</span>
                    <div
                      className="w-full bg-gradient-to-t from-pink-600 to-violet-600 rounded-t-lg min-h-[4px]"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-slate-500 text-[10px]">
                      {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  );
}

function ActivityCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  alert,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: any;
  color: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-slate-900 rounded-2xl border p-6 ${alert ? "border-orange-500/50" : "border-white/10"}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
