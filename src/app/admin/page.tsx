import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import AdminPanel from "@/components/AdminPanel";

export const metadata = {
  title: "Admin Dashboard - Spiritual Echoes",
};

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <div className="pt-8">
        <Suspense fallback={<div className="p-10 text-center font-bold text-slate-400">Loading module...</div>}>
          <AdminPanel />
        </Suspense>
      </div>
    </>
  );
}
