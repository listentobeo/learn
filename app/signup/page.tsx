import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  return (
    <div className="auth-page">
      <aside className="auth-art"><Logo /><blockquote className="auth-quote">“A serious practice is built one honest mark at a time.”<span>Beo School of Art · Vol. 1</span></blockquote></aside>
      <main className="auth-panel"><div className="auth-box"><Logo /><h1>Begin your practice.</h1><p className="subtle">Choose your track, create your student profile, and enter a structured learning room.</p><Suspense><AuthForm mode="signup" /></Suspense></div></main>
    </div>
  );
}
