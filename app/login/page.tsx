import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="auth-page">
      <aside className="auth-art"><Logo /><blockquote className="auth-quote">“Art begins the moment you give yourself permission to really look.”<span>Benjamin Odeke · Founder</span></blockquote></aside>
      <main className="auth-panel"><div className="auth-box"><Logo /><h1>Welcome back.</h1><p className="subtle">Return to your studio. Your lessons and submitted work are waiting.</p><Suspense><AuthForm mode="login" /></Suspense></div></main>
    </div>
  );
}
