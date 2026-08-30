import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      employee_id,
      full_name,
      email,
      password,
      phone,
      department,
      designation,
      joining_date,
      employment_type,
      reporting_manager,
      status,
    } = body;

    if (!employee_id || !full_name || !email || !password) {
      return NextResponse.json(
        { error: "Employee ID, name, email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          employee_id,
          full_name,
          role: "employee",
        },
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message || "Could not create login account." },
        { status: 400 }
      );
    }

    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        employee_id,
        full_name,
        email,
        phone: phone || null,
        department: department || null,
        designation: designation || null,
        joining_date: joining_date || null,
        employment_type: employment_type || "Full-time",
        reporting_manager: reporting_manager || null,
        status: status || "Active",
        auth_user_id: authUser.user.id,
      });

    if (employeeError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        { error: employeeError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      employee_id,
      user_id: authUser.user.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating the employee." },
      { status: 500 }
    );
  }
}
