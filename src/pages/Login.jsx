import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Demo quick-fill credentials
  const demoUsers = [
    { label: "Admin", email: "admin@veerashaiva.com", password: "admin123", color: "from-blue-600 to-blue-700" },
    { label: "Manager", email: "manager@veerashaiva.com", password: "manager123", color: "from-emerald-600 to-emerald-700" },
    { label: "Staff", email: "staff@veerashaiva.com", password: "staff123", color: "from-orange-600 to-orange-700" },
  ];

  // Map Firebase error codes to readable messages
  const getFirebaseError = (code) => {
    const messages = {
      "auth/user-not-found": "No account found with this email address.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/user-disabled": "This account has been disabled. Contact support.",
      "auth/too-many-requests": "Too many failed attempts. Please wait and try again.",
      "auth/invalid-credential": "Invalid email or password. Please check your credentials.",
      "auth/network-request-failed": "Network error. Please check your internet connection.",
    };
    return messages[code] || "Login failed. Please try again.";
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store session info
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userUID", user.uid);

      // Derive role from email prefix (can be extended with Firestore role claims)
      const roleMap = {
        "admin@veerashaiva.com": "Admin",
        "manager@veerashaiva.com": "Manager",
        "staff@veerashaiva.com": "Staff",
      };
      localStorage.setItem("userRole", roleMap[user.email] || "User");

      navigate("/dashboard");
    } catch (err) {
      console.error("Firebase Auth Error:", err.code, err.message);
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const preFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#020f1e]">

      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-700/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-800/10 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(to right, #3b82f6 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Glassmorphism Card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">

          {/* Brand Identity Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4 shadow-lg shadow-blue-900/30">
              <span className="text-3xl">🥥</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              VEERASHAIVA
            </h1>
            <p className="text-blue-400 font-bold text-lg tracking-widest uppercase mt-0.5">
              ERP Platform
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Coconut Oil Mill · Manufacturing · POS System
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-6 text-sm">
              <span className="text-base shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                  ✉️
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="admin@veerashaiva.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/10 focus:border-blue-500/70 focus:bg-white/[0.08] text-white placeholder-gray-500 rounded-2xl outline-none transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-300">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base pointer-events-none">
                  🔒
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 bg-white/[0.06] border border-white/10 focus:border-blue-500/70 focus:bg-white/[0.08] text-white placeholder-gray-500 rounded-2xl outline-none transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors text-sm"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 rounded-2xl font-bold text-white text-base transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed
                bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                shadow-blue-900/40 hover:shadow-blue-800/50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                "Sign In to ERP"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 font-medium tracking-wider uppercase">Quick Demo Access</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Demo Quick-Login Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {demoUsers.map((user) => (
              <button
                key={user.label}
                id={`demo-login-${user.label.toLowerCase()}`}
                type="button"
                onClick={() => preFill(user.email, user.password)}
                className={`
                  py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all duration-200
                  bg-gradient-to-b ${user.color} opacity-80 hover:opacity-100
                  border border-white/10 hover:scale-[1.03] active:scale-[0.97] shadow-lg
                `}
              >
                {user.label}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-600 mt-7">
            Veerashaiva ERP · Powered by{" "}
            <span className="text-blue-500 font-semibold">BLINKER · BICOJA</span>
          </p>
        </div>

        {/* Firebase badge */}
        <p className="text-center text-[10px] text-gray-700 mt-4 tracking-wider uppercase">
          Secured with Firebase Authentication
        </p>
      </div>
    </div>
  );
}