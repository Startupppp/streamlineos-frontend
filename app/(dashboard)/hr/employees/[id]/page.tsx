import { EmployeeDetailsView } from "./employee-details-view";
import { getEmployeeById } from "@/server/actions/hr-actions";
import { notFound } from "next/navigation";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) {
    notFound();
  }

  return <EmployeeDetailsView employee={employee} />;
}
