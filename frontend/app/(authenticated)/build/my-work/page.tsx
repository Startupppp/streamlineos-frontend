import { RequireModule } from "@/components/auth/require-module";
import { MyWorkPage } from "@/features/build/my-work/my-work-page";

export default function MyWorkRoute() {
  return (
    <RequireModule module="build">
      <MyWorkPage />
    </RequireModule>
  );
}
