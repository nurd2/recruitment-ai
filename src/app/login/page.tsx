import { getSessionUser } from "@/lib/authz";
import { LoginForm } from "@/components/app/login-form";
import { ThemeSelect } from "@/components/app/theme-select";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    // Already signed in — the (app) layout will redirect; avoid a flash.
    return null;
  }
  return (
    <div className="relative flex flex-1 items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <ThemeSelect />
      </div>
      <LoginForm />
    </div>
  );
}
