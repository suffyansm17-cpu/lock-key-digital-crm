"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, X, Trash2 } from "lucide-react";

type EmployeeRow = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  joining_date?: string | null;
  employment_type?: string | null;
  reporting_manager?: string | null;
  status: string;
  created_at?: string;
};

type EmployeeForm = {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  department: string;
  designation: string;
  joining_date: string;
  employment_type: string;
  reporting_manager: string;
  status: string;
};

const emptyForm: EmployeeForm = {
  full_name: "",
  email: "",
  password: "",
  phone: "",
  department: "",
  designation: "",
  joining_date: "",
  employment_type: "Full-time",
  reporting_manager: "",
  status: "Active",
};

function makeEmployeeId(fullName: string, sequence: number) {
  const parts = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return `employee.${sequence}`;
  }

  return `${parts.join(".")}.${sequence}`;
}

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EmployeeForm>(emptyForm);

  // Load employees
  useEffect(() => {
    async function loadEmployees() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Load employees error:", error);
        setError(error.message);
        setEmployees([]);
      } else {
        setEmployees((data || []) as EmployeeRow[]);
      }

      setLoading(false);
    }

    loadEmployees();
  }, []);

  // Search employees
  const filteredEmployees = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return employees;
    }

    return employees.filter((employee) =>
      [
        employee.employee_id,
        employee.full_name,
        employee.email,
        employee.department,
        employee.designation,
        employee.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [employees, query]);

  function updateForm(
    field: keyof EmployeeForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function closeForm() {
    if (saving) return;

    setOpen(false);
    setError("");
    setForm(emptyForm);
  }

  // Add employee
  async function addEmployee() {
    setError("");

    if (!form.full_name.trim()) {
      setError("Please enter the employee's full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter the employee's email.");
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

    setSaving(true);

    try {
      const sequence = employees.length + 1;
      const employee_id = makeEmployeeId(
        form.full_name,
        sequence
      );

      const response = await fetch("/api/employees/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employee_id,
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || null,
          department: form.department || null,
          designation: form.designation || null,
          joining_date: form.joining_date || null,
          employment_type:
            form.employment_type || "Full-time",
          reporting_manager:
            form.reporting_manager || null,
          status: form.status || "Active",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Failed to create employee."
        );
      }

      // Reload employees from Supabase
      const { data, error: reloadError } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: true });

      if (reloadError) {
        throw new Error(reloadError.message);
      }

      setEmployees((data || []) as EmployeeRow[]);
      setForm(emptyForm);
      setOpen(false);

      if (result.emailSent === false) {
        alert(
          `Employee created successfully.\n\nEmployee ID: ${employee_id}\n\nHowever, the welcome email was not sent.\n\n${
            result.emailError ||
            result.warning ||
            "Please check the email service."
          }`
        );
      } else {
        alert(
          `Employee created successfully.\n\nEmployee ID: ${employee_id}\n\nWelcome email sent.`
        );
      }
    } catch (err) {
      console.error("Create employee error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the employee."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete employee
  async function deleteEmployee(employee: EmployeeRow) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${employee.full_name}?\n\nEmployee ID: ${employee.employee_id}\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(employee.id);
    setError("");

    try {
      const response = await fetch(
        "/api/employees/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: employee.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Failed to delete employee."
        );
      }

      setEmployees((current) =>
        current.filter(
          (item) => item.id !== employee.id
        )
      );
    } catch (err) {
      console.error("Delete employee error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete employee."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">
            Employees
          </h1>

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

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Employee table */}
      <div className="card overflow-hidden">
        {/* Search */}
        <div className="border-b border-black/5 p-4">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-3 text-neutral-400"
              size={17}
            />

            <input
              className="input pl-10"
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search employees..."
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            Loading employees...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-5 py-3">
                    Employee
                  </th>

                  <th className="px-5 py-3">
                    Department
                  </th>

                  <th className="px-5 py-3">
                    Designation
                  </th>

                  <th className="px-5 py-3">
                    Joining
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-neutral-500"
                    >
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(
                    (employee) => (
                      <tr
                        key={employee.id}
                        className="border-t border-black/5"
                      >
                        {/* Employee */}
                        <td className="px-5 py-4">
                          <b>
                            {employee.full_name}
                          </b>

                          <div className="text-xs text-neutral-500">
                            {employee.employee_id}
                            {" · "}
                            {employee.email}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4">
                          {employee.department || "—"}
                        </td>

                        {/* Designation */}
                        <td className="px-5 py-4">
                          {employee.designation || "—"}
                        </td>

                        {/* Joining */}
                        <td className="px-5 py-4">
                          {employee.joining_date || "—"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                            {employee.status}
                          </span>
                        </td>

                        {/* Delete */}
                        <td className="px-5 py-4">
                          <button
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() =>
                              deleteEmployee(
                                employee
                              )
                            }
                            disabled={
                              deletingId ===
                              employee.id
                            }
                          >
                            <Trash2 size={14} />

                            {deletingId ===
                            employee.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-auto p-6">
            {/* Modal header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Add Employee
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Create the employee profile and
                  CRM login credentials.
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-neutral-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal error */}
            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="label">
                  Full Name *
                </label>

                <input
                  className="input"
                  type="text"
                  value={form.full_name}
                  onChange={(e) =>
                    updateForm(
                      "full_name",
                      e.target.value
                    )
                  }
                  placeholder="Aarav Sharma"
                />

                {form.full_name && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Employee ID:{" "}
                    {makeEmployeeId(
                      form.full_name,
                      employees.length + 1
                    )}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="label">
                  Email *
                </label>

                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateForm(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="employee@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">
                  CRM Password *
                </label>

                <input
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    updateForm(
                      "password",
                      e.target.value
                    )
                  }
                  placeholder="Minimum 8 characters"
                />

                <p className="mt-1 text-xs text-neutral-500">
                  This password will be used for the
                  employee's CRM login.
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="label">
                  Phone
                </label>

                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    updateForm(
                      "phone",
                      e.target.value
                    )
                  }
                  placeholder="Phone number"
                />
              </div>

              {/* Department */}
              <div>
                <label className="label">
                  Department
                </label>

                <input
                  className="input"
                  type="text"
                  value={form.department}
                  onChange={(e) =>
                    updateForm(
                      "department",
                      e.target.value
                    )
                  }
                  placeholder="IT / HR / Marketing"
                />
              </div>

              {/* Designation */}
              <div>
                <label className="label">
                  Designation
                </label>

                <input
                  className="input"
                  type="text"
                  value={form.designation}
                  onChange={(e) =>
                    updateForm(
                      "designation",
                      e.target.value
                    )
                  }
                  placeholder="Software Engineer"
                />
              </div>

              {/* Joining Date */}
              <div>
                <label className="label">
                  Joining Date
                </label>

                <input
                  className="input"
                  type="date"
                  value={form.joining_date}
                  onChange={(e) =>
                    updateForm(
                      "joining_date",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* Employment Type */}
              <div>
                <label className="label">
                  Employment Type
                </label>

                <select
                  className="input"
                  value={form.employment_type}
                  onChange={(e) =>
                    updateForm(
                      "employment_type",
                      e.target.value
                    )
                  }
                >
                  <option value="Full-time">
                    Full-time
                  </option>

                  <option value="Part-time">
                    Part-time
                  </option>

                  <option value="Contract">
                    Contract
                  </option>

                  <option value="Intern">
                    Intern
                  </option>
                </select>
              </div>

              {/* Reporting Manager */}
              <div>
                <label className="label">
                  Reporting Manager
                </label>

                <input
                  className="input"
                  type="text"
                  value={form.reporting_manager}
                  onChange={(e) =>
                    updateForm(
                      "reporting_manager",
                      e.target.value
                    )
                  }
                  placeholder="Manager name"
                />
              </div>

              {/* Status */}
              <div>
                <label className="label">
                  Status
                </label>

                <select
                  className="input"
                  value={form.status}
                  onChange={(e) =>
                    updateForm(
                      "status",
                      e.target.value
                    )
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="On Notice">
                    On Notice
                  </option>

                  <option value="Resigned">
                    Resigned
                  </option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn-light"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="btn-dark"
                onClick={addEmployee}
                disabled={saving}
              >
                {saving
                  ? "Creating Employee..."
                  : "Create Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
