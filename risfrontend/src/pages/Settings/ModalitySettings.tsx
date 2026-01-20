import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Trash2, Plus, CheckCircle2, AlertCircle } from "lucide-react";

type Modality = {
    id: number;
    name: string;
    ae_title: string;
    ip_address: string;
    port: number;
    description: string;
};

export default function ModalitySettings() {
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState("");
    const [newAET, setNewAET] = useState("");
    const [newIP, setNewIP] = useState("");
    const [newPort, setNewPort] = useState(104);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get("/modalities");
            setModalities(data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleAdd = async () => {
        if (!newName || !newAET || !newIP) {
            setError("Please fill all required fields (Name, AE Title, IP)");
            return;
        }
        setError(null);
        try {
            await axiosInstance.post("/modalities", {
                name: newName,
                ae_title: newAET,
                ip_address: newIP,
                port: newPort,
                description: "Added via Settings"
            });
            // Reset
            setNewName("");
            setNewAET("");
            setNewIP("");
            setNewPort(104);
            setError(null);
            setSuccessMsg("Modality added successfully");
            setTimeout(() => setSuccessMsg(null), 3000);
            load();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure? This modality will no longer be able to query MWL.")) return;
        try {
            await axiosInstance.delete(`/modalities/${id}`);
            load();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-4">

            <div className="flex flex-col gap-6">
                {/* Add Form */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Add New Modality</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-2">
                                <AlertCircle size={12} /> {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded flex items-center gap-2">
                                <CheckCircle2 size={12} /> {successMsg}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Friendly Name</label>
                                <Input placeholder="e.g. CT Room 1" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">AE Title (Must Match Modality)</label>
                                <Input placeholder="e.g. CT_PHILIPS_1" value={newAET} onChange={e => setNewAET(e.target.value.toUpperCase())} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">IP Address</label>
                                <Input placeholder="e.g. 192.168.1.50" value={newIP} onChange={e => setNewIP(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Port (Default 104)</label>
                                <div className="flex gap-2">
                                    <Input type="number" value={newPort} onChange={e => setNewPort(parseInt(e.target.value))} className="flex-1" />
                                    <Button onClick={handleAdd} disabled={loading} className="shrink-0">
                                        <Plus size={16} className="mr-2" /> Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* List */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Registered Modalities</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>No.</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>AE Title</TableHead>
                                    <TableHead>IP / Port</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {modalities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                                            No modalities configured.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    modalities.map((m, i) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-slate-400">{i + 1}</TableCell>
                                            <TableCell className="font-medium text-sm">{m.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded w-fit">{m.ae_title}</TableCell>
                                            <TableCell className="text-xs text-slate-500 font-mono">
                                                {m.ip_address}:{m.port}
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(m.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
