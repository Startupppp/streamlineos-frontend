"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Search,
  UserCircle,
  DollarSign,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/lib/hooks/trpc-hooks";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn, resolveImageUrl } from "@/lib/utils";
import { formatCurrency as formatCurrencyCompact } from "@/lib/format-utils";

const formatCurrency = (v: string | number | null | undefined) => formatCurrencyCompact(Number(v ?? 0));

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | undefined>(undefined);
  const { data: clients = [], isLoading } = useClients({ status: statusFilter, search });

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === "active").length;
    const totalValue = clients.reduce((s, c) => s + Number(c.investmentValue ?? 0), 0);
    return { total, active, inactive: total - active, totalValue };
  }, [clients]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Client Database"
          description="Converted leads organized as client profiles"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Clients", value: stats.total, color: "text-blue-500" },
          { label: "Active", value: stats.active, color: "text-emerald-500" },
          { label: "Inactive", value: stats.inactive, color: "text-red-400" },
          { label: "Portfolio Value", value: formatCurrency(stats.totalValue), color: "text-amber-500" },
        ].map(m => (
          <Card key={m.label} className="shadow-noir">
            <CardContent className="pt-6 text-center">
              <p className={cn("text-3xl font-bold", m.color)}>{m.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <CardTitle className="text-base">All Clients</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant={statusFilter === undefined ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter(undefined)}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No clients found. Convert leads to see them here.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => (
                  <motion.div
                    key={client.id}
                    variants={fadeUp}
                    className="rounded-xl border border-border p-4 hover:border-gold/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground truncate">{client.name}</h3>
                          <Badge variant={client.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                            {client.status}
                          </Badge>
                        </div>
                        {client.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {client.company}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      {client.email && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {client.email}
                        </p>
                      )}
                      {client.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" /> {client.phone}
                        </p>
                      )}
                      {client.city && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" /> {client.city}
                        </p>
                      )}
                      {client.investmentValue && (
                        <p className="flex items-center gap-1.5 text-gold font-medium">
                          <DollarSign className="h-3 w-3 shrink-0" /> {formatCurrency(client.investmentValue)}
                        </p>
                      )}
                    </div>

                    {client.accountManager && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={resolveImageUrl(client.accountManager.image)} />
                          <AvatarFallback className="text-[8px]">
                            {client.accountManager.name?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{client.accountManager.name}</span>
                      </div>
                    )}

                    {client.lead?.priority && (
                      <div className="mt-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            client.lead.priority === "HOT" && "border-red-500/50 text-red-500",
                            client.lead.priority === "WARM" && "border-amber-500/50 text-amber-500",
                            client.lead.priority === "COLD" && "border-blue-400/50 text-blue-400",
                          )}
                        >
                          {client.lead.priority}
                        </Badge>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
