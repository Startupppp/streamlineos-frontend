"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { X, Plus, Linkedin, Twitter, Github, Globe, User } from "lucide-react";
import { useUpdateProfile } from "@/hooks/api/hr";
import { resolveImageUrl } from "@/lib/utils";

const schema = z
  .object({
    image: z.string().url().optional().or(z.literal("")),
    bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
    linkedinUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    twitterUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    githubUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    websiteUrl: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    newSkill: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const social = [
      { field: "linkedinUrl" as const, label: "LinkedIn" },
      { field: "twitterUrl" as const, label: "Twitter" },
      { field: "githubUrl" as const, label: "GitHub" },
      { field: "websiteUrl" as const, label: "Website" },
    ];
    const seen = new Map<string, string>();
    for (const { field, label } of social) {
      const url = data[field]?.trim();
      if (!url) continue;
      const normalized = url.toLowerCase();
      if (seen.has(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `This URL is already used for ${seen.get(normalized)}`,
          path: [field],
        });
      } else {
        seen.set(normalized, label);
      }
    }
  });

type FormValues = z.infer<typeof schema>;

interface EmployeeWithSkills {
  id: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  skills?: { name: string; level: number }[] | null;
}

interface SelfEditProfileFormProps {
  employee: EmployeeWithSkills;
  onSaved?: () => void;
}

export function SelfEditProfileForm({
  employee,
  onSaved,
}: SelfEditProfileFormProps) {
  const updateProfile = useUpdateProfile();
  const initialSkillNames = (employee.skills ?? []).map((s) => s.name);
  const [skills, setSkills] = useState<string[]>(initialSkillNames);
  const [skillError, setSkillError] = useState<string | null>(null);

  const fullName =
    `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "?";
  const initials =
    fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      image: employee.image ?? "",
      bio: employee.bio ?? "",
      linkedinUrl: employee.linkedinUrl ?? "",
      twitterUrl: employee.twitterUrl ?? "",
      githubUrl: employee.githubUrl ?? "",
      websiteUrl: employee.websiteUrl ?? "",
      newSkill: "",
    },
  });

  const imageValue = watch("image");
  const newSkill = watch("newSkill");

  function addSkill() {
    const trimmed = (newSkill ?? "").trim();
    if (!trimmed) {
      setSkillError(null);
      return;
    }
    if (!/[a-zA-Z]/.test(trimmed)) {
      setSkillError("Skill must contain at least one letter");
      return;
    }
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillError("This skill already exists");
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setValue("newSkill", "");
    setSkillError(null);
  }

  function removeSkill(skill: string) {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }

  const newSkillRegistration = register("newSkill");

  function handleSkillInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    newSkillRegistration.onChange(e);
    if (skillError) setSkillError(null);
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  }

  const onSubmit = (values: FormValues) => {
    updateProfile.mutate(
      {
        userId: employee.id,
        image: values.image || undefined,
        bio: values.bio,
        linkedinUrl: values.linkedinUrl,
        twitterUrl: values.twitterUrl,
        githubUrl: values.githubUrl,
        websiteUrl: values.websiteUrl,
        skills,
      },
      {
        onSuccess: () => {
          toast.success("Profile updated successfully");
          onSaved?.();
        },
        onError: () => toast.error("Failed to update profile"),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 shrink-0">
              <AvatarImage src={resolveImageUrl(imageValue ?? null)} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="image"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <User className="h-3.5 w-3.5" />
                Profile Photo URL
              </Label>
              <Input
                id="image"
                {...register("image")}
                placeholder="https://…"
                className="text-sm"
              />
              {errors.image && (
                <p className="text-xs text-destructive">
                  {errors.image.message}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Paste a direct image URL (jpg/png). Use your company photo or a
                professional headshot.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <Label
            htmlFor="bio"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Bio
          </Label>
          <Textarea
            id="bio"
            {...register("bio")}
            placeholder="Tell your colleagues a bit about yourself…"
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex justify-between">
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            )}
            <p className="text-[11px] text-muted-foreground ml-auto">
              {(watch("bio") ?? "").length}/500
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Skills
          </Label>
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {skills.map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-xs gap-1 pr-1"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-0.5 hover:text-destructive"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No skills added yet.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                {...newSkillRegistration}
                placeholder="Add a skill…"
                className="text-sm flex-1"
                onChange={handleSkillInputChange}
                onKeyDown={handleSkillKeyDown}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={addSkill}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {skillError && (
              <p className="text-xs text-destructive">{skillError}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Social Links
          </Label>
          <div className="space-y-2">
            <SocialField
              id="linkedinUrl"
              icon={<Linkedin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              placeholder="https://linkedin.com/in/yourhandle"
              error={errors.linkedinUrl?.message}
              {...register("linkedinUrl")}
            />
            <SocialField
              id="twitterUrl"
              icon={<Twitter className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />}
              placeholder="https://twitter.com/yourhandle"
              error={errors.twitterUrl?.message}
              {...register("twitterUrl")}
            />
            <SocialField
              id="githubUrl"
              icon={<Github className="h-3.5 w-3.5" />}
              placeholder="https://github.com/yourhandle"
              error={errors.githubUrl?.message}
              {...register("githubUrl")}
            />
            <SocialField
              id="websiteUrl"
              icon={<Globe className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
              placeholder="https://yourwebsite.com"
              error={errors.websiteUrl?.message}
              {...register("websiteUrl")}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={
          updateProfile.isPending ||
          (!isDirty && skills.join(",") === initialSkillNames.join(","))
        }
      >
        {updateProfile.isPending ? "Saving…" : "Save Profile"}
      </Button>
    </form>
  );
}

interface SocialFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  error?: string;
}

const SocialField = ({
  id,
  icon,
  placeholder,
  error,
  ...rest
}: SocialFieldProps) => (
  <div>
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-7 h-8 shrink-0">
        {icon}
      </div>
      <Input
        id={id}
        {...rest}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
    {error && <p className="text-xs text-destructive mt-0.5 pl-9">{error}</p>}
  </div>
);
