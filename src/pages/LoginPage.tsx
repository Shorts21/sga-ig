import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, HelpCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Allow using username as email suffix (e.g. admin -> admin@sga-ig.com)
            // but let's just attempt email authentication
            let loginEmail = email;
            if (!email.includes('@')) {
                loginEmail = `${email}@sga-ig.com`;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail,
                password: password,
            });

            if (error) throw error;

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-32 bg-gray-900 overflow-hidden">
            {/* Background Video */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
            >
                <source src="https://aynqhizuumdqicenaogx.supabase.co/storage/v1/object/public/background/background.mp4" type="video/mp4" />
                Seu navegador não suporta vídeos HTML5.
            </video>

            {/* Glassmorphism Login Container */}
            <div className="relative z-10 w-full max-w-md p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-wider mb-2">AgriControl</h1>
                    <p className="text-gray-200 text-sm">Identifique-se para acessar o sistema.</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-xl mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">
                            Email / Login
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <HelpCircle className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Informe seu email ou login"
                                className="block w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">
                            Senha
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Shield className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="block w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transform transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <HelpCircle className="h-5 w-5" />
                        <span>{loading ? 'ACESSANDO...' : 'ENTRAR NO SISTEMA'}</span>
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-blue-400 font-bold text-xs tracking-widest uppercase mb-2">Acesso Corporativo</p>
                    <p className="text-gray-300 text-xs">Desenvolvido pelo Departamento de Tecnologia - Ibicoara - BA</p>
                </div>
            </div>
        </div>
    );
}
