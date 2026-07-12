"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof FirebaseError && err.code === "auth/invalid-email"
          ? "Enter a valid email address."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login_wrap">
      <div className="padding-global login_body">
        <div className="container-1400 w-container login_container">
          <div className="login_card">
            <a href="/login" className="login_back">
              <span className="ts-12px color-white-50 mono all-caps">← Back</span>
            </a>

            <h1 className="ts-16px color-white login_title">Reset your password</h1>

            {sent ? (
              <p className="ts-14px color-white-50 login_sub">
                Check <span className="color-white">{email}</span> for a reset link.
              </p>
            ) : (
              <>
                <p className="ts-14px color-white-50 login_sub">
                  Enter your email and we&apos;ll send you a reset link.
                </p>

                <form
                  className="login_form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
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

                  <button type="submit" className="cta-button is--blue login_submit" disabled={loading}>
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loginGlowIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .login_wrap::before {
            animation: none !important;
            opacity: 1 !important;
          }
        }

        .navbar {
          transform: translateY(0) !important;
        }

        .login_wrap {
          position: relative;
          min-height: calc(100dvh - 65px);
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

        .login_back {
          display: inline-flex;
          align-items: center;
          margin-bottom: 1.5em;
          text-decoration: none;
        }

        .login_back:hover span {
          color: #fff !important;
        }

        .login_title {
          margin: 0 0 0.375em;
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

        .login_submit {
          width: 100%;
          margin-top: 1.375em;
          border: none;
          cursor: pointer;
        }

        .login_error {
          margin: 0.875em 0 0;
          color: #ff6c3d;
        }
      `}</style>
    </main>
  );
}
