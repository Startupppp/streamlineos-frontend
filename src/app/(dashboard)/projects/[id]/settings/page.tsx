import { auth } from "@clerk/nextjs/server";
import { getProjectDetails, updateProjectSettings } from "@/app/actions/projects";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default async function ProjectSettingsPage({ params }: { params: { id: string } }) {
  const { orgId } = await auth();
  if (!orgId) redirect("/org-selection");

  const projectId = parseInt(params.id);
  const data = await getProjectDetails(projectId);

  if (!data?.project) {
      return <div>Project not found</div>;
  }

  const { project } = data;

  async function saveSettings(formData: FormData) {
      "use server";
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const status = formData.get("status") as string;

      await updateProjectSettings(projectId, { name, description, status });
      redirect(`/projects/${projectId}`);
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Project Settings</h1>
        
        <Card className="bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">General Information</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={saveSettings} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-white">Project Name</Label>
                        <Input id="name" name="name" defaultValue={project.name} className="bg-black/20 border-white/10 text-white" />
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-white">Description</Label>
                        <Textarea id="description" name="description" defaultValue={project.description || ""} className="bg-black/20 border-white/10 text-white" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-white">Status</Label>
                        <select 
                            name="status" 
                            defaultValue={project.status || "ACTIVE"}
                            className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
                        >
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>
                    </div>

                    <Button type="submit" className="w-full bg-gold text-black hover:bg-yellow-500">
                        Save Changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    </div>
  );
}
