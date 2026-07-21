import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
    // State diubah menggunakan NIM
    const [nim, setNim] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const response = await api.post('/auth/login', { nim, password });
        
        // Simpan user data dan token di localStorage
        const user = response.data.user;
        const token = response.data.token;
        const role = user.role;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);

        // Navigasi berdasarkan role
        if (role === 'admin') {
            navigate('/admin');
        } else if (role === 'user') {
            navigate('/dashboard');
        } else {
            setError('Peran pengguna tidak dikenali. Silakan hubungi admin.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } catch (err: any) {
        setError(err.response?.data?.message || 'NIM atau Kata Sandi salah.');
        toast.error(err.response?.data?.message || 'NIM atau Kata Sandi salah.');
    } finally {
        setIsLoading(false);
    }
};

    return (
        <main className="flex min-h-screen w-full relative bg-slate-50 text-slate-900 font-sans overflow-hidden">
            {/* Bagian Kiri: Gambar & Kutipan */}
            <section className="hidden lg:flex w-[55%] relative flex-col justify-end p-10 overflow-hidden bg-slate-100">
                <div className="absolute inset-0 z-0">
                    <img 
                        alt="Modern Library Interior" 
                        className="w-full h-full object-cover opacity-90 object-center" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwM7dalXILxX4-wuvieopUjN2XUWa5lpnR7oeQyRt-y-DhM6z198Zg0Yd5yNNuXIECY5PPrn6EFg-neOsq_eDLAqz3iogel6HbJe8iA0F6xTgv-s1-g34DZyd7lyDgIXsM8f-XeHn54CIe15GFyIgF36-iq3wRvzcoQDaUXt4JFxKFdtQjSte3sjrmaKqzfRtRoGUAASHU7RXMsY6u4J_uXu8yGqGhJamKJBfrW1OrjD3sWHMGzF9_"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                </div>
                
                <div className="relative z-10 bg-white/70 backdrop-blur-md border border-slate-200/30 rounded-xl p-8 max-w-xl shadow-lg transform transition-transform hover:-translate-y-1 duration-300">
                    <p className="text-2xl font-semibold text-slate-900 mb-6 tracking-tight">
                        "Pencarian pengetahuan adalah perjalanan yang tanpa henti. Di sini, kejelasan bertemu dengan kedalaman."
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-slate-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">school</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Direktori RuangBaca</p>
                            <p className="text-sm text-slate-600">Jaringan Akademik Global</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Bagian Kanan: Formulir Login */}
            <section className="w-full lg:w-[45%] flex flex-col justify-center items-center p-6 md:p-10 bg-white z-10 shadow-2xl border-l border-slate-200">
                <div className="w-full max-w-md flex flex-col gap-8">
                    
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 mb-2">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <span className="material-symbols-outlined text-2xl">auto_awesome_mosaic</span>
                            </div>
                            <h1 className="text-3xl font-bold text-blue-600 tracking-tight">RuangBaca</h1>
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900">Akses Portal</h2>
                        <p className="text-base text-slate-500">Masukkan NIM Anda untuk melanjutkan.</p>
                    </div>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded text-sm">
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
                        <div className="flex flex-col gap-1.5">
                            {/* Label dan Tipe Input Diubah untuk NIM */}
                            <label className="text-sm font-semibold text-slate-600" htmlFor="nim">Nomor Induk Mahasiswa (NIM)</label>
                            <input 
                                type="text" 
                                id="nim" 
                                value={nim}
                                onChange={(e) => setNim(e.target.value)}
                                required
                                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                placeholder="Masukkan NIM Anda" 
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-600" htmlFor="password">Kata Sandi</label>
                            <input 
                                type="password" 
                                id="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                                placeholder="••••••••" 
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={`w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3.5 px-6 flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${isLoading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                        >
                            <span>{isLoading ? 'Memproses...' : 'Autentikasi Identitas'}</span>
                            {!isLoading && <span className="material-symbols-outlined text-xl">login</span>}
                        </button>
                    </form>


                </div>
            </section>
        </main>
    );
}