import { redirect } from "next/navigation";

// "Add Employee" sidebar link redirects to the onboarding wizard
export default function NewEmployeePage() {
  redirect("/hr/onboarding");
}
