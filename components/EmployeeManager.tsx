"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, X, Loader2 } from "lucide-react";

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
    if (!form.full_name || !form.email) {
      setError("Full name and email are required.");
      return;
    }

    setSaving(true);
    setError("");

    const sequence = employees.length + 1;
    const employee_id = makeEmployeeId(form.full_name, sequence);

    const { error } = await supabase.from("employees").insert({
      employee_id,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      department: form.department || null,
      designation: form.designation || null,
      joining_date: form.joining_date || null,
      employment_type: form.employment_type,
      reporting_manager: form.reporting_manager || null,
      status: form.status,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setOpen(false);
    setSaving(false);

    await loadEmployees();
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
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
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
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn-light"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>

              <button
                className="btn-dark"
                disabled={saving}
                onClick={addEmployee}
              >
                {saving ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
