// src/layout/Layout.tsx
import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function Layout() {
  return (
    <>
      {/* Single Top Navigation */}
      <TopNav />

      {/* Main content below fixed navbar */}
      <main className="pt-[68px] min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
          <Outlet />
        </div>
      </main>
    </>
  );
}

