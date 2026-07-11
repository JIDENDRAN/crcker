import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Eye, X, ChevronDown } from 'lucide-react'

export default function AdminOrders({ API }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewOrder, setViewOrder] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API}/api/orders`)
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API}/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      fetchOrders()
      if (viewOrder?.id === id) {
        setViewOrder(o => ({ ...o, status }))
      }
    } catch {
      alert('Failed to update order.')
    }
  }

  const deleteOrder = async (id) => {
    try {
      await fetch(`${API}/api/orders/${id}`, { method: 'DELETE' })
      fetchOrders()
      if (viewOrder?.id === id) setViewOrder(null)
    } catch {
      alert('Failed to delete order.')
    }
    setDeleteConfirm(null)
  }

  const parseCart = (cartString) => {
    try { return JSON.parse(cartString) } catch { return [] }
  }

  const filtered = filterStatus === 'All' ? orders : orders.filter(o => o.status === filterStatus)

  if (loading) return <div className="admin-loading">Loading orders...</div>

  return (
    <div className="admin-orders">
      <div className="admin-page-header">
        <h2 className="section-heading">Customer Orders</h2>
        <div className="filter-tabs">
          {['All', 'Pending', 'Confirmed', 'Rejected'].map(s => (
            <button
              key={s}
              className={`filter-tab ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
              <span className="filter-count">
                {s === 'All' ? orders.length : orders.filter(o => o.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">No {filterStatus !== 'All' ? filterStatus.toLowerCase() + ' ' : ''}orders found.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>City</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td><strong>{o.customer_name}</strong></td>
                  <td>{o.customer_phone}</td>
                  <td>{o.city || '—'}</td>
                  <td><strong>₹{o.final_total}</strong></td>
                  <td>
                    <span className={`status-badge status-${o.status?.toLowerCase()}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="admin-icon-btn view" onClick={() => setViewOrder(o)} title="View Details">
                        <Eye size={15} />
                      </button>
                      {o.status === 'Pending' && (
                        <>
                          <button className="admin-icon-btn confirm" onClick={() => updateStatus(o.id, 'Confirmed')} title="Confirm">
                            <CheckCircle size={15} />
                          </button>
                          <button className="admin-icon-btn reject" onClick={() => updateStatus(o.id, 'Rejected')} title="Reject">
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      <button className="admin-icon-btn delete" onClick={() => setDeleteConfirm(o.id)} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete Order #{deleteConfirm}?</h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-btns">
              <button className="admin-secondary-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="admin-danger-btn" onClick={() => deleteOrder(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {viewOrder && (
        <div className="admin-modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="admin-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order #{viewOrder.id} Details</h3>
              <button className="modal-close-btn" onClick={() => setViewOrder(null)}><X size={18} /></button>
            </div>

            <div className="order-detail-grid">
              <div className="order-section">
                <h4>Customer Information</h4>
                <div className="detail-row"><span>Name</span><strong>{viewOrder.customer_name}</strong></div>
                <div className="detail-row"><span>Phone</span><strong>{viewOrder.customer_phone}</strong></div>
                <div className="detail-row"><span>WhatsApp</span><strong>{viewOrder.customer_whatsapp || 'Same as phone'}</strong></div>
                <div className="detail-row"><span>Email</span><strong>{viewOrder.customer_email || 'Not provided'}</strong></div>
              </div>

              <div className="order-section">
                <h4>Delivery Address</h4>
                <div className="detail-row"><span>Address</span><strong>{viewOrder.delivery_address}</strong></div>
                <div className="detail-row"><span>City</span><strong>{viewOrder.city || '—'}</strong></div>
                <div className="detail-row"><span>Pincode</span><strong>{viewOrder.pincode || '—'}</strong></div>
                <div className="detail-row"><span>Instructions</span><strong>{viewOrder.special_instructions || 'None'}</strong></div>
              </div>
            </div>

            <div className="order-section" style={{ marginTop: '20px' }}>
              <h4>Ordered Items</h4>
              {parseCart(viewOrder.cart_items).map((item, i) => (
                <div key={i} className="cart-item-row">
                  <span>{item.name}</span>
                  <span>× {item.qty}</span>
                  <span>₹{item.price} each</span>
                  <strong>₹{item.total}</strong>
                </div>
              ))}
              <div className="order-total-row">
                <span>MRP Total:</span> <s>₹{viewOrder.original_total}</s>
              </div>
              <div className="order-total-row savings">
                <span>Savings:</span> <span>-₹{viewOrder.total_savings}</span>
              </div>
              <div className="order-total-row final">
                <span>Net Payable:</span> <strong>₹{viewOrder.final_total}</strong>
              </div>
            </div>

            <div className="modal-footer">
              <span className={`status-badge status-${viewOrder.status?.toLowerCase()}`}>
                {viewOrder.status}
              </span>
              <div className="confirm-btns">
                {viewOrder.status === 'Pending' && (
                  <>
                    <button className="admin-success-btn" onClick={() => updateStatus(viewOrder.id, 'Confirmed')}>
                      <CheckCircle size={15} /> Confirm Order
                    </button>
                    <button className="admin-danger-btn" onClick={() => updateStatus(viewOrder.id, 'Rejected')}>
                      <XCircle size={15} /> Reject Order
                    </button>
                  </>
                )}
                {viewOrder.status !== 'Pending' && (
                  <button className="admin-secondary-btn" onClick={() => updateStatus(viewOrder.id, 'Pending')}>
                    Reset to Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
