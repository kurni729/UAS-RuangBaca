import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPin } from '../services/api';
import toast from 'react-hot-toast';

interface LocationState {
    mfa_token: string;
    user: {
        id: number;
        nim: string;
        role: string;
    };
}

export default function PinVerificationPage() {
    const [pin, setPin] = useState<string[]>(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState;

    useEffect(() => {
        // Jika tidak ada mfa_token, redirect ke login
        if (!state?.mfa_token) {
            navigate('/');
        }
        // Fokus ke input pertama saat komponen dimuat
        inputRefs.current[0]?.focus();
    }, [navigate, state]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Hanya izinkan angka

        const newPin = [...pin];
        newPin[index] = value.slice(-1); // Ambil karakter terakhir
        setPin(newPin);

        // Auto fokus ke input berikutnya
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            // Fokus ke input sebelumnya saat backspace di input kosong
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const pinString = pin.join('');

        if (pinString.length !== 6) {
            setError('PIN harus 6 digit!');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const data = await verifyPin(state.mfa_token, pinString);

            // Simpan token dan user ke localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            toast.success('Verifikasi PIN berhasil!');

            // Redirect ke dashboard admin
            navigate('/admin');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Gagal memverifikasi PIN.';
            setError(errorMessage);
            toast.error(errorMessage);
            
            // Reset input
            setPin(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate('/');
    };

    return (
        <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl text-blue-600">lock</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Verifikasi PIN</h1>
                    <p className="text-slate-500 mt-2 text-center">
                        Masukkan 6 digit PIN Anda untuk melanjutkan
                    </p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex justify-between gap-2">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={isLoading}
                                className="w-12 h-16 text-center text-2xl font-bold bg-slate-50 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                autoComplete="one-time-code"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || pin.join('').length !== 6}
                        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Memverifikasi...
                            </>
                        ) : (
                            'Verifikasi PIN'
                        )}
                    </button>
                </form>

                <button
                    onClick={handleBackToLogin}
                    className="w-full mt-6 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                    Kembali ke Login
                </button>
            </div>
        </main>
    );
}
