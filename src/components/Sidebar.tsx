import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  UserRound,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Find Jobs", href: "/jobs", icon: Briefcase },
  { name: "Applications", href: "/applications", icon: FileText },
  { name: "Career Profile", href: "/career-profile", icon: UserRound },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Filters", href: "/filters", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="app-sidebar flex h-screen flex-col">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-2xl">
            <Briefcase className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold !text-white">Job Ranger</h1>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-5" aria-label="Primary navigation">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`sidebar-link group flex items-center rounded-2xl px-3 py-3 text-sm font-semibold !text-white/80 hover:!text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                isActive ? "sidebar-link-active !text-white" : ""
              }`}
            >
              <item.icon
                className={`sidebar-link-icon mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? "!text-white" : "!text-white/60 group-hover:!text-white"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-5 text-sm !text-white/70">
        <p className="font-semibold !text-white/90">Your search, without the spreadsheet circus</p>
        <p className="mt-2 leading-6 !text-white/70">
          Start with Career Profile, review promising jobs, then track what happens in Applications.
        </p>
      </div>
    </aside>
  );
}
