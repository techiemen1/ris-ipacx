import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";

const WorklistPage: React.FC = () => {
  const [worklist, setWorklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorklist = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/worklist");
      setWorklist(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load worklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorklist();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Radiology Worklist
          </h1>
          <p className="text-sm text-gray-500 mt-1">Technician and Radiologist task list</p>
        </div>
        <Button onClick={loadWorklist} variant="outline" className="gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Patient</th>
              <th className="px-6 py-3 text-left">Modality</th>
              <th className="px-6 py-3 text-left">Study Date</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Assigned To</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading worklist...</td></tr>
            ) : worklist.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No pending worklist items.</td></tr>
            ) : (
              worklist.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.first_name} {item.last_name}</div>
                    <div className="text-xs text-gray-500 hidden md:block">UID: {item.study_instance_uid?.slice(-8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {item.modality}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {dayjs(item.study_date).format("MMM D, HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.assigned_to || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorklistPage;
