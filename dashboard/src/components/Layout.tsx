import { Outlet, NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/page-detail', label: 'Page Details', icon: 'list_alt' },
  { path: '/performance', label: 'Performance', icon: 'insights' },
  { path: '/comparison', label: 'Comparison', icon: 'compare_arrows' },
  { path: '/behavior', label: 'Behavior', icon: 'psychology' },
];

export default function Layout() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ======== Sidebar ======== */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface flex flex-col py-6 border-r border-border z-50">
        {/* Logo */}
        <div className="px-6 mb-8">
          <h1 className="text-[22px] font-headline font-bold text-primary tracking-[-0.01em]">
            Monitor<span className="text-text-primary">Platform</span>
          </h1>
          <p className="text-[11px] text-text-muted mt-1 tracking-wider uppercase">
            Enterprise Monitoring
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 transition-colors duration-200 ${
                isActive(item.path)
                  ? 'text-primary font-semibold border-r-[3px] border-primary bg-primary-fixed/30'
                  : 'text-text-secondary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined mr-2 text-[20px]">{item.icon}</span>
              <span className="text-[12px] font-semibold tracking-[0.02em]">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-6 mt-auto space-y-4">
          <div className="p-3 bg-surface-container rounded-lg">
            <p className="text-[11px] font-semibold text-on-surface mb-1">
              Professional Tier
            </p>
            <button className="w-full py-2 bg-primary text-on-primary rounded-lg text-[12px] font-semibold hover:opacity-90 transition-all">
              Upgrade Plan
            </button>
          </div>
          <div className="pt-4 border-t border-border space-y-1">
            <a className="flex items-center py-1 text-text-secondary hover:text-primary transition-colors text-[12px] font-semibold" href="#">
              <span className="material-symbols-outlined mr-2 text-[18px]">settings</span>
              Settings
            </a>
            <a className="flex items-center py-1 text-text-secondary hover:text-primary transition-colors text-[12px] font-semibold" href="#">
              <span className="material-symbols-outlined mr-2 text-[18px]">help</span>
              Support
            </a>
          </div>
        </div>
      </aside>

      {/* ======== Main Area ======== */}
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 h-16 bg-surface/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-40">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-lg text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Search analytics..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-6">
            <a className="hidden md:block text-[12px] font-semibold text-text-secondary hover:text-primary transition-colors" href="#">Docs</a>
            <a className="hidden md:block text-[12px] font-semibold text-text-secondary hover:text-primary transition-colors" href="#">API</a>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-on-primary text-[14px] font-bold">A</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
