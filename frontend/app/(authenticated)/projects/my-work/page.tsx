import { RequireModule } from "@/components/auth/require-module";
import { MyWorkPage } from "@/features/projects/my-work/my-work-page";

export default function MyWorkRoute() {
  return (
    <RequireModule module="PROJECTS">
      <MyWorkPage />
    </RequireModule>
  );
}
