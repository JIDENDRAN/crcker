import { useState, useEffect } from 'react'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, Flame } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem('admin_logged_in'))
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogin = () => {
    sessionStorage.setItem('admin_logged_in', 'true')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged_in')
    setIsLoggedIn(false)
    setActivePage('dashboard')
  }

  if (!isLoggedIn) {
    return <AdminLogin API={API} onLogin={handleLogin} />
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdminDashboard API={API} />
      case 'products': return <AdminProducts API={API} />
      case 'orders': return <AdminOrders API={API} />
      case 'settings': return <AdminSettings API={API} />
      default: return <AdminDashboard API={API} />
    }
  }

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Flame size={22} className="sidebar-logo-icon" />
          <div>
            <div className="sidebar-brand">Sivakasi Sparkle</div>
            <div className="sidebar-brand-sub">Admin Panel</div>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => { setActivePage(item.id); setSidebarOpen(false) }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <button className="admin-hamburger" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <h1 className="admin-page-title">
            {navItems.find(n => n.id === activePage)?.label || 'Dashboard'}
          </h1>
          <div className="admin-topbar-right">
            <div className="admin-user-badge">Admin</div>
          </div>
        </header>

        <main className="admin-content">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
