"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { cn, resolveImageUrl } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import { api } from "@/trpc/react";

interface Employee {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  designation: string | null;
  departmentId: number | null;
  reportingTo: string | null;
}

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

function buildTree(employees: Employee[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] });
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.reportingTo && map.has(emp.reportingTo)) {
      map.get(emp.reportingTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort: CEO first, then by role, then by name
  const rolePriority: Record<string, number> = { CEO: 0, ADMIN: 1, HR: 2 };
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const pa = rolePriority[a.employee.role] ?? 99;
      const pb = rolePriority[b.employee.role] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.employee.name || "").localeCompare(b.employee.name || "");
    });
    nodes.forEach(n => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

const ROLE_COLORS: Record<string, string> = {
  CEO: "bg-[#bd882c]/10 text-[#bd882c] border-[#bd882c]/30",
  ADMIN: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  HR: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  MEMBER: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

function OrgNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const emp = node.employee;
  const roleColor = ROLE_COLORS[emp.role] || ROLE_COLORS.MEMBER;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: depth * 0.05 }}
      >
        <Card className={cn(
          "w-48 shadow-sm hover:shadow-md transition-shadow",
          depth === 0 && "ring-2 ring-[#bd882c]/30"
        )}>
          <CardContent className="p-3 flex flex-col items-center text-center">
            <Avatar className="h-12 w-12 mb-2">
              <AvatarImage src={resolveImageUrl(emp.image)} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {emp.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold line-clamp-1">{emp.name || "Unknown"}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {emp.designation || emp.role}
            </p>
            <Badge variant="outline" className={cn("text-[10px] mt-1.5 border", roleColor)}>
              {emp.role}
            </Badge>
          </CardContent>
        </Card>
      </motion.div>

      {node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-border" />
          <div className="relative flex gap-6">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "50%",
                  right: "50%",
                  transform: `translateX(-${(node.children.length - 1) * 50}%)`,
                  width: `${(node.children.length - 1) * 100}%`,
                  marginLeft: `-${(node.children.length - 1) * 50}%`,
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.employee.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <OrgNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: employees, isLoading } = api.hr.getEmployees.useQuery();
  const { data: departments } = api.hr.getDepartments.useQuery();

  const tree = useMemo(() => {
    if (!employees) return [];
    return buildTree(employees as Employee[]);
  }, [employees]);

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    departments?.forEach(d => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const deptGroups = useMemo(() => {
    if (!employees) return [];
    const groups = new Map<string, Employee[]>();
    for (const emp of employees as Employee[]) {
      const deptName = emp.departmentId ? (deptMap.get(emp.departmentId) || "Other") : "Unassigned";
      if (!groups.has(deptName)) groups.set(deptName, []);
      groups.get(deptName)!.push(emp);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [employees, deptMap]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex justify-center">
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Organization Chart"
          description={`${employees?.length || 0} team members across ${deptGroups.length} departments`}
        />
      </motion.div>

      {tree.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardContent className="p-6 overflow-x-auto">
              <div className="flex justify-center min-w-max py-4">
                <div className="flex flex-col items-center gap-0">
                  {tree.map((root) => (
                    <OrgNode key={root.employee.id} node={root} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#bd882c]" />
          By Department
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deptGroups.map(([deptName, members]) => (
            <Card key={deptName} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">{deptName}</h4>
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {members.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {members.slice(0, 8).map(emp => (
                    <div key={emp.id} className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={resolveImageUrl(emp.image)} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {emp.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-1">{emp.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {emp.designation || emp.role}
                        </p>
                      </div>
                    </div>
                  ))}
                  {members.length > 8 && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      +{members.length - 8} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
