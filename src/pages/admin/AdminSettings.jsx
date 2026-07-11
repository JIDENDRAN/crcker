import { useState, useEffect } from 'react'
import { Save, Wifi, WifiOff, RefreshCw, MessageSquare, QrCode, CheckCircle } from 'lucide-react'
import QRCode from 'qrcode'

export default function AdminSettings({ API }) {
  const [settings, setSettings] = useState({ name: '', whatsapp: '', password: '' })
  const [waStatus, setWaStatus] = useState({ isConnected: false, qrCode: null })
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [pollingActive, setPollingActive] = useState(true)

  // Load settings
  useEffect(() => {
    fetch(`${API}/api/admin/settings`)
      .then(r => r.json())
      .then(data => setSettings({ name: data.name || '', whatsapp: data.whatsapp || '', password: '' }))
      .catch(() => {})
  }, [])

  // Poll WhatsApp status every 3 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/admin/whatsapp-status`)
        const data = await res.json()
        setWaStatus(data)

        if (data.qrCode) {
          const url = await QRCode.toDataURL(data.qrCode, { margin: 1, width: 200 })
          setQrDataUrl(url)
        } else {
          setQrDataUrl(null)
        }
      } catch {}
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2500)
      }
    } catch {
      alert('Failed to save settings.')
    }
    setSaving(false)
  }

  const handleReconnect = async () => {
    await fetch(`${API}/api/admin/whatsapp-reconnect`, { method: 'POST' })
  }

  const handleDisconnect = async () => {
    await fetch(`${API}/api/admin/whatsapp-disconnect`, { method: 'POST' })
  }

  const handleTest = async () => {
    const res = await fetch(`${API}/api/admin/whatsapp-test`, { method: 'POST' })
    const data = await res.json()
    alert(data.message || data.error)
  }

  return (
    <div className="admin-settings">
      {/* Admin Profile Settings */}
      <div className="settings-card">
        <h3 className="settings-card-title">Admin Profile</h3>
        <div className="settings-form-grid">
          <div className="admin-form-group">
            <label>Admin Username</label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
              placeholder="admin"
            />
          </div>
          <div className="admin-form-group">
            <label>WhatsApp Number (for notifications)</label>
            <input
              type="text"
              value={settings.whatsapp}
              onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}
              placeholder="10-digit mobile number (e.g. 9876543210)"
            />
          </div>
          <div className="admin-form-group">
            <label>New Password (leave blank to keep current)</label>
            <input
              type="password"
              value={settings.password}
              onChange={e => setSettings(s => ({ ...s, password: e.target.value }))}
              placeholder="Enter new password"
            />
          </div>
        </div>
        <button className="admin-primary-btn" onClick={handleSave} disabled={saving} style={{ marginTop: '20px' }}>
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saveSuccess && (
          <div className="save-success-alert">
            <CheckCircle size={16} /> Settings saved successfully!
          </div>
        )}
      </div>

      {/* WhatsApp Bot Settings */}
      <div className="settings-card">
        <h3 className="settings-card-title">
          <QrCode size={20} /> WhatsApp Notification Bot
        </h3>

        <div className="wa-status-row">
          <div className={`wa-status-indicator ${waStatus.isConnected ? 'connected' : 'disconnected'}`}>
            {waStatus.isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{waStatus.isConnected ? 'Connected & Active' : 'Not Connected'}</span>
          </div>
        </div>

        {!waStatus.isConnected && (
          <div className="wa-qr-section">
            <p className="wa-instructions">
              Scan the QR code below with your <strong>WhatsApp mobile app</strong> to connect the notification bot.
              Once connected, you'll receive instant WhatsApp alerts for every new customer order.
            </p>
            {qrDataUrl ? (
              <div className="qr-container">
                <img src={qrDataUrl} alt="WhatsApp QR Code" className="qr-image" />
                <p className="qr-refresh-hint">QR code refreshes automatically every 30 seconds.</p>
              </div>
            ) : (
              <div className="qr-waiting">
                <div className="qr-spinner" />
                <p>Waiting for QR code... Please start the backend server first.</p>
              </div>
            )}
          </div>
        )}

        <div className="wa-btn-group">
          <button className="admin-secondary-btn" onClick={handleReconnect}>
            <RefreshCw size={16} /> {waStatus.isConnected ? 'Reconnect (New QR)' : 'Generate QR Code'}
          </button>
          {waStatus.isConnected && (
            <>
              <button className="admin-success-btn" onClick={handleTest}>
                <MessageSquare size={16} /> Send Test Message
              </button>
              <button className="admin-danger-btn" onClick={handleDisconnect}>
                <WifiOff size={16} /> Disconnect Bot
              </button>
            </>
          )}
        </div>

        <div className="wa-info-box">
          <strong>How it works:</strong>
          <ul>
            <li>When a customer places an order, the bot automatically sends a WhatsApp message to your number above.</li>
            <li>The message includes customer name, phone, address, order items, and total amount.</li>
            <li>Make sure your backend server (<code>cracker-be/</code>) is running continuously for the bot to work.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
