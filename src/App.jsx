import { useState, useEffect, useMemo } from 'react'
import { Phone, ShoppingCart, Menu, ChevronUp, ChevronDown, Plus, Minus, X, FileText, MapPin, Mail, Send, Award, ShieldCheck, Truck, Percent, Gift, Check, Copy, User, PhoneCall, Home, CheckCircle2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function App() {
  const [cart, setCart] = useState({}) // { [productId]: quantity }
  const [expandedCategory, setExpandedCategory] = useState(1)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState('shop') // 'shop' | 'offers' | 'about' | 'contact'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // Contact Form State
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [formSubmitted, setFormSubmitted] = useState(false)

  // Copied Promo Code State
  const [copiedCode, setCopiedCode] = useState(null)

  // Checkout / Order State
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    try {
      const res = await fetch(`${API}/api/products`)
      const products = await res.json()
      const grouped = products.reduce((acc, product) => {
        const name = product.category || product.category_name || 'Others'
        let cat = acc.find(c=>c.name===name)
        if(!cat){cat={id:name,name,products:[],itemCount:0};acc.push(cat)}
        cat.products.push({...product,image:product.image?`${API}/${product.image}?t=${Date.now()}`:product.image})
        cat.itemCount=cat.products.length
        return acc
      },[])
      setCategories(grouped)
    } finally { setLoading(false)}
  }

  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_whatsapp: '',
    customer_email: '',
    delivery_address: '',
    city: '',
    pincode: '',
    special_instructions: ''
  })

  // Get flat list of all products for calculations
  const allProducts = useMemo(() => categories.flatMap(cat => cat.products), [categories])

  const handleUpdateQty = (productId, change) => {
    setCart(prev => {
      const currentQty = prev[productId] || 0
      const newQty = currentQty + change
      if (newQty <= 0) {
        const newCart = { ...prev }
        delete newCart[productId]
        return newCart
      }
      return { ...prev, [productId]: newQty }
    })
  }

  const toggleCategory = (id) => {
    setExpandedCategory(expandedCategory === id ? null : id)
  }

  const getProductQty = (productId) => cart[productId] || 0

  // Add Combo to Cart function
  const handleAddCombo = (productIds) => {
    setCart(prev => {
      const newCart = { ...prev }
      productIds.forEach(id => {
        newCart[id] = (newCart[id] || 0) + 1
      })
      return newCart
    })
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Calculate totals
  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0)
  
  const originalTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = allProducts.find(p => p.id === parseInt(id))
    return sum + (product ? product.originalPrice * qty : 0)
  }, 0)

  const finalTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = allProducts.find(p => p.id === parseInt(id))
    return sum + (product ? product.discountedPrice * qty : 0)
  }, 0)

  const totalSavings = originalTotal - finalTotal

  const generatePDF = () => {
    const doc = new jsPDF()
    const estimateNumber = 'EST-' + Math.floor(100000 + Math.random() * 900000)
    const dateStr = new Date().toLocaleDateString('en-IN')

    // 1. Header & Title Section
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(79, 70, 229) // Indigo
    doc.text('SIVAKASI SPARKLE CO.', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.setFont('helvetica', 'normal')
    doc.text('Premium Fireworks Wholesale & Retail', 14, 26)
    doc.text('123 Main Road, Sivakasi, Tamil Nadu - 626123', 14, 31)
    doc.text('Phone: +91 98765 43210 | Email: orders@sivakasisparkle.com', 14, 36)

    // 2. Divider Line
    doc.setDrawColor(79, 70, 229) // Indigo
    doc.setLineWidth(0.5)
    doc.line(14, 40, 196, 40)

    // 3. Invoice/Estimate Metadata
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50)
    doc.text(`Reference No: ${estimateNumber}`, 14, 48)
    doc.text(`Date: ${dateStr}`, 150, 48)

    // 4. Products Table
    const tableHeaders = [['S.No', 'Product Name', 'Original Price', 'Offer Price', 'Qty', 'Total Price']]
    const tableBody = Object.entries(cart).map(([id, qty], index) => {
      const product = allProducts.find(p => p.id === parseInt(id))
      return [
        index + 1,
        product ? product.name : 'Unknown Product',
        `Rs. ${product ? product.originalPrice : 0}`,
        `Rs. ${product ? product.discountedPrice : 0}`,
        qty,
        `Rs. ${product ? product.discountedPrice * qty : 0}`
      ]
    })

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' }, // Indigo background, white text
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 15 },
        5: { cellWidth: 30 }
      }
    })

    // 5. Totals & Calculations Block
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    
    doc.text(`Total Items:`, 120, finalY)
    doc.text(`${totalItems}`, 175, finalY, { align: 'right' })

    doc.text(`Original Value:`, 120, finalY + 6)
    doc.text(`Rs. ${originalTotal}`, 175, finalY + 6, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129) // Green for savings
    doc.text(`Total Discount Savings:`, 120, finalY + 12)
    doc.text(`- Rs. ${totalSavings}`, 175, finalY + 12, { align: 'right' })

    // Grand Total Background Highlight
    doc.setFillColor(243, 244, 246) // Light slate gray background
    doc.rect(118, finalY + 18, 78, 12, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(79, 70, 229) // Indigo text
    doc.text(`Net Payable Amount:`, 120, finalY + 26)
    doc.text(`Rs. ${finalTotal}`, 175, finalY + 26, { align: 'right' })

    // 6. Terms & Conditions Signature
    const termsY = finalY + 45
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120)
    doc.text('Terms & Conditions:', 14, termsY)
    doc.text('1. Prices are inclusive of tax, ex-Sivakasi factory rates.', 14, termsY + 5)
    doc.text('2. Delivery depends on state permissions and logistics.', 14, termsY + 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Authorized Signature', 150, termsY + 15)
    doc.setDrawColor(180)
    doc.line(140, termsY + 11, 190, termsY + 11)

    // Save File
    doc.save(`Sivakasi-Sparkle-Estimate-${estimateNumber}.pdf`)
  }

  const generateOrderPDF = (customerData) => {
    const doc = new jsPDF()
    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000)
    const dateStr = new Date().toLocaleDateString('en-IN')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(79, 70, 229)
    doc.text('SIVAKASI SPARKLE CO.', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text('Premium Fireworks | Direct Factory Sale', 14, 26)
    doc.text('123 Main Road, Sivakasi, Tamil Nadu - 626123', 14, 31)
    doc.text('Phone: +91 98765 43210 | Email: orders@sivakasisparkle.com', 14, 36)

    doc.setDrawColor(79, 70, 229)
    doc.setLineWidth(0.5)
    doc.line(14, 40, 196, 40)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(50)
    doc.setFontSize(10)
    doc.text(`Order No: ${orderNumber}`, 14, 48)
    doc.text(`Date: ${dateStr}`, 150, 48)

    // Customer section
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Details:', 14, 56)
    doc.setFont('helvetica', 'normal')
    doc.text(`Name: ${customerData.customer_name}`, 14, 62)
    doc.text(`Phone: ${customerData.customer_phone}  |  WhatsApp: ${customerData.customer_whatsapp || customerData.customer_phone}`, 14, 67)
    doc.text(`Email: ${customerData.customer_email || 'Not provided'}`, 14, 72)
    doc.text(`Address: ${customerData.delivery_address}, ${customerData.city} - ${customerData.pincode}`, 14, 77)
    if (customerData.special_instructions) {
      doc.text(`Instructions: ${customerData.special_instructions}`, 14, 82)
    }

    const tableHeaders = [['S.No', 'Product Name', 'MRP', 'Offer Price', 'Qty', 'Total']]
    const tableBody = Object.entries(cart).map(([id, qty], index) => {
      const product = allProducts.find(p => p.id === parseInt(id))
      return [index + 1, product?.name || 'Unknown', `₹${product?.originalPrice}`, `₹${product?.discountedPrice}`, qty, `₹${product ? product.discountedPrice * qty : 0}`]
    })

    autoTable(doc, {
      head: tableHeaders,
      body: tableBody,
      startY: customerData.special_instructions ? 90 : 85,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 }
    })

    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(80)
    doc.text(`Original Value:`, 120, finalY)
    doc.text(`₹${originalTotal}`, 175, finalY, { align: 'right' })
    doc.setTextColor(16, 185, 129)
    doc.setFont('helvetica', 'bold')
    doc.text(`Savings:`, 120, finalY + 6)
    doc.text(`-₹${totalSavings}`, 175, finalY + 6, { align: 'right' })
    doc.setFillColor(243, 244, 246)
    doc.rect(118, finalY + 12, 78, 12, 'F')
    doc.setFontSize(11)
    doc.setTextColor(79, 70, 229)
    doc.text(`Net Payable:`, 120, finalY + 20)
    doc.text(`₹${finalTotal}`, 175, finalY + 20, { align: 'right' })

    doc.save(`Sivakasi-Sparkle-Order-${orderNumber}.pdf`)
  }

  const placeOrder = async () => {
    const f = checkoutForm
    if (!f.customer_name || !f.customer_phone || !f.delivery_address) {
      alert('Please fill in Name, Phone, and Delivery Address.')
      return
    }
    setOrderPlacing(true)

    const cartItems = Object.entries(cart).map(([id, qty]) => {
      const product = allProducts.find(p => p.id === parseInt(id))
      return {
        id: parseInt(id),
        name: product?.name || 'Unknown',
        qty,
        price: product?.discountedPrice || 0,
        total: (product?.discountedPrice || 0) * qty
      }
    })

    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          cart_items: cartItems,
          original_total: originalTotal,
          final_total: finalTotal,
          total_savings: totalSavings
        })
      })

      if (res.ok) {
        generateOrderPDF(f)
        setOrderSuccess(true)
        setCart({})
        setTimeout(() => {
          setOrderSuccess(false)
          setShowCheckout(false)
          setIsCartOpen(false)
          setCheckoutForm({ customer_name: '', customer_phone: '', customer_whatsapp: '', customer_email: '', delivery_address: '', city: '', pincode: '', special_instructions: '' })
        }, 3500)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to place order. Please try again.')
      }
    } catch {
      // If backend is not available, still generate PDF locally
      generateOrderPDF(f)
      setOrderSuccess(true)
      setCart({})
      setTimeout(() => {
        setOrderSuccess(false)
        setShowCheckout(false)
        setIsCartOpen(false)
        setCheckoutForm({ customer_name: '', customer_phone: '', customer_whatsapp: '', customer_email: '', delivery_address: '', city: '', pincode: '', special_instructions: '' })
      }, 3500)
    }
    setOrderPlacing(false)
  }

  const handleContactSubmit = (e) => {
    e.preventDefault()
    setFormSubmitted(true)
    setTimeout(() => {
      setContactForm({ name: '', email: '', message: '' })
      setFormSubmitted(false)
    }, 3000)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  if (loading) return <div style={{padding:'2rem'}}>Loading products...</div>

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        {/* Mobile Hamburger menu */}
        <button className="menu-btn mobile-only" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={22} />
        </button>

        <div className="logo-section" onClick={() => setCurrentPage('shop')} style={{ cursor: 'pointer' }}>
          <div className="logo-circle">
            <span>S</span>
          </div>
          <div>
            <div className="brand-text">SIVAKASI SPARKLE CO.</div>
            <div className="brand-subtext">Premium Fireworks Online @ Factory Prices</div>
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="header-nav">
          <button className={`nav-link ${currentPage === 'shop' ? 'active' : ''}`} onClick={() => setCurrentPage('shop')}>Shop</button>
          <button className={`nav-link ${currentPage === 'offers' ? 'active' : ''}`} onClick={() => setCurrentPage('offers')}>Offers</button>
          <button className={`nav-link ${currentPage === 'about' ? 'active' : ''}`} onClick={() => setCurrentPage('about')}>About</button>
          <button className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`} onClick={() => setCurrentPage('contact')}>Contact</button>
          <a href="/admin" className="nav-link admin-nav-link" style={{ color: '#fbbf24', fontWeight: 'bold' }}>Admin Panel</a>
        </nav>

        <div className="header-actions">
          <button className="contact-btn" onClick={() => setCurrentPage('contact')}>
            <Phone size={14} /> Contact
          </button>
          <button className="icon-btn" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="cart-count-badge">{totalItems}</span>
            )}
          </button>
        </div>
      </header>

      {/* Pages Container */}
      <main className="page-content">
        
        {/* SHOP PAGE */}
        {currentPage === 'shop' && (
          <div className="shop-page animate-fade-in">
            {/* Promo Banner */}
            <div className="promo-banner">
              <div className="promo-title">Diwali Premium Booking 2026</div>
              <div className="promo-discount">Direct Sivakasi Factory Sale — Upto 90% Off</div>
              <div className="promo-text">Safe and certified green fireworks. All images are for packing references only. Brands may vary.</div>
            </div>
            <div className="promo-ticker">
              🔥 Booking open for limited slots! Secure your shipment today! 📦 🚛
            </div>

            {/* Categories */}
            {categories.map((cat) => (
              <div key={cat.id} className="category-container">
                <div className="category-header" onClick={() => toggleCategory(cat.id)}>
                  <span className="category-title">{cat.name}</span>
                  <div className="category-badge-group">
                    <span className="item-count">{cat.itemCount} items</span>
                  </div>
                </div>
                
                {expandedCategory === cat.id && (
                  <div className="category-content">
                    {cat.products.map(product => {
                      const qty = getProductQty(product.id)
                      return (
                        <div key={product.id} className="product-item">
                          <div className="product-details">
                            <div className="product-name">{product.name}</div>
                            <div className="product-tamil">{product.tamilName}</div>
                            <div className="product-pricing">
                              <span className="original-price">₹{product.originalPrice}</span>
                              <span className="discounted-price">₹{product.discountedPrice}</span>
                            </div>
                          </div>
                          <div className="product-action">
                            <img src={product.image} alt={product.name} className="product-image" />
                            <div className="action-container">
                              {qty === 0 ? (
                                <button 
                                  className="add-btn" 
                                  onClick={() => handleUpdateQty(product.id, 1)}
                                >
                                  ADD
                                </button>
                              ) : (
                                <div className="quantity-control">
                                  <button className="qty-btn" onClick={() => handleUpdateQty(product.id, -1)}>
                                    <Minus size={14} />
                                  </button>
                                  <span className="qty-value">{qty}</span>
                                  <button className="qty-btn" onClick={() => handleUpdateQty(product.id, 1)}>
                                    <Plus size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* RUNNING OFFERS PAGE */}
        {currentPage === 'offers' && (
          <div className="offers-page animate-fade-in">
            <div className="page-header">
              <h1>Current Active Offers</h1>
              <p>Exclusive deals, promo codes, and special combinations direct from Sivakasi factory.</p>
            </div>

            {/* Promo Codes */}
            <div className="offers-section">
              <h2>Running Promo Codes</h2>
              <div className="promo-grid">
                <div className="promo-card">
                  <div className="promo-icon-bg">
                    <Percent size={22} className="promo-card-icon" />
                  </div>
                  <div className="promo-details">
                    <h3>Extra 10% Off</h3>
                    <p>Apply on orders above ₹10,000 to get a flat 10% supplementary markdown.</p>
                    <div className="code-badge-container">
                      <span className="code-badge">WELCOME10</span>
                      <button className="copy-btn" onClick={() => handleCopyCode('WELCOME10')}>
                        {copiedCode === 'WELCOME10' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="promo-card">
                  <div className="promo-icon-bg">
                    <Truck size={22} className="promo-card-icon" />
                  </div>
                  <div className="promo-details">
                    <h3>Free Cargo Logistics</h3>
                    <p>Free transport hub delivery to TN, Karnataka & AP on orders above ₹15,000.</p>
                    <div className="code-badge-container">
                      <span className="code-badge">FREESHIP</span>
                      <button className="copy-btn" onClick={() => handleCopyCode('FREESHIP')}>
                        {copiedCode === 'FREESHIP' ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Special Combo Deals */}
            <div className="offers-section" style={{ marginTop: '40px' }}>
              <h2>Special Value Combos</h2>
              <div className="combo-grid">
                
                <div className="combo-card">
                  <Gift className="combo-icon" size={32} />
                  <div className="combo-body">
                    <h3>Sparkler Star Box Combo</h3>
                    <p>Get a neat assortment of sparklers. Includes 7cm Electric, 7cm Color, and 15cm Electric sparklers.</p>
                    <div className="combo-price-row">
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>₹1,400</span>
                      <span className="combo-price">₹14</span>
                    </div>
                    <button 
                      className="add-combo-btn" 
                      onClick={() => handleAddCombo([101, 102, 107])}
                    >
                      Add Combo to Cart
                    </button>
                  </div>
                </div>

                <div className="combo-card">
                  <Gift className="combo-icon" size={32} />
                  <div className="combo-body">
                    <h3>Spinning Ground Wheel Combo</h3>
                    <p>Add variety to your ground wheels. Includes Chakkar Big, Chakkar Special, and Green Ground Sparklers.</p>
                    <div className="combo-price-row">
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>₹1,170</span>
                      <span className="combo-price">₹82</span>
                    </div>
                    <button 
                      className="add-combo-btn" 
                      onClick={() => handleAddCombo([201, 202, 201])}
                    >
                      Add Combo to Cart
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ABOUT PAGE */}
        {currentPage === 'about' && (
          <div className="about-page animate-fade-in">
            <div className="page-header">
              <h1>About Sivakasi Sparkle Co.</h1>
              <p>Bringing Joy, Lights, and Unmatched Quality to Celebrations Across India.</p>
            </div>

            <div className="about-grid">
              <div className="about-card">
                <Award className="card-icon" size={32} />
                <h3>Legacy of Quality</h3>
                <p>Based in Sivakasi, the fireworks capital of India, we formulate premium grade crackers with strict compliance to safety standards.</p>
              </div>

              <div className="about-card">
                <ShieldCheck className="card-icon" size={32} />
                <h3>100% Certified Green Crackers</h3>
                <p>We are dedicated to sustainable celebrations. All our fireworks are low-emission green crackers certified by CSIR-NEERI.</p>
              </div>

              <div className="about-card">
                <Truck className="card-icon" size={32} />
                <h3>Direct Factory Delivery</h3>
                <p>By eliminating middle-men, we ship direct from our factory, providing up to 90% discount compared to retail store prices.</p>
              </div>
            </div>

            <div className="about-details-content">
              <h2>Safe & Vibrant Diwali Celebration</h2>
              <p>Sivakasi Sparkle Co. was established with the vision of offering high-quality sparklers, ground chakkars, flower pots, and sky shots at affordable prices. Over the years, we have served thousands of families and wholesale clients nationwide, ensuring secure packaging and on-time transit.</p>
              <blockquote>"Our mission is to light up your celebrations while prioritizing safety, environment, and value."</blockquote>
            </div>
          </div>
        )}

        {/* CONTACT PAGE */}
        {currentPage === 'contact' && (
          <div className="contact-page animate-fade-in">
            <div className="page-header">
              <h1>Contact Our Support</h1>
              <p>Got questions? We would love to hear from you. Get in touch with our team.</p>
            </div>

            <div className="contact-grid">
              {/* Contact Info */}
              <div className="contact-info">
                <h2>Factory Location & Support</h2>
                <p style={{ color: '#64748b', marginBottom: '30px' }}>Reach out to us directly or visit our office to check product demos.</p>
                
                <div className="info-item">
                  <MapPin className="info-icon" size={20} />
                  <div>
                    <h4>Address</h4>
                    <p>123 Main Road, Fireworks Industrial Area, Sivakasi, Tamil Nadu - 626123</p>
                  </div>
                </div>

                <div className="info-item">
                  <Phone className="info-icon" size={20} />
                  <div>
                    <h4>Call Support</h4>
                    <p>+91 98765 43210</p>
                  </div>
                </div>

                <div className="info-item">
                  <Mail className="info-icon" size={20} />
                  <div>
                    <h4>Email Address</h4>
                    <p>orders@sivakasisparkle.com</p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="contact-form-container">
                <h2>Send Us a Message</h2>
                {formSubmitted ? (
                  <div className="form-success-alert">
                    🎉 Thank you! Your message has been sent successfully. We will get back to you shortly.
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit}>
                    <div className="form-group">
                      <label htmlFor="name">Your Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        required 
                        value={contactForm.name} 
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input 
                        type="email" 
                        id="email" 
                        required 
                        value={contactForm.email} 
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="message">Message</label>
                      <textarea 
                        id="message" 
                        rows="5" 
                        required
                        value={contactForm.message} 
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      ></textarea>
                    </div>
                    <button type="submit" className="submit-btn">
                      <Send size={16} /> Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #f1f5f9', padding: '30px 20px', textAlign: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '13px' }}>
        <p>&copy; 2026 Sivakasi Sparkle Co. All rights reserved.</p>
        <p style={{ marginTop: '5px' }}>Factory Direct Sales | Green Fireworks CSIR-NEERI Approved</p>
      </footer>

      {/* Floating Action Buttons */}
      <div className="floating-whatsapp">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
        </svg>
      </div>

      {/* Cart Modal Overlay */}
      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <span className="cart-title">Shopping Cart ({totalItems} items)</span>
              <button className="icon-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-body">
              {totalItems === 0 ? (
                <div className="empty-cart-msg">
                  <p>Your cart is empty.</p>
                  <p style={{ fontSize: '13px', marginTop: '10px' }}>Add some premium fireworks to light up your festival!</p>
                </div>
              ) : (
                Object.entries(cart).map(([id, qty]) => {
                  const product = allProducts.find(p => p.id === parseInt(id))
                  if (!product) return null
                  return (
                    <div key={id} className="cart-item">
                      <div>
                        <div className="cart-item-name">{product.name}</div>
                        <div className="cart-item-details">
                          Rs. {product.discountedPrice} each | Qty: {qty}
                        </div>
                      </div>
                      <div className="cart-item-action">
                        <div className="quantity-control" style={{ width: '80px' }}>
                          <button className="qty-btn" style={{ padding: '4px 6px' }} onClick={() => handleUpdateQty(product.id, -1)}>
                            <Minus size={10} />
                          </button>
                          <span className="qty-value" style={{ fontSize: '12px' }}>{qty}</span>
                          <button className="qty-btn" style={{ padding: '4px 6px' }} onClick={() => handleUpdateQty(product.id, 1)}>
                            <Plus size={10} />
                          </button>
                        </div>
                        <span className="cart-item-total">
                          Rs. {product.discountedPrice * qty}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {totalItems > 0 && (
              <div className="cart-summary">
                <div className="summary-row">
                  <span>Gross Value:</span>
                  <span style={{ textDecoration: 'line-through', color: '#718096' }}>Rs. {originalTotal}</span>
                </div>
                <div className="summary-row" style={{ color: '#10b981', fontWeight: 'bold' }}>
                  <span>Offer Savings:</span>
                  <span>- Rs. {totalSavings}</span>
                </div>
                <div className="summary-total">
                  <span>Net Payable:</span>
                  <span>Rs. {finalTotal}</span>
                </div>
                
                <button className="checkout-btn" onClick={() => { setIsCartOpen(false); setShowCheckout(true) }}>
                  Download Estimate →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}>
          <div className="sidebar-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-header">
              <span className="sidebar-title">Sivakasi Sparkle Menu</span>
              <button className="icon-btn" onClick={() => setIsSidebarOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="sidebar-nav">
              <button 
                className={`sidebar-link ${currentPage === 'shop' ? 'active' : ''}`} 
                onClick={() => { setCurrentPage('shop'); setIsSidebarOpen(false); }}
              >
                Shop Catalog
              </button>
              <button 
                className={`sidebar-link ${currentPage === 'offers' ? 'active' : ''}`} 
                onClick={() => { setCurrentPage('offers'); setIsSidebarOpen(false); }}
              >
                Running Offers
              </button>
              <button 
                className={`sidebar-link ${currentPage === 'about' ? 'active' : ''}`} 
                onClick={() => { setCurrentPage('about'); setIsSidebarOpen(false); }}
              >
                About Us
              </button>
              <button 
                className={`sidebar-link ${currentPage === 'contact' ? 'active' : ''}`} 
                onClick={() => { setCurrentPage('contact'); setIsSidebarOpen(false); }}
              >
                Contact Support
              </button>
              <a 
                href="/admin" 
                className="sidebar-link" 
                style={{ color: '#fbbf24', fontWeight: 'bold' }}
              >
                Admin Panel
              </a>
            </nav>
          </div>
        </div>
      )}

      {/* Checkout / Order Form Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-modal" onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div className="order-success-screen">
                <CheckCircle2 size={56} className="order-success-icon" />
                <h2>Order Placed Successfully! 🎉</h2>
                <p>Your order has been received. A PDF confirmation has been downloaded.<br/>We will WhatsApp you shortly with details.</p>
              </div>
            ) : (
              <>
                <div className="cart-header">
                  <span className="cart-title">Enter Delivery Details</span>
                  <button className="icon-btn" onClick={() => setShowCheckout(false)}><X size={20} /></button>
                </div>
                <div className="checkout-form-body">
                  <div className="checkout-form-grid">
                    <div className="checkout-field">
                      <label><User size={13} /> Full Name *</label>
                      <input type="text" value={checkoutForm.customer_name} onChange={e => setCheckoutForm(f => ({...f, customer_name: e.target.value}))} placeholder="Your full name" required />
                    </div>
                    <div className="checkout-field">
                      <label><PhoneCall size={13} /> Mobile Number *</label>
                      <input type="tel" value={checkoutForm.customer_phone} onChange={e => setCheckoutForm(f => ({...f, customer_phone: e.target.value}))} placeholder="10-digit mobile number" required />
                    </div>
                    <div className="checkout-field">
                      <label><PhoneCall size={13} /> WhatsApp Number</label>
                      <input type="tel" value={checkoutForm.customer_whatsapp} onChange={e => setCheckoutForm(f => ({...f, customer_whatsapp: e.target.value}))} placeholder="If different from mobile" />
                    </div>
                    <div className="checkout-field">
                      <label><Mail size={13} /> Email Address</label>
                      <input type="email" value={checkoutForm.customer_email} onChange={e => setCheckoutForm(f => ({...f, customer_email: e.target.value}))} placeholder="your@email.com" />
                    </div>
                    <div className="checkout-field full">
                      <label><Home size={13} /> Delivery Address *</label>
                      <textarea rows={2} value={checkoutForm.delivery_address} onChange={e => setCheckoutForm(f => ({...f, delivery_address: e.target.value}))} placeholder="Door No., Street, Area..." required />
                    </div>
                    <div className="checkout-field">
                      <label><MapPin size={13} /> City / District *</label>
                      <input type="text" value={checkoutForm.city} onChange={e => setCheckoutForm(f => ({...f, city: e.target.value}))} placeholder="e.g. Virudhunagar" />
                    </div>
                    <div className="checkout-field">
                      <label>Pincode</label>
                      <input type="text" value={checkoutForm.pincode} onChange={e => setCheckoutForm(f => ({...f, pincode: e.target.value}))} placeholder="6-digit pincode" />
                    </div>
                    <div className="checkout-field full">
                      <label>Special Instructions (Optional)</label>
                      <textarea rows={2} value={checkoutForm.special_instructions} onChange={e => setCheckoutForm(f => ({...f, special_instructions: e.target.value}))} placeholder="Any specific packing, delivery, or timing instructions..." />
                    </div>
                  </div>

                  <div className="checkout-summary">
                    <div className="summary-row" style={{ color: '#10b981', fontWeight: '700' }}>
                      <span>Total Savings</span><span>-₹{totalSavings}</span>
                    </div>
                    <div className="summary-total">
                      <span>Net Payable</span><span>₹{finalTotal}</span>
                    </div>
                  </div>

                  <button className="checkout-submit-btn" onClick={placeOrder} disabled={orderPlacing}>
                    {orderPlacing ? 'Submitting...' : 'Submit'}
                  </button>
                  <p className="checkout-note">📥 A PDF order copy will be downloaded automatically. The admin will be notified via WhatsApp.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <button 
        className={`floating-cart-btn ${totalItems > 0 ? 'visible' : ''}`}
        onClick={() => setIsCartOpen(true)}
      >
        <div className="floating-cart-content">
          <ShoppingCart size={24} />
          <span className="floating-cart-label">View Cart</span>
          {totalItems > 0 && (
            <span className="floating-cart-badge">{totalItems}</span>
          )}
        </div>
      </button>
    </div>
  )
}

export default App
