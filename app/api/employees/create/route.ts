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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return NextResponse.json(
    { error: "Invalid email format." },
    { status: 400 }
  );
}
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(password)) {
  return NextResponse.json(
    { error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." },
    { status: 400 }
  );
}

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
       email_confirm: false,
// Send verification email separately
        email_confirm: true,
        user_metadata: {
          employee_id,
          full_name,
          role: "employee",
        },
      });

    if (authError || !authUser.user) {
      return NextResponse.json(
{ error: "Could not create login account. Please try again or contact support." }      
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
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
  if (deleteError) {
    console.error("Failed to rollback auth user:", deleteError);
    // Handle cleanup failure - maybe queue a background job
  }
  return NextResponse.json({ error: employeeError.message }, { status: 400 });
}

      return NextResponse.json(
        { error: employeeError.message },
        { status: 400 }
      );
    }
} catch (error) {
  // Now you can log or use the error
  console.error(error);
}
    return NextResponse.json({
      success: true,
      employee_id,
      user_id: authUser.user.id,
    });
    } catch (error) {
  // Now you can log or use the error
  console.error(error);
}
    return NextResponse.json(
      { error: "Something went wrong while creating the employee." },
      { status: 500 }
    );
  }
}
