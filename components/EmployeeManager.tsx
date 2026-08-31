"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, X, Loader2, Eye, EyeOff } from "lucide-react";

type Employee = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joining_date: string | null;
  employment_type: string | null;
  reporting_manager: string | null;
  status: string;
  created_at: string;
};

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  joining_date: "",
  employment_type: "Full-time",
  reporting_manager: "",
  status: "Active",
  password: "",
  confirmPassword: "",
};

function makeEmployeeId(fullName: string, sequence: number) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  const firstName = (parts[0] || "employee")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const surnameInitial =
    parts.length > 1
      ? (parts[parts.length - 1][0] || "x").toLowerCase()
      : "x";

  return `${firstName}.${surnameInitial}.${sequence}`;
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function loadEmployees() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setEmployees((data || []) as Employee[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    return employees.filter((employee) =>
      `${employee.full_name} ${employee.email} ${
        employee.department || ""
      } ${employee.designation || ""} ${employee.employee_id}`
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  }, [employees, q]);

  async function addEmployee() {
    setError("");

    if (!form.full_name || !form.email) {
      setError("Full name and email are required.");
      return;
    }

    if (!form.password) {
      setError("Please create a password for the employee.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    const sequence = employees.length + 1;
    const employee_id = makeEmployeeId(form.full_name, sequence);

    try {
      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id,
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          department: form.department,
          designation: form.designation,
          joining_date: form.joining_date,
          employment_type: form.employment_type,
          reporting_manager: form.reporting_manager,
          status: form.status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Could not create employee.");
        setSaving(false);
        return;
      }

      setForm(emptyForm);
      setOpen(false);
      setShowPassword(false);
      setShowConfirmPassword(false);

      await loadEmployees();
    } catch {
      setError("Unable to connect to the employee creation service.");
    }

    setSaving(false);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage employee profiles and HR information.
          </p>
        </div>

        <button
          className="btn-dark flex items-center gap-2"
          onClick={() => {
            setError("");
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Add Employee
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="border-b border-black/5 p-4">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-3 text-neutral-400"
              size={17}
            />

            <input
              className="input pl-10"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search employees..."
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-neutral-500">
            <Loader2 className="animate-spin" size={18} />
            Loading employees...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Designation</th>
                  <th className="px-5 py-3">Joining</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-t border-black/5"
                  >
                    <td className="px-5 py-4">
                      <b>{employee.full_name}</b>
                      <div className="text-xs text-neutral-500">
                        {employee.employee_id} · {employee.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {employee.department || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {employee.designation || "—"}
                    </td>

                    <td className="px-5 py-4">
                      {employee.joining_date || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {employee.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-sm text-neutral-500"
                    >
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="card max-h-[90vh] w-full max-w-2xl overflow-auto p-6">
            <div className="mb-6 flex justify-between">
              <h2 className="text-xl font-bold">Add Employee</h2>

              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  placeholder="Aarav Sharma"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Designation</label>
                <input
                  className="input"
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Joining Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.joining_date}
                  onChange={(e) =>
                    setForm({ ...form, joining_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">Reporting Manager</label>
                <input
                  className="input"
                  value={form.reporting_manager}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reporting_manager: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="label">Employment Type</label>
                <select
                  className="input"
                  value={form.employment_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      employment_type: e.target.value,
                    })
                  }
                >
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Contract</option>
                  <option>Intern</option>
                </select>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value })
                  }
                >
                  <option>Active</option>
                  <option>On Notice</option>
                  <option>Resigned</option>
                </select>
              </div>

              <div className="sm:col-span-2 mt-2 rounded-xl border border-black/10 p-4">
                <h3 className="mb-4 font-semibold">CRM Login</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Password</label>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            password: e.target.value,
                          })
                        }
                        placeholder="Minimum 8 characters"
                      />

                      <button
                        type="button"
                        className="absolute right-3 top-2.5"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm Password</label>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={
                          showConfirmPassword ? "text" : "password"
                        }
                        value={form.confirmPassword}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Re-enter password"
                      />

                      <button
                        type="button"
                        className="absolute right-3 top-2.5"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-xs text-neutral-500">
                  The password is securely handled by Supabase
                  authentication and is not stored in the employee table.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn-light"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="btn-dark"
                onClick={addEmployee}
                disabled={saving}
              >
                {saving ? "Creating Account..." : "Create Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
