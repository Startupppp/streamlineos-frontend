"use client";

import { MemberPicker } from "@/components/members/member-picker";

interface ProjectMemberSelectSingleProps {
  projectId: number;
  mode: "single";
  value?: string;
  onChange?: (userId: string | null) => void;
  values?: never;
  onToggle?: never;
  allowUnassigned?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

interface ProjectMemberSelectMultiProps {
  projectId: number;
  mode: "multi";
  value?: never;
  onChange?: never;
  values?: string[];
  onToggle?: (userId: string) => void;
  allowUnassigned?: never;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type ProjectMemberSelectProps = ProjectMemberSelectSingleProps | ProjectMemberSelectMultiProps;

export function ProjectMemberSelect(props: ProjectMemberSelectProps) {
  const { projectId, mode, placeholder, disabled, className } = props;

  if (mode === "multi") {
    const { values, onToggle } = props;
    return (
      <MemberPicker
        mode="multi"
        projectId={projectId}
        values={values}
        onToggle={onToggle}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    );
  }

  const { value, onChange, allowUnassigned } = props;
  return (
    <MemberPicker
      projectId={projectId}
      value={value}
      onChange={onChange}
      allowUnassigned={allowUnassigned}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
