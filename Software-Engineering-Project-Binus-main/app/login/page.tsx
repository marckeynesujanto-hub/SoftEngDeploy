// app/login/page.tsx
'use client'
import { useLoginLogic } from './logic'

export default function LoginPage() {
  const { 
    email, setEmail, password, setPassword, role, setRole, loading, handleLogin, router 
  } = useLoginLogic();

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '100px auto', color: 'black', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center', color: '#1e293b' }}>Login ThrashIn ♻️</h2>
        
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Masuk Sebagai:</label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="users">User</option>
              <option value="drivers">Driver</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Masukkan email lu"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Masukkan password lu"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', width: '100%', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            {loading ? 'Mengecek Akun...' : 'Login Sekarang'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          Belum punya akun?{' '}
          <span 
            onClick={() => router.push('/register')} 
            style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            Daftar di sini
          </span>
        </p>
      </div>
    </div>
  )
}