import { redirect } from "next/navigation";

export default function SeatsPage() {
  redirect("/billing?tab=plan");
}
