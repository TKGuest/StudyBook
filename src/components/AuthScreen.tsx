import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, User as UserIcon, BookOpen, GraduationCap, Flame, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuthScreen: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, setIsOfflineBypass } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'tutor' | 'creator'>('student');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ!');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải dài tối thiểu 6 ký tự!');
      setIsLoading(false);
      return;
    }

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Vui lòng nhập họ tên của bạn!');
          setIsLoading(false);
          return;
        }
        await signUp(email.trim(), password, name.trim(), role, '');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác. Hãy kiểm tra lại!');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Địa chỉ email này đã được sử dụng bởi tài khoản khác!');
      } else {
        setError(err.message || 'Có lỗi xảy ra trong quá trình xác thực. Hãy thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cửa sổ đăng nhập bằng Google đã bị đóng trước khi hoàn thành.');
      } else {
        setError('Không thể đăng nhập bằng Google. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <motion.div 
        id="auth-card" 
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 shadow-2xl relative overflow-hidden"
      >
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl"></div>

        {/* Brand Logo & Slogan */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-display text-3xl font-black text-white shadow-lg shadow-blue-500/40 animate-pulse mb-3">
            S
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            studybook
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">Mạng Xã Hội Học Tập Trực Tuyến Hàng Đầu</p>
        </div>

        {/* Title Tab Selector */}
        <div className="flex bg-slate-950/65 rounded-2xl p-1.5 mb-6 border border-slate-800/80">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${!isRegister ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${isRegister ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Đăng Ký
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="flex gap-2.5 items-start bg-red-950/30 border border-red-500/50 rounded-2xl p-3.5 mb-5 text-xs text-red-300 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            <p className="leading-relaxed font-semibold">{error}</p>
          </div>
        )}

        {/* Interactive Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <AnimatePresence initial={false}>
            {isRegister && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0, margin: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', margin: 'inherit', y: 0 }}
                exit={{ opacity: 0, height: 0, margin: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-4 overflow-hidden"
              >
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Họ và Tên</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required={isRegister}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>



                {/* Role Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Vai Trò Học Tập</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer"
                    >
                      <option value="student" className="bg-slate-900 text-white">Học Sinh / Sinh Viên</option>
                      <option value="tutor" className="bg-slate-900 text-white">Gia Sư / Giáo Viên</option>
                      <option value="creator" className="bg-slate-900 text-white">Nhà Sáng Tạo Tài Liệu</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email Address */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Địa chỉ Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenbanchon@gmail.com"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : isRegister ? (
              'Đăng Ký Học Viên Trực Tuyến'
            ) : (
              'Đăng Nhập StudyBook'
            )}
          </motion.button>
        </form>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <span className="relative bg-slate-900/90 px-3 text-[10px] uppercase font-bold text-slate-500">Hoặc tiếp tục với</span>
        </div>

        {/* Google Sign-In Mode */}
        <motion.button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-3 px-4 rounded-xl text-xs border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-55 disabled:cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
          </svg>
          Đăng nhập bằng tài khoản Google
        </motion.button>

        {/* Offline Mode Option */}
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 mb-2">Không kết nối được dịch vụ đám mây?</p>
          <button
            type="button"
            onClick={() => setIsOfflineBypass(true)}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer hover:underline"
          >
            Sử dụng Chế Độ Ngoại Tuyến (Offline Mode)
          </button>
        </div>

      </motion.div>
    </div>
  );
};
