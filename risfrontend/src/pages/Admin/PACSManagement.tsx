// src/pages/Admin/PACSManagement.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

interface PACSConfig {
  id?: number;
  name: string;
  type: "Orthanc" | "DCM4CHEE" | "DICOMweb";
  host: string;
  port: number;
  aeTitle?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  is_active?: boolean;
}

const defaultForm: PACSConfig = {
  name: "",
  type: "Orthanc",
  host: "localhost",
  port: 8042,
  aeTitle: "",
  baseUrl: "",
  username: "",
  password: "",
  is_active: true,
};

const PACSManagement: React.FC = () => {
  const [pacsList, setPacsList] = useState<PACSConfig[]>([]);
  const [formData, setFormData] = useState<PACSConfig>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPACS = async () => {
    try {
      setLoading(true);
      const r = await axiosInstance.get("/pacs");
      setPacsList(r.data?.data ?? []);
      setMessage(null);
    } catch (err) {
      console.error("fetchPACS", err);
      setMessage("❌ Failed to load PACS list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPACS();
  }, []);

  const normalizePayload = (payload: PACSConfig) => ({
    name: payload.name,
    type: payload.type,
    host: payload.host,
    port: payload.port,
    aetitle: payload.aeTitle || null,   // maps aeTitle -> aetitle
    base_url: payload.baseUrl || null,  // maps baseUrl -> base_url
    username: payload.username || null,
    password: payload.password || null,
    is_active: payload.is_active ?? true,
  });

  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.port) {
      setMessage("⚠️ Fill required fields (Name, Host, Port).");
      return;
    }
    try {
      setLoading(true);
      if (editingId) {
        await axiosInstance.put(`/pacs/${editingId}`, normalizePayload(formData));
        setMessage("✅ PACS updated.");
      } else {
        await axiosInstance.post("/pacs", normalizePayload(formData));
        setMessage("✅ PACS added.");
      }
      setFormData(defaultForm);
      setEditingId(null);
      fetchPACS();
    } catch (err: any) {
      console.error("Save PACS error", err);
      setMessage(`❌ Failed: ${err?.response?.data?.message ?? err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Delete PACS?")) return;
    try {
      setLoading(true);
      await axiosInstance.delete(`/pacs/${id}`);
      setMessage("🗑️ Deleted.");
      fetchPACS();
    } catch (err) {
      console.error(err);
      setMessage("❌ Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (id?: number) => {
    if (!id) return;
    try {
      setLoading(true);
      const testResponse = await axiosInstance.post(`/pacs/${id}/test`);
      setMessage(testResponse.data?.message ?? "OK");
    } catch (err: any) {
      console.error("Test error", err);
      setMessage(`❌ Test failed: ${err?.response?.data?.message ?? err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadForEdit = (p: PACSConfig) => {
    setEditingId(p.id ?? null);
    setFormData({ ...p });
    setMessage("✏️ Editing PACS configuration...");
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader><CardTitle>PACS Management</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm mb-1">Type</label>
              <select className="border rounded px-2 py-1 w-full" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}>
                <option>Orthanc</option>
                <option>DCM4CHEE</option>
                <option>DICOMweb</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Host</label>
              <Input value={formData.host} onChange={(e) => setFormData({ ...formData, host: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm mb-1">Port</label>
              <Input type="number" value={formData.port} onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) })} />
            </div>

            <div>
              <label className="block text-sm mb-1">AE Title</label>
              <Input value={formData.aeTitle} onChange={(e) => setFormData({ ...formData, aeTitle: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm mb-1">Base URL</label>
              <Input value={formData.baseUrl} onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm mb-1">Username</label>
              <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>{editingId ? "Update PACS" : "Save PACS"}</Button>
            <Button variant="outline" onClick={fetchPACS}>Refresh</Button>
            <Button variant="ghost" onClick={() => { setFormData(defaultForm); setEditingId(null); }}>Reset</Button>
          </div>

          {message && <div className="mt-3 text-sm text-blue-700 bg-blue-50 p-2 rounded">{message}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Existing PACS</CardTitle></CardHeader>
        <CardContent>
          {pacsList.length === 0 ? (
            <div>No PACS configured</div>
          ) : (
            <div className="space-y-3">
              {pacsList.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded shadow-sm">
                  <div onClick={() => loadForEdit(p)} className="cursor-pointer">
                    <div className="font-semibold">{p.name} <span className="text-xs text-gray-500">({p.type})</span></div>
                    <div className="text-sm text-gray-600">{p.host}:{p.port} {p.baseUrl ? `· ${p.baseUrl}` : ""}</div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleTest(p.id)}>Test</Button>
                    <Button variant="destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PACSManagement;
