import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Logo } from "@/components/logo";

export default function AdminLoginPage() {
  const demoAllowed = process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Logo />
        <blockquote className="auth-quote">“Review the work with care. Every student is building a visual language.”<span>Beo School administration</span></blockquote>
      </aside>
      <main className="auth-panel">
        <div className="auth-box">
          <Logo />
          <div className="eyebrow" style={{ marginTop: 44 }}><ShieldCheck size={15} /> Protected area</div>
          <h1>Admin access.</h1>
          <p className="subtle">Sign in with Benjamin’s administrator account to review students, quizzes, and assignments.</p>
          <AdminLoginForm demoAllowed={demoAllowed} />
        </div>
      </main>
    </div>
  );
}
