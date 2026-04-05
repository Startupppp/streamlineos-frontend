"use client";

import { motion, type Variants } from "framer-motion";
import {
  Users,
  TrendingUp,
  LayoutGrid,
  Target,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";

const stagger: Variants = {
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
};

const floatUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const floatCard: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

function StatBadge({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: "gold" | "blue" | "green" | "purple";
}) {
  const colorMap = {
    gold: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
    blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${colorMap[color]} border px-4 py-3`}
    >
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-white/50 mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  tags,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  tags: { label: string; active?: boolean }[];
}) {
  return (
    <motion.div
      variants={floatCard}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.04] backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Icon className="h-4.5 w-4.5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/90">{title}</p>
          <p className="text-[11px] text-white/40 mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t.label}
            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
              t.active
                ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                : "bg-white/[0.04] border-white/10 text-white/40"
            }`}
          >
            {t.label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function AuthRightPanel() {
  return (
    <div className="relative h-full overflow-hidden bg-[#080a14] flex flex-col justify-between p-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-amber-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-5%] h-[300px] w-[300px] rounded-full bg-blue-600/[0.06] blur-[80px]" />
        <div className="absolute top-[40%] left-[40%] h-[200px] w-[200px] rounded-full bg-amber-400/[0.04] blur-[60px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,162,58,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,58,0.8) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div
        className="relative z-10 space-y-6"
        variants={stagger}
        initial="hidden"
        animate="animate"
      >
        <motion.div variants={floatUp} className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-medium text-amber-400 tracking-wide uppercase">
              All-in-one Platform
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
            Run your entire
            <br />
            business from{" "}
            <span
              className="bg-gradient-to-r from-amber-400 to-amber-600"
              style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            >
              one place
            </span>
          </h2>
          <p className="text-sm text-white/40 leading-relaxed max-w-xs">
            HR, projects, CRM, and sales — unified for modern teams that move fast.
          </p>
        </motion.div>

        <motion.div variants={floatUp} className="grid grid-cols-2 gap-2.5">
          <StatBadge value="360°" label="Employee view" color="gold" />
          <StatBadge value="∞" label="Project cycles" color="blue" />
          <StatBadge value="Real-time" label="Collaboration" color="green" />
          <StatBadge value="AI-ready" label="Insights" color="purple" />
        </motion.div>

        <motion.div variants={stagger} className="space-y-2.5">
          <FeatureCard
            icon={Users}
            title="HR Management"
            desc="Payroll, attendance, leaves, recruitment — all automated."
            tags={[
              { label: "Payroll", active: true },
              { label: "Attendance" },
              { label: "Leaves" },
              { label: "Recruitment" },
            ]}
          />
          <FeatureCard
            icon={LayoutGrid}
            title="Project Tracking"
            desc="Sprints, kanban, backlog & epics in one unified workspace."
            tags={[
              { label: "Kanban", active: true },
              { label: "Sprints" },
              { label: "Analytics" },
            ]}
          />
          <FeatureCard
            icon={TrendingUp}
            title="CRM & Sales"
            desc="Lead pipeline, deals, targets & sales forecasting."
            tags={[
              { label: "Leads", active: true },
              { label: "Deals" },
              { label: "Targets" },
            ]}
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="animate"
        className="relative z-10 mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 space-y-3"
      >
        <motion.p variants={floatUp} className="text-[11px] text-white/30 uppercase tracking-wider font-medium">
          Live activity
        </motion.p>
        <motion.div variants={stagger} className="space-y-2">
          {[
            { icon: CheckCircle2, text: "Sprint #12 marked complete", time: "2m ago", color: "text-emerald-400" },
            { icon: Zap, text: "3 leads moved to Qualified", time: "5m ago", color: "text-amber-400" },
            { icon: Clock, text: "Payroll run scheduled", time: "12m ago", color: "text-blue-400" },
            { icon: BarChart3, text: "Sales report generated", time: "1h ago", color: "text-purple-400" },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={floatCard}
              className="flex items-center gap-2.5"
            >
              <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.color}`} />
              <span className="text-[12px] text-white/60 flex-1 truncate">{item.text}</span>
              <span className="text-[10px] text-white/25 shrink-0">{item.time}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
