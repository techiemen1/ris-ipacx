import React, { useEffect, useState } from 'react';
import axiosInstance from '../../services/axiosInstance';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Trash2, Plus, Info } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming this utility exists

interface Modality {
    id: number;
    name: string;
    description: string;
    color: string;
}

export default function ModalitySettings() {
    const [modalities, setModalities] = useState<Modality[]>([]);
    const [loading, setLoading] = useState(true);
    const [newModality, setNewModality] = useState({ name: '', description: '', color: 'blue' });
    const [error, setError] = useState<string | null>(null);

    const fetchModalities = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/modalities');
            setModalities(res.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Failed to load modalities.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModalities();
    }, []);

    const handleAdd = async () => {
        if (!newModality.name) return;
        try {
            await axiosInstance.post('/modalities', newModality);
            setNewModality({ name: '', description: '', color: 'blue' });
            fetchModalities();
        } catch (err: any) {
            setError(err.response?.data?.error || "Failed to add modality");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure? This will remove the modality option from the scheduler.")) return;
        try {
            await axiosInstance.delete(`/modalities/${id}`);
            fetchModalities();
        } catch (err) {
            setError("Failed to delete modality.");
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Modality Management</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-md border border-slate-200">
                <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Add machines or exam types here. These will automatically appear as columns in the Scheduler (Day View).
                </p>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Code (e.g. CT, PET)</label>
                        <Input
                            value={newModality.name}
                            onChange={e => setNewModality({ ...newModality, name: e.target.value.toUpperCase() })}
                            placeholder="CT"
                            className="uppercase font-bold"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                        <Input
                            value={newModality.description}
                            onChange={e => setNewModality({ ...newModality, description: e.target.value })}
                            placeholder="Computed Tomography"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Color Tag</label>
                        <select
                            className="w-full border border-slate-300 rounded-md h-9 text-sm px-2"
                            value={newModality.color}
                            onChange={e => setNewModality({ ...newModality, color: e.target.value })}
                        >
                            <option value="blue">Blue</option>
                            <option value="indigo">Indigo</option>
                            <option value="green">Green</option>
                            <option value="red">Red</option>
                            <option value="yellow">Yellow</option>
                            <option value="purple">Purple</option>
                            <option value="gray">Gray</option>
                        </select>
                    </div>
                    <Button onClick={handleAdd} disabled={!newModality.name} className="bg-slate-800 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add
                    </Button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            {loading ? (
                <div className="text-center py-4 text-slate-400">Loading...</div>
            ) : (
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Code</th>
                            <th className="px-4 py-3 font-semibold">Description</th>
                            <th className="px-4 py-3 font-semibold">Color</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {modalities.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50 group">
                                <td className="px-4 py-3 font-bold text-slate-800">{m.name}</td>
                                <td className="px-4 py-3 text-slate-600">{m.description}</td>
                                <td className="px-4 py-3">
                                    <span className={cn("inline-block w-3 h-3 rounded-full", `bg-${m.color}-500`)}></span>
                                    <span className="ml-2 capitalize text-slate-500">{m.color}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleDelete(m.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {modalities.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-slate-400">No modalities found. Add one above.</td></tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}
