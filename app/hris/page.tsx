"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Education = {
  degree: string;
  institution_name: string;
  passing_year: string;
  marks: string;
  file: File | null;
  existingFile: string;
};

const emptyEducation = (): Education => ({
  degree: "",
  institution_name: "",
  passing_year: "",
  marks: "",
  file: null,
  existingFile: "",
});

export default function HRISPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");

  // Personal Details
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [currentAddress, setCurrentAddress] = useState("");

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");

  // Bank
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankPassbook, setBankPassbook] = useState<File | null>(null);
  const [existingBankPassbook, setExistingBankPassbook] = useState("");

  // PAN
  const [panNumber, setPanNumber] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [existingPanFile, setExistingPanFile] = useState("");

  // Aadhaar
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [existingAadhaarFile, setExistingAadhaarFile] = useState("");

  // Education
  const [education1, setEducation1] = useState<Education>(
    emptyEducation()
  );

  const [education2, setEducation2] = useState<Education>(
    emptyEducation()
  );

  useEffect(() => {
    loadHRIS();
  }, []);

  async function loadHRIS() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/employee-login";
        return;
      }

      setUserId(user.id);

      const { data: hris } = await supabase
        .from("employee_hris")
        .select("*")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (hris) {
        setFullName(hris.full_name || "");
        setPhone(hris.phone || "");
        setEmail(hris.email || user.email || "");
        setPermanentAddress(hris.permanent_address || "");
        setCurrentAddress(hris.current_address || "");

        setEmergencyName(hris.emergency_contact_name || "");
        setEmergencyPhone(hris.emergency_contact_phone || "");
        setEmergencyRelationship(
          hris.emergency_contact_relationship || ""
        );

        setBankName(hris.bank_name || "");
        setAccountNumber(hris.account_number || "");
        setIfscCode(hris.ifsc_code || "");
        setBranchName(hris.branch_name || "");

        setPanNumber(hris.pan_number || "");
        setAadhaarNumber(hris.aadhaar_number || "");

        setExistingBankPassbook(hris.bank_passbook_file_path || "");
        setExistingPanFile(hris.pan_file_path || "");
        setExistingAadhaarFile(hris.aadhaar_file_path || "");
      } else {
        setEmail(user.email || "");
      }

      const { data: education } = await supabase
        .from("employee_education")
        .select("*")
        .eq("auth_user_id", user.id)
        .order("education_number", { ascending: true });

      if (education) {
        const edu1 = education.find(
          (item) => item.education_number === 1
        );

        const edu2 = education.find(
          (item) => item.education_number === 2
        );

        if (edu1) {
          setEducation1({
            degree: edu1.degree || "",
            institution_name: edu1.institution_name || "",
            passing_year: edu1.passing_year
              ? String(edu1.passing_year)
              : "",
            marks: edu1.marks || "",
            file: null,
            existingFile: edu1.document_file_path || "",
          });
        }

        if (edu2) {
          setEducation2({
            degree: edu2.degree || "",
            institution_name: edu2.institution_name || "",
            passing_year: edu2.passing_year
              ? String(edu2.passing_year)
              : "",
            marks: edu2.marks || "",
            file: null,
            existingFile: edu2.document_file_path || "",
          });
        }
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to load HRIS details.");
    } finally {
      setLoading(false);
    }
  }

  function validateFile(file: File | null) {
    if (!file) return true;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, JPG, JPEG and PNG files are allowed.");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10 MB.");
      return false;
    }

    return true;
  }

  async function uploadFile(
  file: File,
  category: string
): Promise<string> {
  if (!userId) {
    throw new Error("User is not logged in.");
  }

  if (!validateFile(file)) {
    throw new Error(
      "Invalid file. Only PDF, JPG, JPEG and PNG files under 10 MB are allowed."
    );
  }

  const extension =
    file.name.split(".").pop()?.toLowerCase() || "file";

  const filePath = `${userId}/${category}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("hris-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("File upload error:", error);
    throw new Error(error.message);
  }

  return filePath;
}
    if (!userId) return null;

    if (!validateFile(file)) {
      return null;
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "file";

    const filePath = `${userId}/${category}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("hris-documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("File upload error:", error);
      throw new Error(error.message);
    }

    return filePath;
  }

  async function saveHRIS() {
    try {
      setSaving(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/employee-login";
        return;
      }

      let bankPassbookPath = existingBankPassbook;
      let panFilePath = existingPanFile;
      let aadhaarFilePath = existingAadhaarFile;

      if (bankPassbook) {
        bankPassbookPath = await uploadFile(
          bankPassbook,
          "bank-passbook"
        );
      }

      if (panFile) {
        panFilePath = await uploadFile(panFile, "pan");
      }

      if (aadhaarFile) {
        aadhaarFilePath = await uploadFile(
          aadhaarFile,
          "aadhaar"
        );
      }

      let education1Path = education1.existingFile;
      let education2Path = education2.existingFile;

      if (education1.file) {
        education1Path = await uploadFile(
          education1.file,
          "education-1"
        );
      }

      if (education2.file) {
        education2Path = await uploadFile(
          education2.file,
          "education-2"
        );
      }

      const { error: hrisError } = await supabase
        .from("employee_hris")
        .upsert(
          {
            auth_user_id: user.id,
            full_name: fullName,
            phone,
            email,
            permanent_address: permanentAddress,
            current_address: currentAddress,

            emergency_contact_name: emergencyName,
            emergency_contact_phone: emergencyPhone,
            emergency_contact_relationship:
              emergencyRelationship,

            bank_name: bankName,
            account_number: accountNumber,
            ifsc_code: ifscCode,
            branch_name: branchName,

            pan_number: panNumber,
            aadhaar_number: aadhaarNumber,

            bank_passbook_file_path: bankPassbookPath,
            pan_file_path: panFilePath,
            aadhaar_file_path: aadhaarFilePath,

            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "auth_user_id",
          }
        );

      if (hrisError) {
        throw new Error(hrisError.message);
      }

      // Education 1
      if (
        education1.degree ||
        education1.institution_name ||
        education1.passing_year ||
        education1.marks ||
        education1Path
      ) {
        const { error } = await supabase
          .from("employee_education")
          .upsert(
            {
              auth_user_id: user.id,
              education_number: 1,
              degree: education1.degree,
              institution_name: education1.institution_name,
              passing_year: education1.passing_year
                ? Number(education1.passing_year)
                : null,
              marks: education1.marks,
              document_file_path: education1Path || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "auth_user_id,education_number",
            }
          );

        if (error) {
          throw new Error(error.message);
        }
      }

      // Education 2
      if (
        education2.degree ||
        education2.institution_name ||
        education2.passing_year ||
        education2.marks ||
        education2Path
      ) {
        const { error } = await supabase
          .from("employee_education")
          .upsert(
            {
              auth_user_id: user.id,
              education_number: 2,
              degree: education2.degree,
              institution_name: education2.institution_name,
              passing_year: education2.passing_year
                ? Number(education2.passing_year)
                : null,
              marks: education2.marks,
              document_file_path: education2Path || null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "auth_user_id,education_number",
            }
          );

        if (error) {
          throw new Error(error.message);
        }
      }

      setMessage("HRIS details saved successfully. ✅");

      await loadHRIS();
    } catch (error: any) {
      console.error(error);
      setMessage(
        error?.message || "Something went wrong while saving HRIS."
      );
    } finally {
      setSaving(false);
    }
  }

  function updateEducation(
    number: 1 | 2,
    field: keyof Education,
    value: string | File | null
  ) {
    if (number === 1) {
      setEducation1((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setEducation2((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl text-center">
          Loading HRIS...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 rounded-2xl bg-black p-6 text-white shadow">
          <h1 className="text-3xl font-bold">
            HRIS
          </h1>

          <p className="mt-2 text-sm text-gray-300">
            Employee Human Resource Information System
          </p>

          <p className="mt-4 text-sm text-gray-300">
            Please complete your personal, education, bank and
            identification details.
          </p>
        </div>

        {/* Personal Details */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold">
            1. Personal Details
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <Input
              label="Full Name"
              value={fullName}
              onChange={setFullName}
              required
            />

            <Input
              label="Mobile Number"
              value={phone}
              onChange={setPhone}
              required
            />

            <Input
              label="Email ID"
              value={email}
              onChange={setEmail}
              type="email"
              required
            />

            <div className="md:col-span-2">
              <TextArea
                label="Permanent Address"
                value={permanentAddress}
                onChange={setPermanentAddress}
              />
            </div>

            <div className="md:col-span-2">
              <TextArea
                label="Current Address"
                value={currentAddress}
                onChange={setCurrentAddress}
              />
            </div>
          </div>

          <h3 className="mb-4 mt-8 text-lg font-semibold">
            Emergency Contact
          </h3>

          <div className="grid gap-5 md:grid-cols-3">
            <Input
              label="Contact Person Name"
              value={emergencyName}
              onChange={setEmergencyName}
            />

            <Input
              label="Contact Number"
              value={emergencyPhone}
              onChange={setEmergencyPhone}
            />

            <Input
              label="Relationship"
              value={emergencyRelationship}
              onChange={setEmergencyRelationship}
            />
          </div>
        </section>

        {/* Education */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-2 text-xl font-bold">
            2. Education Details
          </h2>

          <p className="mb-6 text-sm text-gray-500">
            You can add your latest two educational qualifications.
          </p>

          <EducationCard
            title="Education 1"
            education={education1}
            update={(field, value) =>
              updateEducation(1, field, value)
            }
          />

          <div className="my-8 border-t" />

          <EducationCard
            title="Education 2"
            education={education2}
            update={(field, value) =>
              updateEducation(2, field, value)
            }
          />
        </section>

        {/* Bank */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold">
            3. Bank Details
          </h2>

          <div className="grid gap-5 md:grid-cols-2">

            <Input
              label="Bank Name"
              value={bankName}
              onChange={setBankName}
              required
            />

            <Input
              label="Account Number"
              value={accountNumber}
              onChange={setAccountNumber}
              required
            />

            <Input
              label="IFSC Code"
              value={ifscCode}
              onChange={setIfscCode}
              required
            />

            <Input
              label="Branch Name"
              value={branchName}
              onChange={setBranchName}
              required
            />

            <FileInput
              label="Bank Passbook"
              file={bankPassbook}
              existingFile={existingBankPassbook}
              onChange={setBankPassbook}
            />
          </div>
        </section>

        {/* PAN */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold">
            4. PAN Details
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="PAN Number"
              value={panNumber}
              onChange={setPanNumber}
              required
            />

            <FileInput
              label="PAN Card"
              file={panFile}
              existingFile={existingPanFile}
              onChange={setPanFile}
            />
          </div>
        </section>

        {/* Aadhaar */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-6 text-xl font-bold">
            5. Aadhaar Details
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Aadhaar Number"
              value={aadhaarNumber}
              onChange={setAadhaarNumber}
              required
            />

            <FileInput
              label="Aadhaar Card"
              file={aadhaarFile}
              existingFile={existingAadhaarFile}
              onChange={setAadhaarFile}
            />
          </div>
        </section>

        {/* Save */}
        <div className="mb-10 rounded-2xl bg-white p-6 shadow">
          {message && (
            <div className="mb-4 rounded-lg bg-gray-100 p-4 text-sm">
              {message}
            </div>
          )}

          <button
            onClick={saveHRIS}
            disabled={saving}
            className="w-full rounded-xl bg-black px-6 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving HRIS..." : "Save HRIS Details"}
          </button>
        </div>

      </div>
    </main>
  );
}


/* =========================================================
   INPUT COMPONENT
========================================================= */

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
      />
    </div>
  );
}


/* =========================================================
   TEXT AREA
========================================================= */

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
      />
    </div>
  );
}


/* =========================================================
   FILE INPUT
========================================================= */

function FileInput({
  label,
  file,
  existingFile,
  onChange,
}: {
  label: string;
  file: File | null;
  existingFile: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) =>
          onChange(e.target.files?.[0] || null)
        }
        className="w-full rounded-lg border border-gray-300 p-3 text-sm"
      />

      {file && (
        <p className="mt-2 text-sm text-green-600">
          Selected: {file.name}
        </p>
      )}

      {!file && existingFile && (
        <p className="mt-2 text-sm text-gray-500">
          Existing document uploaded
        </p>
      )}

      <p className="mt-1 text-xs text-gray-400">
        PDF, JPG, JPEG or PNG — maximum 10 MB
      </p>
    </div>
  );
}


/* =========================================================
   EDUCATION CARD
========================================================= */

function EducationCard({
  title,
  education,
  update,
}: {
  title: string;
  education: Education;
  update: (
    field: keyof Education,
    value: string | File | null
  ) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-5">

      <h3 className="mb-5 text-lg font-semibold">
        {title}
      </h3>

      <div className="grid gap-5 md:grid-cols-2">

        <Input
          label="Degree / Qualification"
          value={education.degree}
          onChange={(value) =>
            update("degree", value)
          }
        />

        <Input
          label="College / School Name"
          value={education.institution_name}
          onChange={(value) =>
            update("institution_name", value)
          }
        />

        <Input
          label="Passing Year"
          value={education.passing_year}
          onChange={(value) =>
            update("passing_year", value)
          }
          type="number"
        />

        <Input
          label="Marks / Percentage"
          value={education.marks}
          onChange={(value) =>
            update("marks", value)
          }
        />

        <FileInput
          label="Education Certificate"
          file={education.file}
          existingFile={education.existingFile}
          onChange={(file) =>
            update("file", file)
          }
        />

      </div>
    </div>
  );
}
