import type { Metadata } from "next";

import { LoginContent } from "@/components/login-content";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in or create a free Recoverly account to track your drinking privately, set a weekly goal, and talk to a non-judgmental AI recovery coach.",
  alternates: { canonical: "https://recoverly-app.vercel.app/login" }
};

export default function LoginPage() {
  return <LoginContent />;
}
