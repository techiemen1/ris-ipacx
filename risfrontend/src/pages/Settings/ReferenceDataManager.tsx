import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Trash2, Plus } from "lucide-react";


export default function ReferenceDataManager() {
    const [departments, setDepartments] = useState<string[]>([]);
    const [designations, setDesignations] = useState<string[]>([]);
    const [newDept, setNewDept] = useState("");
    const [newDesig, setNewDesig] = useState("");
    // const [loading, setLoading] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        // setLoading(true);
        try {
            const r = await axiosInstance.get("/settings");
            const data = r.data?.data || {};
            setDepartments(data["hierarchy.departments"] || []);
            setDesignations(data["hierarchy.designations"] || []);
        } catch (err) {
            console.error("Failed to load reference data", err);
        } finally {
            // setLoading(false);
        }
    };

    const saveList = async (key: string, list: string[]) => {
        try {
            await axiosInstance.post("/settings", { key, value: list });
            load(); // refresh
        } catch (err) {
            alert("Failed to save. Check console.");
            console.error(err);
        }
    };

    // --- Department Handlers ---
    const addDept = () => {
        if (!newDept.trim()) return;
        if (departments.includes(newDept.trim())) {
            alert("Department already exists");
            return;
        }
        const updated = [...departments, newDept.trim()];
        saveList("hierarchy.departments", updated);
        setNewDept("");
    };

    const removeDept = (idx: number) => {
        if (!window.confirm("Remove this department? Users with this department set will not be changed, but it will disappear from dropdowns.")) return;
        const updated = departments.filter((_, i) => i !== idx);
        saveList("hierarchy.departments", updated);
    };

    // --- Designation Handlers ---
    const addDesig = () => {
        if (!newDesig.trim()) return;
        if (designations.includes(newDesig.trim())) {
            alert("Designation already exists");
            return;
        }
        const updated = [...designations, newDesig.trim()];
        saveList("hierarchy.designations", updated);
        setNewDesig("");
    };

    const removeDesig = (idx: number) => {
        if (!window.confirm("Remove this designation?")) return;
        const updated = designations.filter((_, i) => i !== idx);
        saveList("hierarchy.designations", updated);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reference Data (Dropdowns)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Departments Column */}
                    <div className="border p-4 rounded-md bg-white">
                        <h3 className="font-medium mb-3 text-lg">Departments</h3>
                        <div className="flex gap-2 mb-4">
                            <Input
                                value={newDept}
                                onChange={e => setNewDept(e.target.value)}
                                placeholder="New Department Name"
                                onKeyDown={e => e.key === 'Enter' && addDept()}
                            />
                            <Button onClick={addDept} variant="outline" className="h-10 w-10 p-2"><Plus className="w-4 h-4" /></Button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {departments.length === 0 && <p className="text-gray-400 text-sm italic">No departments defined.</p>}
                            {departments.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                    <span>{d}</span>
                                    <button onClick={() => removeDept(i)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Designations Column */}
                    <div className="border p-4 rounded-md bg-white">
                        <h3 className="font-medium mb-3 text-lg">Designations</h3>
                        <div className="flex gap-2 mb-4">
                            <Input
                                value={newDesig}
                                onChange={e => setNewDesig(e.target.value)}
                                placeholder="New Designation"
                                onKeyDown={e => e.key === 'Enter' && addDesig()}
                            />
                            <Button onClick={addDesig} variant="outline" className="h-10 w-10 p-2"><Plus className="w-4 h-4" /></Button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {designations.length === 0 && <p className="text-gray-400 text-sm italic">No designations defined.</p>}
                            {designations.map((d, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                    <span>{d}</span>
                                    <button onClick={() => removeDesig(i)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
