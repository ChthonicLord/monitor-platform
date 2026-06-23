import { Outlet, NavLink, useLocation } from 'react-router-dom';

const navStyle: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#f5f6fa',
  },
  sidebar: {
    width: 220,
    background: '#1a1a2e',
    color: '#eee',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    flexShrink: 0,
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    padding: '0 20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 16,
    color: '#e94560',
  },
  navLink: (active: boolean): React.CSSProperties => ({
    display: 'block',
    padding: '10px 20px',
    color: active ? '#e94560' : '#ccc',
    textDecoration: 'none',
    fontSize: 14,
    borderLeft: active ? '3px solid #e94560' : '3px solid transparent',
    background: active ? 'rgba(233,69,96,0.08)' : 'transparent',
    transition: 'all 0.2s',
  }),
  main: {
    flex: 1,
    overflow: 'auto',
    padding: 24,
  },
  header: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 20,
    color: '#1a1a2e',
  },
};

const navItems = [
  { path: '/dashboard', label: '实时大盘' },
  { path: '/page-detail', label: '页面详情' },
  { path: '/performance', label: '性能趋势' },
  { path: '/comparison', label: '对比分析' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div style={navStyle.container}>
      <nav style={navStyle.sidebar}>
        <div style={navStyle.logo}>🔍 Monitor Platform</div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={navStyle.navLink(location.pathname === item.path)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main style={navStyle.main}>
        <Outlet />
      </main>
    </div>
  );
}
