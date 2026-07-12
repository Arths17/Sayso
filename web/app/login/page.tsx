"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth, googleProvider, firebaseReady, firebaseAuthMessage } from "@/lib/firebase";
import { apiClient } from "@/app/api/index";

const NS = "http://www.w3.org/2000/svg";
const DOT = 2;
const TARGET = 12;
const DOT_COLOR = "#343940";

function dotPositions(length: number) {
  const span = Math.max(0, length - DOT);
  const n = Math.max(1, Math.round(span / TARGET));
  const step = span / n;
  const arr: number[] = [];
  for (let i = 0; i <= n; i++) arr.push(Math.round(i * step));
  return arr;
}

function DottedFrame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg) return;

    const draw = () => {
      const w = Math.round(wrap.offsetWidth);
      const h = Math.round(wrap.offsetHeight);
      if (!w || !h) return;

      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const addDot = (x: number, y: number) => {
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", String(x));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(DOT));
        r.setAttribute("height", String(DOT));
        r.setAttribute("fill", DOT_COLOR);
        r.setAttribute("shape-rendering", "crispEdges");
        svg.appendChild(r);
      };

      const xs = dotPositions(w);
      const ys = dotPositions(h);
      const lastY = ys[ys.length - 1];

      xs.forEach((x) => {
        addDot(x, 0);
        addDot(x, h - DOT);
      });

      ys.forEach((y) => {
        if (y === 0 || y === lastY) return;
        addDot(0, y);
        addDot(w - DOT, y);
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="login_dotted-frame">
      <svg ref={svgRef} className="login_dotted-frame-svg" />
    </div>
  );
}

function NoiseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const shade = Math.floor(Math.random() * 255);
      imageData.data[i] = shade;
      imageData.data[i + 1] = shade;
      imageData.data[i + 2] = shade;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, []);

  return <canvas ref={canvasRef} className="login_noise" />;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      fill="currentColor"
    />
    <path
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      fill="currentColor"
      opacity="0.75"
    />
    <path
      d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      fill="currentColor"
      opacity="0.3"
    />
  </svg>
);

function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect password.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const afterAuth = async () => {
    if (!auth) return;
    const token = await auth.currentUser?.getIdToken();
    if (token) apiClient.setToken(token);
    router.push("/dashboard");
  };

  const handleGoogle = async () => {
    if (!auth || !googleProvider) {
      setError(firebaseAuthMessage);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      await afterAuth();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!auth) {
      setError(firebaseAuthMessage);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err instanceof FirebaseError && err.code === "auth/user-not-found") {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }
      await afterAuth();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login_wrap">
      <NoiseCanvas />
      <div className="padding-global login_body">
        <div className="container-1400 w-container login_container">
          <div className="login_card">
            <DottedFrame />
            <Link href="/" className="login_brand login_reveal login_reveal-2">
              <span className="ts-14px color-white mono all-caps">Sayso</span>
            </Link>

            <div key={step} className="login_step">
              {step === "email" ? (
                <>
                  <h1 className="ts-16px color-white login_title login_reveal login_reveal-3">
                    Sign in or create an account
                  </h1>
                  <p className="ts-14px color-white-50 login_sub login_reveal login_reveal-4">
                    Continue with Google, or use your email.
                  </p>

                  <button
                    type="button"
                    className="cta-button login_google login_reveal login_reveal-5"
                    onClick={handleGoogle}
                    disabled={loading}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  <div className="login_divider login_reveal login_reveal-6">
                    <span className="ts-12px color-white-50 mono all-caps">or</span>
                  </div>

                  <form
                    className="login_form login_reveal login_reveal-7"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setError(null);
                      if (email) setStep("password");
                    }}
                  >
                    <label htmlFor="email" className="hide">
                      Email
                    </label>
                    <div className="w-layout-hflex hs-input_wrapper">
                      <input
                        id="email"
                        type="email"
                        className="hs-input"
                        placeholder="Enter your email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {error && <p className="ts-12px login_error">{error}</p>}

                    {!firebaseReady && <p className="ts-12px login_error">{firebaseAuthMessage}</p>}

                    <button type="submit" className="cta-button is--blue login_submit">
                      Continue
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="login_back login_reveal login_reveal-1"
                    onClick={() => {
                      setError(null);
                      setStep("email");
                    }}
                  >
                    <span className="ts-12px color-white-50 mono all-caps">← Back</span>
                  </button>

                  <h1 className="ts-16px color-white login_title login_reveal login_reveal-2">
                    Enter your password
                  </h1>
                  <p className="ts-14px color-white-50 login_sub login_reveal login_reveal-3">
                    Signing in as <span className="color-white">{email}</span>
                  </p>

                  <form
                    className="login_form login_reveal login_reveal-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePasswordSubmit();
                    }}
                  >
                    <div className="login_label-row">
                      <label htmlFor="password" className="ts-12px color-white-50 mono all-caps">
                        Password
                      </label>
                      <a href="/forgot-password" className="ts-12px color-white login_forgot">
                        Forgot?
                      </a>
                    </div>
                    <div className="w-layout-hflex hs-input_wrapper">
                      <input
                        id="password"
                        type="password"
                        className="hs-input"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    {error && <p className="ts-12px login_error">{error}</p>}

                    <button type="submit" className="cta-button is--blue login_submit" disabled={loading}>
                      {loading ? "Signing in..." : "Sign in"}
                    </button>
                  </form>
                </>
              )}
            </div>

            <p className="ts-14px color-white-50 login_footer login_reveal login_reveal-8">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="color-white login_footer-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="footer_copyright login_copyright">
        ©2026 Copyright Sayso. All rights reserved
      </div>

      <style>{`
        @keyframes loginGlowIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loginRevealIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .login_wrap::before,
          .login_card,
          .login_reveal {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }

        .login_wrap {
          position: relative;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          padding-top: 2em;
          background-color: #000;
          overflow: hidden;
        }

        .login_wrap::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(41, 141, 255, 0.28) 0%, rgba(41, 141, 255, 0.08) 40%, rgba(0, 0, 0, 0) 70%);
          opacity: 0;
          animation: loginGlowIn 1.4s ease-out 0.1s forwards;
        }

        .login_noise {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.12;
          mix-blend-mode: soft-light;
          pointer-events: none;
        }

        .login_card {
          animation: loginCardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .login_step {
          display: contents;
        }

        .login_reveal {
          animation: loginRevealIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .login_reveal-1 { animation-delay: 0.05s; }
        .login_reveal-2 { animation-delay: 0.1s; }
        .login_reveal-3 { animation-delay: 0.15s; }
        .login_reveal-4 { animation-delay: 0.2s; }
        .login_reveal-5 { animation-delay: 0.25s; }
        .login_reveal-6 { animation-delay: 0.3s; }
        .login_reveal-7 { animation-delay: 0.35s; }
        .login_reveal-8 { animation-delay: 0.4s; }

        .login_body {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .login_container {
          display: flex;
          justify-content: center;
        }

        .login_card {
          position: relative;
          width: 100%;
          max-width: 26.5em;
          padding: 3em 2.5em;
          background-color: #131518;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.55);
        }

        .login_dotted-frame {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .login_dotted-frame-svg {
          position: absolute;
          inset: 0;
          display: block;
        }

        .login_brand {
          display: inline-flex;
          float: none;
          margin-bottom: 0.5em;
          text-decoration: none;
        }

        .login_copyright {
          text-align: center;
          padding: 1.5em 0 2em;
        }

        .login_back {
          display: inline-flex;
          align-items: center;
          margin-top: 2em;
          border: none;
          background: none;
          padding: 0;
          cursor: pointer;
        }

        .login_back:hover span {
          color: #fff !important;
        }

        .login_title {
          margin: 1.5em 0 0.375em;
          text-align: left;
        }

        .login_sub {
          margin: 0 0 2em;
          text-align: left;
        }

        .login_form {
          display: flex;
          flex-direction: column;
        }

        .login_label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 1.375em;
          margin-bottom: 0.375em;
        }

        .login_forgot {
          text-decoration: none;
          transition: color 0.2s;
        }

        .login_forgot:hover {
          color: #298dff;
        }

        .login_error {
          margin: 0.875em 0 0;
          color: #ff6c3d;
        }

        .login_submit {
          width: 100%;
          margin-top: 2em;
          border: none;
          cursor: pointer;
        }

        .login_divider {
          display: flex;
          align-items: center;
          gap: 0.875em;
          margin: 2em 0;
        }

        .login_divider::before,
        .login_divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background-color: #222529;
        }

        .login_google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625em;
          border: 1px solid #343940;
          background-color: transparent;
          cursor: pointer;
        }

        .login_google:hover {
          background-color: #222529;
        }

        .login_footer {
          margin: 2em 0 0;
          text-align: center;
        }

        .login_footer-link {
          text-decoration: none;
          border-bottom: 1px solid #298dff;
        }
      `}</style>
    </main>
  );
}
