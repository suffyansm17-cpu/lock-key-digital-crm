import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// TODO: replace with your actual auth/session check.
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

    // Create Supabase login account
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
        {
          error: authError?.message || "Could not create employee login account.",
        },
        { status: 400 }
      );
    }

    createdAuthUserId = authUser.user.id;

    // Create employee record
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
        console.error(
          `CRITICAL: failed to roll back orphaned auth user ${authUser.user.id} ` +
            `after employee insert failure:`,
          deleteError
        );
      }

      return NextResponse.json({ error: employeeError.message }, { status: 400 });
    }

    // --- From here on, the employee record is committed. ---
    // Any failure below (missing config, network error, Resend API error)
    // must NOT be reported as a creation failure — it's a best-effort
    // notification step. We report it as a warning on a 200 instead.

    const crmUrl = new URL("/", request.url).origin;
    const resendKey = process.env.RESEND_API_KEY;

    if (!resendKey) {
      console.error("RESEND_API_KEY is not configured; skipping welcome email.");
      return NextResponse.json(
        {
          success: true,
          employee_id: employeeId,
          user_id: authUser.user.id,
          emailSent: false,
          warning:
            "Employee was created successfully, but the welcome email could not be sent (missing email configuration).",
        },
        { status: 200 }
      );
    }

    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Lock & Key Digital <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to Lock & Key Digital — Your CRM Account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 30px;">

              <h2 style="margin-bottom: 8px;">
                Welcome to Lock & Key Digital!
              </h2>

              <p>Hello ${escapeHtml(fullName)},</p>

              <p>
                Your Lock & Key Digital CRM account has been
                created successfully.
              </p>

              <div style="background:#f5f5f5; padding:20px; border-radius:10px; margin:25px 0;">

                <h3>CRM Login Credentials</h3>

                <p>
                  <strong>Employee ID:</strong><br>
                  ${escapeHtml(employeeId)}
                </p>

                <p>
                  <strong>Email:</strong><br>
                  ${escapeHtml(email)}
                </p>

                <p>
                  <strong>Password:</strong><br>
                  ${escapeHtml(password)}
                </p>

              </div>

              <a
                href="${crmUrl}"
                style="
                  display:inline-block;
                  background:#000;
                  color:#fff;
                  padding:12px 20px;
                  border-radius:7px;
                  text-decoration:none;
                  font-weight:bold;
                "
              >
                Open CRM
              </a>

              <p style="margin-top:30px;">
                Please keep your login credentials secure.
              </p>

              <p>
                Regards,<br>
                <strong>Lock & Key Digital HR</strong>
              </p>

            </div>
          `,
        }),
      });

      const emailResult = await emailResponse.json().catch(() => null);

      if (!emailResponse.ok) {
        console.error("Resend API returned an error:", emailResult);
        return NextResponse.json(
          {
            success: true,
            employee_id: employeeId,
            user_id: authUser.user.id,
            emailSent: false,
            warning:
              "Employee was created successfully, but the welcome email could not be sent.",
            emailError: emailResult?.message || "Email sending failed.",
          },
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        employee_id: employeeId,
        user_id: authUser.user.id,
        emailSent: true,
      });
    } catch (emailErr) {
      // Network error, timeout, etc. — employee still exists, so this is
      // a warning, not a 500.
      console.error("Failed to send welcome email:", emailErr);
      return NextResponse.json(
        {
          success: true,
          employee_id: employeeId,
          user_id: authUser.user.id,
          emailSent: false,
          warning:
            "Employee was created successfully, but the welcome email could not be sent.",
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("Employee creation error:", err);

    // Best-effort cleanup if we got as far as creating the auth user
    // before an unexpected error hit (e.g. the employee insert itself
    // threw instead of returning an `error` field).
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
