import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, X, Save, Image } from 'lucide-react'

const CATEGORIES = ['Sparklers', 'Ground Chakkars', 'Flower Pots', 'Sky Shots', 'Bombs', 'Fancy Items', 'General']

const emptyForm = { name: '', tamil_name: '', category: 'Sparklers', original_price: '', discounted_price: '', image_url: '' }

const getFallbackProductImage = (name = '', category = '') => {
  const lowercaseName = name.toLowerCase();
  const lowercaseCategory = category.toLowerCase();

  if (lowercaseName.includes('sparkler') || lowercaseName.includes('kambi') || lowercaseCategory.includes('sparkler')) {
    return 'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?w=400&auto=format&fit=crop&q=60';
  }
  if (lowercaseName.includes('chakkar') || lowercaseName.includes('wheel') || lowercaseCategory.includes('chakkar') || lowercaseCategory.includes('wheel')) {
    return 'https://images.unsplash.com/photo-1607513746994-51f730a44832?w=400&auto=format&fit=crop&q=60';
  }
  if (lowercaseName.includes('pot') || lowercaseName.includes('flower') || lowercaseCategory.includes('pot') || lowercaseCategory.includes('flower')) {
    return 'https://images.unsplash.com/photo-1547841243-eacb14453cd9?w=400&auto=format&fit=crop&q=60';
  }
  if (lowercaseName.includes('rocket') || lowercaseName.includes('sky') || lowercaseCategory.includes('rocket') || lowercaseCategory.includes('sky')) {
    return 'https://images.unsplash.com/photo-1533230408708-8f9f91d1235a?w=400&auto=format&fit=crop&q=60';
  }
  if (lowercaseName.includes('bomb') || lowercaseName.includes('sound') || lowercaseName.includes('crack') || lowercaseCategory.includes('bomb') || lowercaseCategory.includes('sound') || lowercaseCategory.includes('crack')) {
    return 'https://images.unsplash.com/photo-1498855926480-d98e83099315?w=400&auto=format&fit=crop&q=60';
  }
  if (lowercaseName.includes('fountain') || lowercaseName.includes('color') || lowercaseCategory.includes('fountain')) {
    return 'https://images.unsplash.com/photo-1507908708419-7799e05c8bbc?w=400&auto=format&fit=crop&q=60';
  }
  return 'https://images.unsplash.com/photo-1507502707541-f369a3b18502?w=400&auto=format&fit=crop&q=60';
};

export default function AdminProducts({ API }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API}/api/products`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const openEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      tamil_name: product.tamil_name || '',
      category: product.category || 'Sparklers',
      original_price: product.original_price,
      discounted_price: product.discounted_price,
      image_url: product.image_url || ''
    })
    setShowForm(true)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Limit to ~2MB to prevent blowing up the database size
    if (file.size > 2 * 1024 * 1024) {
      alert('Image is too large. Please upload an image smaller than 2MB.')
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(f => ({ ...f, image_url: reader.result }))
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      alert('Image processing failed.')
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.original_price || !form.discounted_price) {
      alert('Please fill in Name, Original Price, and Discounted Price.')
      return
    }
    setSaving(true)
    try {
      const url = editingId ? `${API}/api/products/${editingId}` : `${API}/api/products`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          original_price: parseFloat(form.original_price),
          discounted_price: parseFloat(form.discounted_price)
        })
      })
      if (res.ok) {
        setShowForm(false)
        fetchProducts()
      } else {
        alert('Failed to save product.')
      }
    } catch {
      alert('Error saving product.')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/api/products/${id}`, { method: 'DELETE' })
      fetchProducts()
    } catch {
      alert('Delete failed.')
    }
    setDeleteConfirm(null)
  }

  if (loading) return <div className="admin-loading">Loading products...</div>

  return (
    <div className="admin-products">
      <div className="admin-page-header">
        <h2 className="section-heading">Product Catalog</h2>
        <button className="admin-primary-btn" onClick={openAdd}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="admin-empty">No products yet. Click "Add Product" to get started.</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Image</th>
                <th>Name</th>
                <th>Tamil Name</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Offer Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td data-label="ID">{p.id}</td>
                  <td>
                    <img 
                      src={p.image_url && p.image_url.trim() !== '' ? p.image_url : getFallbackProductImage(p.name, p.category)} 
                      alt={p.name} 
                      className="product-thumb" 
                    />
                  </td>
                  <td data-label="Name"><strong>{p.name}</strong></td>
                  <td data-label="Tamil Name">{p.tamil_name || '—'}</td>
                  <td data-label="Category"><span className="category-tag">{p.category}</span></td>
                  <td data-label="MRP"><s>₹{p.original_price}</s></td>
                  <td data-label="Offer Price"><span className="price-green">₹{p.discounted_price}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="admin-icon-btn edit" onClick={() => openEdit(p)} title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button className="admin-icon-btn delete" onClick={() => setDeleteConfirm(p.id)} title="Delete">
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
            <h3>Delete Product?</h3>
            <p>This action cannot be undone.</p>
            <div className="confirm-btns">
              <button className="admin-secondary-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="admin-danger-btn" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="modal-close-btn" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>

            <div className="form-grid">
              <div className="admin-form-group">
                <label>Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 7cm Electric Sparkler" />
              </div>
              <div className="admin-form-group">
                <label>Tamil Name</label>
                <input type="text" value={form.tamil_name} onChange={e => setForm(f => ({ ...f, tamil_name: e.target.value }))} placeholder="e.g. மின் தீப்பொறி" />
              </div>
              <div className="admin-form-group">
                <label>Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label>MRP (₹) *</label>
                <input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: e.target.value }))} placeholder="150" />
              </div>
              <div className="admin-form-group">
                <label>Offer Price (₹) *</label>
                <input type="number" value={form.discounted_price} onChange={e => setForm(f => ({ ...f, discounted_price: e.target.value }))} placeholder="8" />
              </div>
              <div className="admin-form-group full-width">
                <label>Product Image</label>
                <div className="image-upload-area">
                  {form.image_url ? (
                    <div className="image-preview-container">
                      <img src={form.image_url} alt="Preview" className="image-preview" />
                      <button className="remove-image-btn" onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="upload-trigger-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload size={20} />
                      <span>{uploading ? 'Uploading...' : 'Click to Upload Image'}</span>
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="admin-secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="admin-primary-btn" onClick={handleSave} disabled={saving}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
