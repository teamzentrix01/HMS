import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({ children }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar user={session} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header user={session} />

        {/* Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-6 lg:p-8">
          <div className="max-w-[1500px] mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
