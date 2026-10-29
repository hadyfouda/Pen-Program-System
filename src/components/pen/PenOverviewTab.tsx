import React from "react";
import {
  Package,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  Building2,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";

interface OverviewStats {
  totalAllocated: number;
  totalDispensed: number;
  remainingStock: number;
  patientsServed: number;
  chartData: { date: string; pens: number }[];
  topAccounts: { name: string; type: string; pens: number }[];
}

interface PenOverviewTabProps {
  stats: OverviewStats;
}

export function PenOverviewTab({ stats }: PenOverviewTabProps) {
  const cards = [
    {
      label: "Total Allocated Pens",
      value: stats.totalAllocated,
      subtext: "Delivered to clinics & pharmacies",
      icon: Package,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    {
      label: "Pens Dispensed to Patients",
      value: stats.totalDispensed,
      subtext: "With verified prescriptions & IDs",
      icon: CheckCircle2,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    {
      label: "Remaining Stock at Facilities",
      value: stats.remainingStock,
      subtext: "Available for immediate dispensing",
      icon: AlertCircle,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    {
      label: "Unique Patients Served",
      value: stats.patientsServed,
      subtext: "Verified by National ID & Phone",
      icon: Users,
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    },
  ];

  const hasActivity = stats.totalDispensed > 0;

  return (
    <div className="space-y-4 sm:space-y-6" dir="ltr">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-2xl p-4 border bg-card/60 backdrop-blur-xs flex flex-col justify-between ${c.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground block line-clamp-1">
                {c.label}
              </span>
              <c.icon className="size-4 shrink-0 opacity-80" />
            </div>

            <div className="text-2xl sm:text-3xl font-black text-foreground mt-2 font-mono">
              {c.value.toLocaleString("en-US")}
            </div>

            <span className="text-[10px] text-muted-foreground mt-1 block">
              {c.subtext}
            </span>
          </div>
        ))}
      </div>

      {/* Chart & Top Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Daily Dispensing Trend
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Last 14 Days</span>
          </div>

          <div className="h-56 sm:h-64 w-full pt-2">
            {hasActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.05)" }}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      direction: "ltr",
                    }}
                  />
                  <Bar
                    dataKey="pens"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    name="Dispensed Pens"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-1">
                <BarChart3 className="size-8 opacity-40" />
                <span className="text-xs font-semibold text-foreground">No dispensing records yet for chart</span>
                <span className="text-[10px] text-muted-foreground">
                  Daily trends will appear automatically as pens are dispensed.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top Accounts Ranking (1 Col) */}
        <div className="rounded-2xl border bg-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-500" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Top Dispensing Facilities
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Most Active</span>
          </div>

          {stats.topAccounts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs space-y-1">
              <Building2 className="size-8 mx-auto opacity-40" />
              <span className="block font-semibold">No active facilities yet</span>
              <span className="text-[10px]">Rankings will display once dispensing starts.</span>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {stats.topAccounts.map((acc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-foreground truncate">{acc.name}</span>
                  </div>

                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold shrink-0">
                    {acc.pens} pens
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
