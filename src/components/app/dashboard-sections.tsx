import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ChartPanel } from "@/components/app/chart-panel";
import { ApplicationPipelineChart, CandidateSourcesChart } from "@/components/app/dashboard-charts";
import { MonthlySlaChart, SlaSummaryChart } from "@/components/app/sla-charts";
import { SlaTable } from "@/components/app/sla-table";
import {
  getActiveTitleCount,
  getCandidateCount,
  getCandidateSourceData,
  getFulfilledTitleCount,
  getFulfillmentRate,
  getHoldTitleCount,
  getPipelineData,
  getSlaMonthlyData,
  getSlaSnapshot,
} from "@/lib/dashboard-data";
import { requireUser } from "@/lib/authz";

export async function DashboardGreeting() {
  const [user, fulfillmentRate] = await Promise.all([requireUser(), getFulfillmentRate()]);
  return (
    <section className="flex min-h-35 flex-wrap items-center justify-between gap-6 overflow-hidden rounded-[22px] bg-[#2b3b6b] px-6 py-6 text-white shadow-[0_12px_30px_rgba(35,49,82,0.14)] sm:flex-nowrap sm:px-10">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-white/90">RECRUITMENT OVERVIEW</p>
        <h1 className="mt-1 text-2xl font-bold leading-none tracking-tight sm:text-3xl">
          Hi, {user.name || user.email}
        </h1>
        <p className="mt-2 text-base text-white/85">Keep your hiring pipeline moving.</p>
      </div>
      <Link
        href="/job-titles"
        className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 transition-colors hover:bg-white/15"
      >
        <span className="block text-xs font-medium text-white/75">Fulfillment rate</span>
        <span className="mt-1 block text-2xl font-bold leading-none">{fulfillmentRate}%</span>
      </Link>
    </section>
  );
}

type StatKind = "active" | "hold" | "fulfilled" | "candidates";

export async function DashboardStatCard({ kind }: { kind: StatKind }) {
  const value =
    kind === "active"
      ? await getActiveTitleCount()
      : kind === "hold"
        ? await getHoldTitleCount()
        : kind === "fulfilled"
          ? await getFulfilledTitleCount()
          : await getCandidateCount();
  const values = {
    active: {
      label: "Active job titles",
      className: "bg-[#273762] text-white",
      labelClass: "text-white",
    },
    hold: {
      label: "Job titles on hold",
      className: "bg-[#effaf7] text-[#15233f]",
      labelClass: "text-[#398f8a]",
    },
    fulfilled: {
      label: "Fulfilled job titles",
      className: "bg-[#fff8eb] text-[#15233f]",
      labelClass: "text-[#bd6d1e]",
    },
    candidates: {
      label: "Candidates",
      className: "bg-[#eef8ff] text-[#15233f]",
      labelClass: "text-[#2e73b6]",
    },
  }[kind];

  return (
    <Card
      className={`min-h-30 rounded-[22px] border-0 px-6 py-5 shadow-[0_12px_30px_rgba(35,49,82,0.08)] ${values.className}`}
    >
      <p className={`text-base font-semibold ${values.labelClass}`}>{values.label}</p>
      <p className="text-[40px] font-bold leading-none tracking-tight">{value}</p>
    </Card>
  );
}

type MetricKind = "total" | "fulfilled" | "compliance" | "withdrawals";

export async function SlaMetricCard({ month, kind }: { month: string; kind: MetricKind }) {
  const { summary } = await getSlaSnapshot(month);
  const metric = {
    total: {
      label: "Total Headcount",
      value: summary.totalHeadcount,
      helper: "Total HC requirement",
    },
    fulfilled: {
      label: "HC Fulfilled",
      value: summary.fulfilledHeadcount,
      helper: "Active hires at cutoff",
    },
    compliance: {
      label: "SLA Compliance",
      value: summary.compliance == null ? "—" : `${summary.compliance}%`,
      helper: "Within SLA / total hires",
    },
    withdrawals: {
      label: "Pre-Joining Withdrawal",
      value: summary.preJoiningWithdrawals,
      helper: "Historical outcome",
    },
  }[kind];
  return (
    <Card className="rounded-[18px] border-0 px-6 py-5 shadow-[0_8px_24px_rgba(35,49,82,0.06)]">
      <p className="font-semibold text-slate-600">{metric.label}</p>
      <p className="mt-2 text-[32px] font-bold leading-none">{metric.value}</p>
      <p className="mt-2 text-xs text-slate-400">{metric.helper}</p>
    </Card>
  );
}

export async function MonthlySlaPanel() {
  const months = await getSlaMonthlyData();
  return <MonthlySlaChart months={months} />;
}

export async function SlaSummaryPanel({ month }: { month: string }) {
  const { summary } = await getSlaSnapshot(month);
  return <SlaSummaryChart month={month} summary={summary} />;
}

export async function SlaTablePanel({ month }: { month: string }) {
  const { rows } = await getSlaSnapshot(month);
  return <SlaTable rows={rows} />;
}

export async function CandidateSourcesPanel() {
  const data = await getCandidateSourceData();
  return (
    <ChartPanel
      title="Candidate sources"
      description="Where the candidate pool is coming from."
      emptyMessage="No candidate data yet."
      isEmpty={data.length === 0}
    >
      <CandidateSourcesChart data={data} />
    </ChartPanel>
  );
}

export async function ApplicationPipelinePanel() {
  const data = await getPipelineData();
  return (
    <ChartPanel
      title="Application pipeline"
      description="Active applications grouped by their current status."
      emptyMessage="No application data yet."
      isEmpty={data.length === 0}
    >
      <ApplicationPipelineChart data={data} />
    </ChartPanel>
  );
}
