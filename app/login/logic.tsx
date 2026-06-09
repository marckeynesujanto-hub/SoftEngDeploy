// app/login/logic.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

export function useLoginLogic() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('users');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const columnName = role === 'drivers' ? 'driver_email' : 'user_email';

    const { data, error } = await supabase
      .from(role)
      .select('*')
      .eq(columnName, email)
      .single();

    setLoading(false);

    if (error || !data) {
      alert(`Email tidak ditemukan di kategori ${role === 'drivers' ? 'Driver' : 'User'} atau terjadi masalah koneksi!`);
      return;
    }

    const dbPassword = role === 'drivers' ? data.driver_password : data.user_password;

    if (dbPassword === password) {
      alert(`Login Berhasil! Selamat Datang di ThrashIn sebagai ${role === 'drivers' ? 'Driver' : 'User'}.`);

      const userId = role === 'drivers' ? data.driver_id : data.user_id;
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_session', JSON.stringify(data));
      localStorage.setItem('user_role', role);
      router.push('/home');


    } else {
      alert('Password salah! Silakan coba lagi.');
    }
  };

  return { email, setEmail, password, setPassword, role, setRole, loading, handleLogin, router };
}