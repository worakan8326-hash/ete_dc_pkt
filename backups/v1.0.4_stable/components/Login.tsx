import { useState, type FormEvent } from 'react';
import { login } from '../api';
import type { User } from '../types';
import developerLogo from '../assets/hero.png';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // 1. Get Device Info (IP & UserAgent)
      let ip = 'Unknown';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) { console.error("IP Fetch Error", e); }

      const ua = navigator.userAgent;

      // 2. Try to get Location (Non-blocking)
      let loc = 'Not Allowed';
      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });

      try {
        const pos = await getPosition();
        loc = `${pos.coords.latitude},${pos.coords.longitude}`;
      } catch (e) { console.warn("Location Access Denied or Timeout"); }

      const deviceInfo = { ip, loc, ua };

      // 3. Login with Device Info
      const res = await login(username, password, deviceInfo);
      if (res.status === 'success' && res.user) {
        onLogin(res.user);
      } else {
        setError(res.message || 'รหัสผ่านหรือชื่อผู้ใช้ไม่ถูกต้อง');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-surface to-surface overflow-hidden">
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 lg:p-12 relative overflow-hidden border border-white/50">
          {/* Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="flex flex-col items-center mb-10">
            {/* LOGO WITH SCI-MAGIC EFFECT (MOVED TOP) */}
            <div className="relative group cursor-pointer mb-6">
              {/* Particles Container (Pointer Events None is CRITICAL for mobile focus) */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                {[...Array(16)].map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary/40 backdrop-blur-sm border border-white/40 animate-polygon-burst" 
                    style={{ 
                      '--rot': `${i * 22.5}deg`,
                      '--dist': `${60 + Math.random() * 40}px`,
                      '--scale': `${0.5 + Math.random()}`,
                      animationDelay: `${Math.random() * 3}s`,
                      clipPath: i % 2 === 0 ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
                    } as any}
                  />
                ))}
              </div>

              <div className="relative z-10 w-24 h-24 rounded-full overflow-hidden transition-all duration-500 transform group-hover:scale-110 scale-100 flex items-center justify-center bg-white shadow-xl shadow-primary/10">
                <img 
                  src={developerLogo} 
                  alt="Developer" 
                  className="w-full h-full object-contain p-2 scale-[0.85] transition-all duration-500 group-hover:scale-100 group-hover:brightness-110" 
                />
                {/* Light Sweep Effect */}
                <div className="absolute inset-0 bg-white/30 skew-x-[-25deg] -translate-x-full group-hover:animate-shine-sweep pointer-events-none opacity-50"></div>
                <div className="absolute inset-0 bg-white/10 skew-x-[-25deg] -translate-x-full animate-shine-pulse pointer-events-none"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tighter mb-1">ยินดีต้อนรับสู่ระบบ</h1>
            <p className="text-[12px] font-semibold text-primary uppercase tracking-[0.2em] opacity-80">ETE DCPK MANAGER - SUPPORT</p>
          </div>

          {error && (
            <div className="bg-error/10 text-error text-xs font-black p-4 rounded-2xl mb-8 border border-error/10 animate-shake flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[12px] font-semibold text-outline mb-2 ml-2 uppercase tracking-widest">ชื่อผู้ใช้ (Username)</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors">person</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-base font-medium text-on-surface focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="กรุณากรอกชื่อผู้ใช้..."
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-outline mb-2 ml-2 uppercase tracking-widest">รหัสผ่าน (Password)</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors">lock</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-2xl py-4 pl-12 pr-4 text-base font-medium text-on-surface focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  placeholder="กรุณากรอกรหัสผ่าน..."
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-2xl transition-all text-[14px] flex items-center justify-center ${
                loading ? 'bg-slate-300/80 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-secondary active:scale-[0.98] shadow-primary/30'
              }`}
            >
              {loading ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  เข้าสู่ระบบ
                  <span className="material-symbols-outlined font-black">login</span>
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/40 border border-white/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] hover:bg-white/60 group cursor-default">
              <div className="flex -space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-secondary/40 animate-pulse delay-75"></div>
              </div>
              <span className="text-[10px] font-bold text-outline/50 tracking-[0.15em] uppercase transition-colors">
                พัฒนาโดย <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-black tracking-widest">ทีม เอเต้ ดีชี ภูเก็ต</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes polygon-burst {
          0% { transform: rotate(var(--rot)) translate(0) scale(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: rotate(var(--rot)) translate(var(--dist)) scale(var(--scale)) rotate(180deg); opacity: 0; }
        }
        @keyframes shine-sweep {
          0% { transform: translateX(-150%) skewX(-25deg); }
          100% { transform: translateX(250%) skewX(-25deg); }
        }
        @keyframes shine-pulse {
          0%, 100% { transform: translateX(-200%) skewX(-25deg); }
          30%, 60% { transform: translateX(300%) skewX(-25deg); }
        }
        .animate-polygon-burst {
          animation: polygon-burst 3s cubic-bezier(0.12, 0, 0.39, 0) infinite;
        }
        .animate-shine-sweep {
          animation: shine-sweep 1s ease-in-out;
        }
        .animate-shine-pulse {
          animation: shine-pulse 4s ease-in-out infinite;
        }
        .inner-glow {
          box-shadow: inset 0 0 20px 5px rgba(0, 70, 173, 0.2);
        }
      `}</style>
    </div>
  );
}
