import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Users, Plus, Trash2, Shield, UserPlus } from 'lucide-react';

export default function UserManagement() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            let finalEmail = email;
            if (!email.includes('@')) {
                finalEmail = `${email}@sga-ig.com`;
            }

            // We use signUp to create the user in Supabase Auth.
            // Note: for production, a proper server-side admin API call is better if we don't want the current user logged out.
            // To prevent logout, here we assume signUp functionality or we use a separate client if needed.
            // In Supabase v2, signUp from client does not always log out the current user, but sometimes it does.

            const { data, error } = await supabase.auth.signUp({
                email: finalEmail,
                password: password,
                options: {
                    data: {
                        role: 'admin'
                    }
                }
            });

            if (error) throw error;

            setMessage({ text: 'Usuário criado com sucesso!', type: 'success' });
            setEmail('');
            setPassword('');
        } catch (err: any) {
            setMessage({ text: err.message || 'Erro ao criar usuário', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
            <div className="p-4 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-400" />
                    <h2 className="text-sm font-semibold text-slate-900">Gerenciamento de Usuários</h2>
                </div>
            </div>
            <div className="p-6">
                <p className="text-sm text-slate-500 mb-6">
                    Crie novos usuários com perfil de administrador. Todos os usuários criados terão acesso total ao sistema.
                </p>

                {message.text && (
                    <div className={`p-4 rounded-lg text-sm mb-6 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleCreateUser} className="max-w-md space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Login ou Email
                        </label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none"
                            placeholder="ex: admin"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Senha (mínimo 6 caracteres)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 text-white rounded-lg py-3 text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <UserPlus className="w-4 h-4" />
                        {loading ? 'Criando usuário...' : 'Criar Usuário Administrador'}
                    </button>
                </form>
            </div>
        </div>
    );
}
