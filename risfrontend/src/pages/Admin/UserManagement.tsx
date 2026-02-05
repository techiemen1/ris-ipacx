// src/pages/Admin/UserManagement.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import LoadingOverlay from "../../layout/LoadingOverlay";
import { useRBAC } from "../../context/RoleContext";

type User = {
  id: number;
  username: string;
  full_name?: string;
  email?: string;
  role?: string;
  phone_number?: string;
  employee_id?: string;
  profile_picture?: string;
  is_active?: boolean;
};

const defaultForm = {
  id: null as number | null,
  username: "",
  full_name: "",
  email: "",
  password: "",
  role: "staff",
  phone_number: "",
  employee_id: "",
  npi_number: "",
  specialty: "",
  license_number: "",
  department: "",
  institution: "",
  notes: "",
  language_preference: "",
  timezone: "",
  can_order: false,
  can_report: false,
  can_schedule: false,
  is_active: true,
};

const UserManagement: React.FC = () => {
  // always call hooks at top level
  const rb = useRBAC();
  const currentUser = rb.user;

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState(() => ({ ...defaultForm }));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Reference Data
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);

  // Access control
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== "admin") {
      setMessage("Access denied: Admins only.");
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/users");
      const data = res.data?.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("fetchUsers", err);
      setMessage("❌ Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Load reference data
    axiosInstance.get("/settings").then((r) => {
      const d = r.data?.data || {};
      setDepartments(d["hierarchy.departments"] || ["Radiology"]);
      setDesignations(d["hierarchy.designations"] || ["Staff"]);
    }).catch(console.error);
  }, []);

  const saveUser = async () => {
    if (!form.username || !form.email || !form.full_name) {
      setMessage("⚠️ Fill username, full name and email.");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        role: form.role,
        phone_number: form.phone_number || null,
        employee_id: form.employee_id || null,
        npi_number: form.npi_number || null,
        specialty: form.specialty || null,
        license_number: form.license_number || null,
        department: form.department || null,
        institution: form.institution || null,
        notes: form.notes || null,
        language_preference: form.language_preference || null,
        timezone: form.timezone || null,
        can_order: Boolean(form.can_order),
        can_report: Boolean(form.can_report),
        can_schedule: Boolean(form.can_schedule),
        is_active: Boolean(form.is_active),
        designation: (form as any).designation || null,
        registration_number: (form as any).registration_number || null,
      };

      // Only include password for create or when user typed a new password
      if (!form.id && form.password) payload.password = form.password;
      if (form.id && form.password) payload.password = form.password;

      if (form.id) {
        await axiosInstance.put(`/users/${form.id}`, payload);
        setMessage("✅ User updated.");
      } else {
        const res = await axiosInstance.post("/users", { ...payload, password: form.password });
        // if backend returns created user in data:
        const created = res.data?.data;
        setForm({ ...defaultForm, id: created?.id ?? null });
        setMessage("✅ User created.");
      }

      fetchUsers();
    } catch (err: any) {
      console.error("saveUser error", err);
      setMessage(`❌ Failed to save user: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file || !form.id) {
      setMessage("⚠️ Select a user first to upload avatar.");
      return;
    }

    const fd = new FormData();
    fd.append("profile_picture", file);

    try {
      setLoading(true);
      await axiosInstance.post(`/users/${form.id}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Profile picture uploaded.");
      fetchUsers();
    } catch (err) {
      console.error("avatar upload", err);
      setMessage("❌ Failed to upload profile picture.");
    } finally {
      setLoading(false);
    }
  };

  const editUser = (u: User) => {
    setForm({ ...defaultForm, ...u, password: "" });
    setMessage(null);
  };

  const deleteUser = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setLoading(true);
      const res = await axiosInstance.delete(`/users/${id}`);
      setMessage(res.data?.message || "🗑️ User deleted.");
      fetchUsers();
    } catch (err: any) {
      console.error("deleteUser", err);
      setMessage(`❌ Failed to delete user: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [signatureLoading, setSignatureLoading] = useState(false);

  const handleSignatureUpload = async (file?: File) => {
    if (!file || !form.id) {
      setMessage("⚠️ Select a user first to upload signature.");
      return;
    }

    const fd = new FormData();
    fd.append("signature", file);

    try {
      setSignatureLoading(true);
      await axiosInstance.post(`/users/${form.id}/signature`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("✅ Signature uploaded.");
      fetchUsers();
    } catch (err: any) {
      console.error("signature upload", err);
      setMessage(`❌ Failed to upload signature: ${err.response?.data?.error || err.message}`);
    } finally {
      setSignatureLoading(false);
    }
  };

  // If not admin, show a message (hooks already called)
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">Access denied. Admins only.</p>
            <p className="text-sm mt-2">You must be an admin to manage users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {loading && <LoadingOverlay message="Processing..." />}

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? "Edit User" : "Add User"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <Input placeholder="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border rounded px-3 py-2 text-sm bg-white">
              <option value="admin">admin</option>
              <option value="radiologist">radiologist</option>
              <option value="technician">technician</option>
              <option value="staff">staff</option>
              <option value="doctor">doctor</option>
              <option value="nurse">nurse</option>
              <option value="receptionist">receptionist</option>
            </select>
            <Input placeholder="NPI Number" value={form.npi_number} onChange={(e) => setForm({ ...form, npi_number: e.target.value })} />

            {/* Professional Details for Signature */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-2">
              <h4 className="md:col-span-2 text-sm font-bold text-gray-500 uppercase">Professional Details (For Digital Signature)</h4>
              <Input placeholder="Designation (e.g. Consultant Radiologist)" value={(form as any).designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value } as any)} />
              <Input placeholder="Registration Number (e.g. KMC-12345)" value={(form as any).registration_number || ""} onChange={(e) => setForm({ ...form, registration_number: e.target.value } as any)} />
            </div>

            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">Select Department...</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="border rounded px-3 py-2 text-sm bg-white"
            >
              <option value="">Select Specialty...</option>
              {designations.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <Input placeholder="License Number" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
            <Input placeholder="Institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <Input placeholder="Language Preference" value={form.language_preference} onChange={(e) => setForm({ ...form, language_preference: e.target.value })} />
            <Input placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />

            <div className="md:col-span-3 flex gap-6 items-center border-t pt-4">
              <label className="flex items-center gap-2 border p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.can_order} onChange={(e) => setForm({ ...form, can_order: e.target.checked })} />
                Can Order
              </label>
              <label className="flex items-center gap-2 border p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.can_report} onChange={(e) => setForm({ ...form, can_report: e.target.checked })} />
                Can Report
              </label>
              <label className="flex items-center gap-2 border p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.can_schedule} onChange={(e) => setForm({ ...form, can_schedule: e.target.checked })} />
                Can Schedule
              </label>
              <select value={form.is_active ? "true" : "false"} onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })} className="border rounded px-3 py-2 text-sm bg-white">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Avatar Update</label>
                <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Digital Signature Update</label>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/png, image/jpeg" onChange={(e) => handleSignatureUpload(e.target.files?.[0])} disabled={signatureLoading} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50" />
                  {signatureLoading && <span className="animate-spin text-blue-600">⟳</span>}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Upload transparent PNG of scanned signature. Will be used for final reports.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={saveUser}>{form.id ? "Update User" : "Create User"}</Button>
            {form.id && (
              <Button variant="secondary" onClick={() => setForm({ ...defaultForm })}>
                Cancel (Clear Form)
              </Button>
            )}
          </div>

          {message && (
            <p className="mt-3 text-sm text-blue-700 bg-blue-50 p-2 rounded animate-in fade-in">{message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Profile</th>
                  <th className="border px-2 py-1">Username</th>
                  <th className="border px-2 py-1">Details</th>
                  <th className="border px-2 py-1">Role / Dept</th>
                  <th className="border px-2 py-1">Signature</th>
                  <th className="border px-2 py-1">Status</th>
                  <th className="border px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center">
                      {u.profile_picture ? (
                        <img src={u.profile_picture} alt="avatar" className="h-8 w-8 rounded-full object-cover mx-auto" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 mx-auto flex items-center justify-center text-xs text-gray-500">?</div>
                      )}
                    </td>
                    <td className="border px-2 py-1 font-medium">{u.username}</td>
                    <td className="border px-2 py-1">
                      <div className="font-bold">{u.full_name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td className="border px-2 py-1">
                      <div className="bg-slate-100 px-1 rounded inline-block text-xs font-mono">{u.role}</div>
                      <div className="text-xs text-gray-400">{(u as any).department || '-'}</div>
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {(u as any).signature_path ? <span title="Signature Uploaded">✅</span> : <span className="text-gray-300" title="No Signature">❌</span>}
                      {(u as any).registration_number && <div className="text-[9px] text-gray-500 mt-1">{(u as any).registration_number}</div>}
                    </td>
                    <td className="border px-2 py-1">{u.is_active ? <span className="text-green-600 font-bold text-xs">Active</span> : <span className="text-red-400 text-xs">Inactive</span>}</td>
                    <td className="border px-2 py-1 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => editUser(u)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>Del</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
