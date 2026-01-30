
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './ui/Button';
import { XIcon, BoltIcon, GoogleIcon, EyeIcon, EyeOffIcon } from './ui/Icons';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultMode?: 'login' | 'signup' | 'forgot_password' | 'update_password';
    onGuestLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login', onGuestLogin }) => {
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password' | 'update_password'>(defaultMode);
    const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
    
    // Auth Fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Metadata Fields
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [role, setRole] = useState(''); // Job Title or Profession
    const [companySize, setCompanySize] = useState('1-10');
    const [useCase, setUseCase] = useState('analysis');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Sync internal state if prop changes
    useEffect(() => {
        setMode(defaultMode);
        setError(null);
        setSuccessMessage(null);
        setShowPassword(false);
    }, [defaultMode, isOpen]);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    // queryParams removed to prevent 403 errors if offline access is not configured correctly
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Failed to initialize Google Sign-In');
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'signup') {
                // Construct metadata based on account type
                const metaData: any = {
                    full_name: fullName,
                    account_type: accountType,
                    role: role,
                    use_case: useCase,
                };

                if (accountType === 'company') {
                    metaData.company_name = companyName;
                    metaData.company_size = companySize;
                }

                // 1. Sign up user with metadata
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: metaData
                    }
                });

                if (authError) throw authError;

                // 2. Insert into 'profiles' table
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([
                            {
                                id: authData.user.id,
                                email: email,
                                full_name: fullName,
                                account_type: accountType,
                                role: role,
                                use_case: useCase,
                                company_name: accountType === 'company' ? companyName : null,
                                company_size: accountType === 'company' ? companySize : null,
                                created_at: new Date().toISOString()
                            }
                        ]);

                    if (profileError) {
                        console.warn("Profile creation warning:", profileError.message);
                    }
                }

                alert("Account created! Please check your email to verify.");
                setMode('login');

            } else if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();

            } else if (mode === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin,
                });
                if (error) throw error;
                setSuccessMessage("Password reset link sent to your email.");

            } else if (mode === 'update_password') {
                const { error } = await supabase.auth.updateUser({ password: password });
                if (error) throw error;
                alert("Password updated successfully!");
                onClose();
            }

        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const getTitle = () => {
        switch (mode) {
            case 'login': return 'Welcome Back';
            case 'signup': return 'Create Account';
            case 'forgot_password': return 'Reset Password';
            case 'update_password': return 'Set New Password';
            default: return 'Authentication';
        }
    };

    const getDescription = () => {
        switch (mode) {
            case 'login': return 'Access your intelligent workspace.';
            case 'signup': return 'Tell us about yourself to personalize Dataline.';
            case 'forgot_password': return 'Enter your email to receive a reset link.';
            case 'update_password': return 'Enter your new password below.';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up duration-200">
            <div className="bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative backdrop-blur-xl flex flex-col max-h-[90vh]">
                
                {/* Header / Tabs - Only show for Login/Signup */}
                {['login', 'signup'].includes(mode) && (
                    <div className="flex border-b border-white/10 shrink-0">
                        <button 
                            onClick={() => setMode('login')}
                            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${mode === 'login' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Log In
                            {mode === 'login' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>}
                        </button>
                        <button 
                            onClick={() => setMode('signup')}
                            className={`flex-1 py-4 text-sm font-medium transition-colors relative ${mode === 'signup' ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Sign Up
                            {mode === 'signup' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500"></div>}
                        </button>
                    </div>
                )}

                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <div className="p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                            <BoltIcon className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                            {getTitle()}
                        </h2>
                        <p className="text-gray-400 text-sm mt-2">
                            {getDescription()}
                        </p>
                    </div>

                    {/* Account Type Toggle (Only for Signup) */}
                    {mode === 'signup' && (
                        <div className="flex bg-black/40 p-1 rounded-lg mb-6 border border-white/5">
                            <button 
                                onClick={() => setAccountType('individual')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${accountType === 'individual' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Individual
                            </button>
                            <button 
                                onClick={() => setAccountType('company')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${accountType === 'company' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Company
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Additional Fields for Signup */}
                        {mode === 'signup' && (
                            <div className="space-y-4 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Full Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                        placeholder="John Doe"
                                    />
                                </div>

                                {accountType === 'company' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Company Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                                placeholder="Acme Inc."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Job Title</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={role}
                                                    onChange={(e) => setRole(e.target.value)}
                                                    className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                                    placeholder="Data Analyst"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Company Size</label>
                                                <select 
                                                    value={companySize}
                                                    onChange={(e) => setCompanySize(e.target.value)}
                                                    className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                >
                                                    <option value="1-10">1-10</option>
                                                    <option value="11-50">11-50</option>
                                                    <option value="51-200">51-200</option>
                                                    <option value="200+">200+</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {accountType === 'individual' && (
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Current Role</label>
                                        <select 
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        >
                                            <option value="" disabled>Select your role...</option>
                                            <option value="Student">Student</option>
                                            <option value="Freelancer">Freelancer</option>
                                            <option value="Researcher">Researcher</option>
                                            <option value="Hobbyist">Hobbyist</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Primary Use Case</label>
                                    <select 
                                        value={useCase}
                                        onChange={(e) => setUseCase(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="analysis">Data Analysis & Visualization</option>
                                        <option value="ml">Building ML Models</option>
                                        <option value="learning">Learning Data Science</option>
                                        <option value="reporting">Business Reporting</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Fields for Login/Signup/Forgot/Update */}
                        
                        {mode !== 'update_password' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">Email</label>
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                    placeholder="you@example.com"
                                />
                            </div>
                        )}

                        {mode !== 'forgot_password' && (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
                                        {mode === 'update_password' ? 'New Password' : 'Password'}
                                    </label>
                                    {mode === 'login' && (
                                        <button 
                                            type="button"
                                            onClick={() => setMode('forgot_password')}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 pr-10 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
                                {successMessage}
                            </div>
                        )}

                        <Button type="submit" isLoading={isLoading} className="w-full py-3 text-base shadow-lg shadow-indigo-500/20">
                            {mode === 'login' ? 'Sign In' : 
                             mode === 'signup' ? 'Create Account' : 
                             mode === 'forgot_password' ? 'Send Reset Link' : 
                             'Update Password'}
                        </Button>

                        {mode === 'forgot_password' && (
                            <button 
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-sm text-gray-400 hover:text-white transition-colors mt-2"
                            >
                                Back to Login
                            </button>
                        )}
                    </form>

                    {/* Divider & Social Login */}
                    {['login', 'signup'].includes(mode) && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-900 text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <Button 
                                type="button"
                                variant="secondary"
                                onClick={handleGoogleLogin}
                                className="w-full py-3 text-base bg-white text-gray-900 hover:bg-gray-100 flex items-center justify-center gap-3 font-semibold mb-3 border-none"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                Google
                            </Button>

                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={onGuestLogin} 
                                className="w-full py-3 text-base bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300"
                            >
                                Continue as Guest
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
