// app/register/logic.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';

export function useRegisterLogic() {
  const router = useRouter();
  const [role, setRole] = useState('users');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [platNomor, setPlatNomor] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let result;
    if (role === 'drivers') {
      result = await supabase.from('drivers').insert([{
        driver_name: name,
        driver_email: email,
        driver_password: password,
        driver_number: phone,
        plat_nomor: platNomor,
      }]);
    } else {
      result = await supabase.from('users').insert([{
        user_name: username,
        user_email: email,
        user_password: password,
        user_point: 0,
        user_phone: phone,
        fullname: name,
      }]);
    }

    setLoading(false);

    if (result.error) {
      alert(`Registration failed: ${result.error.message}`);
    } else {
      alert(`Registration successful sebagai ${role === 'drivers' ? 'Driver' : 'User'}!`);
      router.push('/login');
    }
  };

  return { 
    role, setRole, name, setName, email, setEmail, username, setUsername, 
    password, setPassword, phone, setPhone, platNomor, setPlatNomor, 
    loading, handleRegister, router 
  };
}