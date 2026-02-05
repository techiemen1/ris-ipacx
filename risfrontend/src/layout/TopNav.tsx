import { Link, useLocation } from "react-router-dom";
import { useRBAC } from "../context/RoleContext";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const tabs = [
  { label: "Dashboard", path: "/" },
  { label: "Patients", path: "/patients" },
  { label: "Schedule", path: "/schedule" },
  { label: "Orders", path: "/orders" },
  { label: "MWL", path: "/mwl" },
  { label: "PACS", path: "/pacs" },
  { label: "Reports", path: "/reports" },
  { label: "Billing", path: "/billing" },
  { label: "Settings", path: "/settings" },
  // { label: "Inventory", path: "/inventory" },
];

export default function TopNav() {
  const { user, logout } = useRBAC();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-200 border-b shadow-sm px-4 py-2 flex items-center h-[64px]">

      {/* Tabs */}
      <nav className="flex gap-2 overflow-x-auto">
        {tabs.map(t => (
          <Link
            key={t.path}
            to={t.path}
            className={`
              px-4 py-2 rounded-t-lg border text-sm font-medium
              ${loc.pathname === t.path || loc.pathname.startsWith(t.path)
                ? "bg-white border-gray-300 shadow-sm text-orange-600"
                : "bg-gray-100 border-gray-300 hover:bg-gray-50 text-gray-600"}
            `}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="ml-auto relative">
        <button
          className="px-4 py-2 bg-orange-500 text-white rounded flex items-center gap-1"
          onClick={() => setOpen(!open)}
        >
          {user.username}
          <ChevronDown size={16} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 bg-white shadow-md border rounded w-40">
            <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-gray-100">
              My Profile
            </Link>
            <Link to="/settings" className="block px-3 py-2 text-sm hover:bg-gray-100">
              Settings
            </Link>
            <button
              onClick={logout}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

