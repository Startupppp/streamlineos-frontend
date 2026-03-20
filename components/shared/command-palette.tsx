"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutGrid,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  Search,
  Clock,
  Building2,
  Target,
  MessageSquare,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  projects?: { id: number; name: string }[];
}

export function CommandPalette({ projects = [] }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/projects")}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm")}>
            <Target className="mr-2 h-4 w-4" />
            CRM
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm/contacts")}>
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm/organizations")}>
            <Building2 className="mr-2 h-4 w-4" />
            Organizations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm/analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            CRM Analytics
          </CommandItem>
          <CommandItem onSelect={() => navigate("/timesheets")}>
            <Clock className="mr-2 h-4 w-4" />
            Timesheets
          </CommandItem>
          <CommandItem onSelect={() => navigate("/chat")}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.slice(0, 10).map((project) => (
                <CommandItem key={project.id} onSelect={() => navigate(`/projects/${project.id}`)}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => navigate("/projects?action=create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm/leads?action=create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Lead
          </CommandItem>
          <CommandItem onSelect={() => navigate("/crm/contacts?action=create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Contact
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Toggle {theme === "dark" ? "Light" : "Dark"} Mode
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
