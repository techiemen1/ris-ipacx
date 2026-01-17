import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { getModalityColors } from "../../utils/modalityColors";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  modality: string;
  created_at: string;
}

interface Modality {
  name: string;
  color: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", category: "Consumable", quantity: 0, unit_price: 0, modality: "ALL"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, modRes] = await Promise.all([
        axiosInstance.get("/inventory"),
        axiosInstance.get("/modalities")
      ]);
      setItems(invRes.data || []);
      setModalities(modRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    try {
      await axiosInstance.post("/inventory", newItem);
      setShowModal(false);
      setNewItem({ name: "", category: "Consumable", quantity: 0, unit_price: 0, modality: "ALL" });
      loadData();
    } catch (e) {
      alert("Failed to create item");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete item?")) return;
    try {
      await axiosInstance.delete(`/inventory/${id}`);
      loadData();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.modality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" /> Inventory Management
          </h1>
          <p className="text-slate-500 text-sm">Manage consumables and link them to modalities.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative w-full bg-slate-50/50">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search items..."
                className="pl-9 bg-slate-50"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
              <tr>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Modality</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-slate-500">{item.category}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold border",
                      item.modality === 'ALL'
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : cn(getModalityColors(item.modality).bg, getModalityColors(item.modality).text, getModalityColors(item.modality).border)
                    )}>
                      {item.modality}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">{item.quantity}</td>
                  <td className="px-6 py-4 font-mono text-slate-600">₹{item.unit_price}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-4">Add Inventory Item</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Item Name</label>
                  <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Contrast Dye" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                    <select
                      className="w-full border rounded h-9 px-2 text-sm"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      <option>Consumable</option>
                      <option>Equipment</option>
                      <option>Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Modality Link</label>
                    <select
                      className="w-full border rounded h-9 px-2 text-sm font-semibold"
                      value={newItem.modality}
                      onChange={e => setNewItem({ ...newItem, modality: e.target.value })}
                    >
                      <option value="ALL">ALL (General)</option>
                      {modalities.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Quantity</label>
                    <Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Unit Price (₹)</label>
                    <Input type="number" step="0.01" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button onClick={handleCreate} className="bg-slate-800 text-white">Save Item</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
