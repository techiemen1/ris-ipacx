import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import LoadingOverlay from "../../layout/LoadingOverlay";
import { useRBAC } from "../../context/RoleContext";

const ProfilePage: React.FC = () => {
    const { user } = useRBAC();
    const [loading, setLoading] = useState(false);
    const [signatureLoading, setSignatureLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        phone_number: "",
        designation: "",
        registration_number: "",
        password: "",
        signature_path: ""
    });

    useEffect(() => {
        if (!user) return;
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            if (!user?.id) return;
            const res = await axiosInstance.get(`/users/${user.id}`);
            const data = res.data;
            setForm({
                full_name: data.full_name || "",
                email: data.email || "",
                phone_number: data.phone_number || "",
                designation: data.designation || "",
                registration_number: data.registration_number || "",
                password: "",
                signature_path: data.signature_path || ""
            });
        } catch (err) {
            console.error(err);
            setMessage("❌ Failed to load profile.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        try {
            setLoading(true);
            setMessage(null);

            const payload: any = {
                full_name: form.full_name,
                email: form.email,
                phone_number: form.phone_number,
                designation: form.designation,
                registration_number: form.registration_number
            };

            if (form.password) {
                payload.password = form.password;
            }

            await axiosInstance.put(`/users/${user?.id}`, payload);
            setMessage("✅ Profile updated successfully.");

            // Clear password field
            setForm(prev => ({ ...prev, password: "" }));
        } catch (err: any) {
            console.error(err);
            setMessage(`❌ Update failed: ${err.response?.data?.error || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSignatureUpload = async (file?: File) => {
        if (!file || !user?.id) return;

        const fd = new FormData();
        fd.append("signature", file);

        try {
            setSignatureLoading(true);
            const res = await axiosInstance.post(`/users/${user.id}/signature`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setMessage("✅ Signature uploaded.");
            setForm(prev => ({ ...prev, signature_path: res.data.path }));
        } catch (err: any) {
            console.error("signature upload", err);
            setMessage(`❌ Failed to upload signature: ${err.response?.data?.error || err.message}`);
        } finally {
            setSignatureLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {loading && <LoadingOverlay message="Saving..." />}

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Username (Read-Only)</label>
                            <Input value={user?.username || ""} disabled className="bg-gray-50" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Role (Read-Only)</label>
                            <Input value={user?.role || ""} disabled className="bg-gray-50 uppercase" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                            <Input value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Change Password</label>
                            <Input
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-blue-100 shadow-md">
                <CardHeader className="bg-blue-50/50 border-b border-blue-100">
                    <CardTitle className="text-blue-900 flex items-center gap-2">
                        Professional & Legal
                        <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">Required for Signing</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Designation</label>
                            <Input
                                placeholder="e.g. Consultant Radiologist"
                                value={form.designation}
                                onChange={e => setForm({ ...form, designation: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400">Appears under your name in reports.</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Registration Number</label>
                            <Input
                                placeholder="e.g. KMC-12345"
                                value={form.registration_number}
                                onChange={e => setForm({ ...form, registration_number: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400">Medical Council Registration Number.</p>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Digital Signature</label>
                        <div className="flex items-start gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg"
                                        onChange={(e) => handleSignatureUpload(e.target.files?.[0])}
                                        disabled={signatureLoading}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                                    />
                                    {signatureLoading && <span className="animate-spin text-blue-600">⟳</span>}
                                </div>
                                <p className="text-xs text-slate-500">Upload a scanned copy of your signature (Transparent PNG recommended). This will be legally affixed to your finalized reports.</p>
                            </div>

                            <div className="w-48 h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative">
                                {form.signature_path ? (
                                    <img src={`/api${form.signature_path}`} alt="Signature" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-slate-300 font-bold uppercase">No Signature</span>
                                )}
                                <div className="absolute bottom-0 right-0 bg-white px-1 text-[8px] text-slate-300 border-t border-l rounded-tl">PREVIEW</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-4">
                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 w-32">Save Changes</Button>
                {message && (
                    <span className={`text-sm px-3 py-1 rounded ${message.includes("failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {message}
                    </span>
                )}
            </div>

        </div>
    );
};

export default ProfilePage;
