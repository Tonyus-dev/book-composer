import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { getAuthSession, loginOwner } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getAuthSession().then((session) => {
      if (session.authenticated) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (await loginOwner(password)) {
        void navigate({ to: "/", replace: true });
      } else {
        setError("Senha inválida ou autenticação ainda não configurada.");
      }
    } catch {
      setError("Não foi possível iniciar a sessão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2eee5] px-4 text-[#17140f]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-[#17140f33] bg-[#fffdf8] p-8 shadow-xl"
      >
        <p className="text-[11px] font-semibold tracking-[0.24em] uppercase">Book Maker</p>
        <h1 className="mt-3 text-2xl font-semibold">Acesso editorial</h1>
        <p className="mt-2 text-sm text-[#6b6459]">Acesso privado do proprietário editorial.</p>
        <label className="mt-6 block text-xs font-medium" htmlFor="owner-password">
          Senha
        </label>
        <input
          id="owner-password"
          autoFocus
          autoComplete="current-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full border border-[#17140f33] bg-white px-3 py-2 outline-none focus:border-[#17140f]"
        />
        {error ? <p className="mt-3 text-xs text-[#8c1c13]">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-6 w-full bg-[#17140f] px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
