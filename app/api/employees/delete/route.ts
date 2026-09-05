import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Employee ID is required." },
        { status: 400 }
      );
    }

    // First get the employee's Auth user ID
    const { data: employee, error: findError } = await supabaseAdmin
      .from("employees")
      .select("id, employee_id, email, auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error("Find employee error:", findError);

      return NextResponse.json(
        { error: findError.message },
        { status: 400 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found." },
        { status: 404 }
      );
    }

    // Delete employee record
    const { error: employeeDeleteError } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", id);

    if (employeeDeleteError) {
      console.error(
        "Employee database deletion failed:",
        employeeDeleteError
      );

      return NextResponse.json(
        { error: employeeDeleteError.message },
        { status: 400 }
      );
    }

    // Delete Supabase Auth account
    if (employee.auth_user_id) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(
          employee.auth_user_id
        );

      if (authDeleteError) {
        console.error(
          "Employee database deleted, but Auth account deletion failed:",
          authDeleteError
        );

        return NextResponse.json(
          {
            success: true,
            warning:
              "Employee was deleted, but the login account could not be deleted. Please try deleting the employee again.",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "Employee, login account and HRIS access deleted successfully.",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    return NextResponse.json(
      { error: "Failed to delete employee." },
      { status: 500 }
    );
  }
}
