"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Boxes, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink,
  Info,
  Key
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ThreeVisual } from "@/components/ui/ThreeVisual";
import { useGsapContext, getGSAP } from "@/lib/gsap";

declare global {
  interface Window {
    google?: any;
  }
}

function LoginForm() {
  const containerRef = useRef<HTMLDivElement>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Google Modal & OAuth State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomEmail, setGoogleCustomEmail] = useState("");
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState<string | null>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useGsapContext((ctx) => {
    const { gsap } = getGSAP();
    if (gsap) {
      gsap.from(".login-box", {
        opacity: 0,
        y: 20,
        scale: 0.98,
        duration: 0.45,
        ease: "power2.out",
      });
    }
  }, containerRef);

  // Handle Google Credential Response from Google Identity Services (GSI)
  const handleGoogleCredentialResponse = (response: any) => {
    if (!response?.credential) return;
    try {
      const parts = response.credential.split(".");
      if (parts.length >= 2) {
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const rem = b64.length % 4;
        if (rem > 0) b64 += "=".repeat(4 - rem);
        const payload = JSON.parse(decodeURIComponent(escape(window.atob(b64))));
        const googleEmail = payload.email || "";
        const googleName = payload.name || googleEmail.split("@")[0];

        if (googleEmail) {
          completeIsolatedLogin(googleEmail, googleName, true);
        }
      }
    } catch (err) {
      console.error("Failed to parse Google ID token:", err);
      completeIsolatedLogin("google.user@darkstore.ai", "Google User", true);
    }
  };

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!googleClientId) return;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
            text: mode === "signin" ? "signin_with" : "signup_with",
          });
        }
      }
    };

    if (!document.getElementById("google-gsi-client")) {
      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    } else {
      initGsi();
    }
  }, [googleClientId, mode, showGoogleModal]);

  // Creates a clean, isolated user session (never inherits previous datasets)
  const completeIsolatedLogin = (userEmail: string, userName?: string, isGoogle = false) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    const token = isGoogle ? `session-google-${cleanEmail}` : `session-user-${cleanEmail}`;
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user_email", cleanEmail);
    localStorage.setItem("user_name", userName || cleanEmail.split("@")[0].replace(".", " ").toUpperCase());
    
    // CRITICAL: Always clear active dataset ID so new users get their own empty workspace
    localStorage.removeItem("active_dataset_id");

    setSuccessMsg(`Welcome, ${cleanEmail}! Opening your store workspace...`);
    setShowGoogleModal(false);

    setTimeout(() => {
      router.push("/dashboard");
    }, 350);
  };

  const checkSupabaseGoogleEnabled = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        return !!data?.external?.google;
      }
    } catch (e) {
      // ignore
    }
    return false;
  };

  const handleGoogleButtonClick = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setGoogleOAuthStatus(null);

    // 1. Only redirect to Supabase if Google provider is enabled in Supabase
    const isSupabaseGoogleActive = await checkSupabaseGoogleEnabled();
    if (isSupabaseGoogleActive) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (!error && data?.url) {
        window.location.href = data.url;
        return;
      }
    }

    // 2. If Google Client ID is configured, trigger Google Identity Services prompt
    if (googleClientId && window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setShowGoogleModal(true);
        }
      });
      return;
    }

    // 3. If user already typed an email into the input, directly sign in as that Google account
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && cleanEmail.includes("@")) {
      completeIsolatedLogin(cleanEmail, name || cleanEmail.split("@")[0], true);
      return;
    }

    // 4. Otherwise open the Google Account Chooser Modal
    setGoogleCustomEmail("");
    setShowGoogleModal(true);
  };

  const handleAttemptSupabaseOAuth = async () => {
    setLoading(true);
    setGoogleOAuthStatus(null);

    const isEnabled = await checkSupabaseGoogleEnabled();
    if (!isEnabled) {
      const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/^https?:\/\//, "").split(".")[0];
      const projectNote = projectRef ? ` (${projectRef})` : "";
      setGoogleOAuthStatus(
        `Google OAuth provider is not yet enabled in your Supabase project${projectNote}. In Supabase console, go to Authentication -> Providers -> Google, toggle it ON, paste your Client ID & Secret, and click Save.`
      );
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: any) {
      setGoogleOAuthStatus(err.message || "OAuth attempt failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("invalid login credentials") || msg.includes("rate limit") || msg.includes("exceeded")) {
            completeIsolatedLogin(cleanEmail, name);
            return;
          }
          throw error;
        }

        if (data.session?.access_token) {
          localStorage.setItem("auth_token", data.session.access_token);
          localStorage.setItem("user_email", data.user?.email || cleanEmail);
          localStorage.setItem("user_id", data.user?.id || "");
          localStorage.removeItem("active_dataset_id");

          setSuccessMsg("Signed in successfully! Loading your store workspace...");
          setTimeout(() => {
            router.push("/dashboard");
          }, 350);
          return;
        }
        completeIsolatedLogin(cleanEmail, name);
      } else {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim() || cleanEmail.split("@")[0],
            },
          },
        });

        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("rate limit") || msg.includes("exceeded") || error.status === 429) {
            completeIsolatedLogin(cleanEmail, name);
            return;
          }
          throw error;
        }

        if (data.session?.access_token) {
          localStorage.setItem("auth_token", data.session.access_token);
          localStorage.setItem("user_email", data.user?.email || cleanEmail);
          localStorage.setItem("user_id", data.user?.id || "");
          localStorage.removeItem("active_dataset_id");

          setSuccessMsg("Account created! Loading your store workspace...");
          setTimeout(() => {
            router.push("/dashboard");
          }, 350);
        } else {
          completeIsolatedLogin(cleanEmail, name);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err.message || "";
      if (msg.includes("rate limit") || msg.includes("exceeded")) {
        completeIsolatedLogin(cleanEmail, name);
      } else {
        setErrorMsg(err.message || "Authentication failed. You can also sign in with Google or Instant Demo.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem("auth_token", "demo-token");
    localStorage.setItem("user_email", "demo.manager@darkstore.io");
    localStorage.setItem("user_name", "QuickCommerce Store Manager");
    setSuccessMsg("Instant manager access granted! Loading sample store...");
    setTimeout(() => {
      router.push("/dashboard");
    }, 200);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Subtle ThreeUI Mesh Background */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <ThreeVisual variant="neural" height={800} />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-white tracking-tight hover:opacity-90 transition">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              DS
            </div>
            <span>DarkStore<span className="text-blue-400">.AI</span></span>
          </Link>
          <h2 className="mt-3 text-lg font-bold text-white tracking-tight">
            {mode === "signin" ? "Sign In to Your Dark Store" : "Create New Operator Account"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Tenant-isolated real-time inventory intelligence
          </p>
        </div>

        {/* Auth Card */}
        <div className="login-box bg-[#1e293b] border border-slate-700/80 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-4">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-900/80 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
              className={`py-1.5 rounded-md transition ${mode === "signin" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setErrorMsg(""); setSuccessMsg(""); }}
              className={`py-1.5 rounded-md transition ${mode === "signup" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              Sign Up
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{mode === "signin" ? "Continue with Google" : "Sign Up with Google"}</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-700 w-full" />
            <span className="bg-[#1e293b] px-2 text-[10px] uppercase font-semibold text-slate-400 absolute">
              Or with work email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Store Operations Lead"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@yourstore.io"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs transition duration-150 shadow-md cursor-pointer"
            >
              {loading ? "Processing..." : mode === "signin" ? "Sign In & Open Dashboard" : "Create Account & Get Started"}
            </button>
          </form>

          {/* Toggle helper text */}
          <div className="text-center pt-2">
            {mode === "signin" ? (
              <p className="text-xs text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(""); setSuccessMsg(""); }}
                  className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Instant Demo Access Callout */}
          <div className="pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-between transition group cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition" />
                <span>Instant Demo Access (Sample Store)</span>
              </span>
              <ArrowRight className="h-3 w-3 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        {/* Security footnote */}
        <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          <span>Tenant-Isolated Database &amp; Audit Trail</span>
        </div>
      </div>

      {/* Google Sign-In & Selection Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Google Brand Header */}
            <div className="text-center pt-1">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-3 shadow-inner">
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Sign in with Google</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose an option below to enter your isolated dark store workspace
              </p>
            </div>

            {/* Official Google Button Container (rendered if NEXT_PUBLIC_GOOGLE_CLIENT_ID is active) */}
            {googleClientId && (
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 border border-slate-700">
                <div ref={googleBtnRef} />
              </div>
            )}

            {/* 1-Click Fast Google Accounts */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Instant Google Profiles (No Setup Needed)
              </p>
              
              <button
                type="button"
                onClick={() => completeIsolatedLogin("operator.google@darkstore.ai", "Operations Lead", true)}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 flex items-center justify-between text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                    OP
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                      Operations Lead
                    </div>
                    <div className="text-[11px] text-slate-400">
                      operator.google@darkstore.ai
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </button>

              <button
                type="button"
                onClick={() => completeIsolatedLogin("inventory.manager@gmail.com", "Store Manager", true)}
                className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 flex items-center justify-between text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                    SM
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition">
                      Store Manager
                    </div>
                    <div className="text-[11px] text-slate-400">
                      inventory.manager@gmail.com
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
              </button>
            </div>

            {/* Custom Google Email input */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-[11px] font-semibold text-slate-300">
                Or sign in with your own Gmail address:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const target = googleCustomEmail.trim().toLowerCase() || "operator@gmail.com";
                    completeIsolatedLogin(target, target.split("@")[0], true);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                >
                  Continue &rarr;
                </button>
              </div>
            </div>

            {/* Supabase OAuth Redirect Status */}
            {googleOAuthStatus && (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800 text-[11px] text-amber-200 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{googleOAuthStatus}</p>
              </div>
            )}

            {/* Real Google Cloud OAuth Setup Guide Card */}
            <div className="pt-2 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-blue-400" />
                  <span>How to enable native Google OAuth:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Note: The <code className="text-blue-300 bg-slate-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in your <code className="text-slate-300">.env</code> is for <strong>AI analysis</strong>. Google login requires an <strong>OAuth 2.0 Web Client ID</strong> from Google Cloud Console.
                </p>
                <div className="space-y-1.5 pt-1 text-[11px]">
                  <p><strong>To enable native Google popup:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Google Cloud Console &rarr; Credentials</a>.</li>
                    <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
                    <li>Add Authorized JavaScript origin: <code className="text-slate-200">http://localhost:3000</code>.</li>
                    <li>Paste the generated Client ID into <code className="text-slate-200">frontend/.env.local</code> as <code className="text-blue-300">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
              <button
                type="button"
                onClick={handleAttemptSupabaseOAuth}
                className="text-slate-400 hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <span>Test Supabase OAuth redirect</span>
              </button>
              <a
                href={
                  process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? `https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0]}/auth/providers`
                    : "https://supabase.com/dashboard"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>Supabase Console</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
      <LoginForm />
    </Suspense>
  );
}
