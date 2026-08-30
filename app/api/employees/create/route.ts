import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// TODO: replace with your actual auth/session check.
// Example if you're using Supabase auth cookies:
//
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
//
// async function getCallerRole() {
//   const supabase = createServerClient(/* ... */);
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return null;
//   return user.user_metadata?.role ?? null;
// }
async function assertIsAdmin(): Promise<boolean> {
  // Replace this stub with a real session/role check before shipping.
  // Returning true here means the route is currently UNPROTECTED.
  return true;
}

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null;

  try {
    const isAdmin = await assertIsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id,
      full_name,
      email: rawEmail,
      password,
      phone,
      department,
      designation,
      joining_date,
      employment_type,
      reporting_manager,
      status,
    } = body;

    const employeeId = typeof employee_id === "string" ? employee_id.trim() : "";
    const fullName = typeof full_name === "string" ? full_name.trim() : "";
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!employeeId || !fullName || !email || !password) {
      return NextResponse.json(
        { error: "Employee ID, name, email and password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    // Pre-check for duplicates so we don't create an auth user we then
    // have to roll back for a totally predictable conflict.
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("employees")
      .select("id")
      .or(`employee_id.eq.${employeeId},email.eq.${email}`)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Employee duplicate-check failed:", existingError);
      return NextResponse.json(
        { error: "Could not validate employee uniqueness. Please try again." },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: "An employee with this ID or email already exists." },
        { status: 409 }
      );
    }

    // Create the auth user.
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          employee_id: employeeId,
          full_name: fullName,
          role: "employee",
        },
      });

    if (authError || !authUser?.user) {
      console.error("Auth user creation failed:", authError);
      return NextResponse.json(
        { error: authError?.message || "Could not create login account." },
        { status: 400 }
      );
    }

    createdAuthUserId = authUser.user.id;

    // Create the employee record.
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        employee_id: employeeId,
        full_name: fullName,
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
      console.error(
        `Employee insert failed for auth user ${authUser.user.id}, rolling back:`,
        employeeError
      );

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        authUser.user.id
      );

      if (deleteError) {
        // Auth user now exists with no matching employee row. Log loudly —
        // this needs manual cleanup or a retry mechanism.
        console.error(
          `CRITICAL: failed to roll back orphaned auth user ${authUser.user.id} ` +
            `after employee insert failure:`,
          deleteError
        );
      }

      return NextResponse.json({ error: employeeError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      employee_id: employeeId,
      user_id: authUser.user.id,
    });
  } catch (err) {
    console.error("Unexpected error while creating employee:", err);

    // Best-effort cleanup if we got as far as creating the auth user
    // before the unexpected error hit.
    if (createdAuthUserId) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        createdAuthUserId
      );
      if (deleteError) {
        console.error(
          `CRITICAL: failed to roll back orphaned auth user ${createdAuthUserId} ` +
            `after unexpected error:`,
          deleteError
        );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong while creating the employee." },
      { status: 500 }
    );
  }
}
