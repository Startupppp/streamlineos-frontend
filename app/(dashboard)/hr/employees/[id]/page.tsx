import { EditEmployeeForm } from "./edit-employee-form"; // Client component
import { getEmployeeById } from "@/server/actions/hr-actions";
import { notFound } from "next/navigation";

export default async function EditEmployeePage({ params }: { params: { id: string } }) {
  const employee = await getEmployeeById(params.id);

  if (!employee) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Employee</h2>
      </div>
      <EditEmployeeForm employee={employee} />
    </div>
  );
}
