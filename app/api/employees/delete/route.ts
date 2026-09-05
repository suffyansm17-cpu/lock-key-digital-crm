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

    // Find employee first
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

    let authUserId = employee.auth_user_id;

    // If auth_user_id is missing, try to find the Auth account by email.
    if (!authUserId && employee.email) {
      const { data: usersData, error: usersError } =
        await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (!usersError) {
        const matchingUser = usersData.users.find(
          (user) =>
            user.email?.toLowerCase() ===
            employee.email.toLowerCase()
        );

        if (matchingUser) {
          authUserId = matchingUser.id;
        }
      }
    }

    // Delete the Supabase Auth account FIRST.
    // This ensures the email becomes available again.
    if (authUserId) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (authDeleteError) {
        console.error(
          "Failed to delete Supabase Auth user:",
          authDeleteError
        );

        return NextResponse.json(
          {
            error:
              "Could not delete the employee login account. The employee was NOT deleted.",
            details: authDeleteError.message,
          },
          { status: 400 }
        );
      }
    }

    // Now delete the employee record.
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
        {
          error:
            "Login account was deleted, but employee record could not be deleted.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Employee, login account and HRIS data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete employee error:", error);

    return NextResponse.json(
      { error: "Failed to delete employee." },
      { status: 500 }
    );
  }
}
