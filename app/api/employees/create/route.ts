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
        {
          error: "Employee ID, name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // Create Supabase login account
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
        {
          error:
            authError?.message ||
            "Could not create employee login account.",
        },
        { status: 400 }
      );
    }

    // Create employee record
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

    // CRM URL
    const crmUrl = new URL("/", request.url).origin;

    // Send welcome email through Resend
    const resendKey = process.env.RESEND_API_KEY;

    if (!resendKey) {
      return NextResponse.json(
        {
          error:
            "Employee created, but RESEND_API_KEY is missing.",
        },
        { status: 500 }
      );
    }

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Lock & Key Digital <onboarding@resend.dev>",
          to: [email],
          subject:
            "Welcome to Lock & Key Digital — Your CRM Account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 30px;">
              
              <h2 style="margin-bottom: 8px;">
                Welcome to Lock & Key Digital!
              </h2>

              <p>Hello ${full_name},</p>

              <p>
                Your Lock & Key Digital CRM account has been
                created successfully.
              </p>

              <div style="background:#f5f5f5; padding:20px; border-radius:10px; margin:25px 0;">
                
                <h3>CRM Login Credentials</h3>

                <p>
                  <strong>Employee ID:</strong><br>
                  ${employee_id}
                </p>

                <p>
                  <strong>Email:</strong><br>
                  ${email}
                </p>

                <p>
                  <strong>Password:</strong><br>
                  ${password}
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
      }
    );

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      return NextResponse.json(
        {
          success: true,
          employee_id,
          warning:
            "Employee was created successfully, but the welcome email could not be sent.",
          emailError:
            emailResult?.message || "Email sending failed.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      employee_id,
      user_id: authUser.user.id,
      emailSent: true,
    });
  } catch (error) {
    console.error("Employee creation error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while creating the employee.",
      },
      { status: 500 }
    );
  }
}
