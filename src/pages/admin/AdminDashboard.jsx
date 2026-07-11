import { useState, useEffect } from 'react'
import { ShoppingBag, Package, CheckCircle, Clock, TrendingUp, IndianRupee } from 'lucide-react'

export default function AdminDashboard({ API }) {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/orders`).then(r => r.json()),
      fetch(`${API}/api/products`).then(r => r.json())
    ]).then(([ordersData, productsData]) => {
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalRevenue = orders
    .filter(o => o.status === 'Confirmed')
    .reduce((sum, o) => sum + (o.final_total || 0), 0)

  const pending = orders.filter(o => o.status === 'Pending').length
  const confirmed = orders.filter(o => o.status === 'Confirmed').length

  const stats = [
    { label: 'Total Orders', value: orders.length, icon: ShoppingBag, color: '#4f46e5' },
    { label: 'Pending Orders', value: pending, icon: Clock, color: '#f59e0b' },
    { label: 'Confirmed Orders', value: confirmed, icon: CheckCircle, color: '#10b981' },
    { label: 'Total Products', value: products.length, icon: Package, color: '#8b5cf6' },
    { label: 'Confirmed Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: '#ec4899' },
  ]

  const recentOrders = orders.slice(0, 5)

  if (loading) return <div className="admin-loading">Loading dashboard...</div>

  return (
    <div className="admin-dashboard">
      <div className="dashboard-stats">
        {stats.map((stat, i) => (
          <div className="stat-card" key={i} style={{ '--stat-color': stat.color }}>
            <div className="stat-icon-wrap">
              <stat.icon size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-recent">
        <h2 className="section-heading">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <div className="admin-empty">No orders yet. Orders placed by customers will appear here.</div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.customer_phone}</td>
                    <td>₹{o.final_total}</td>
                    <td>
                      <span className={`status-badge status-${o.status?.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
