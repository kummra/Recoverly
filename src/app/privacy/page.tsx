import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "What we collect",
    content: "We only collect data needed to provide recovery tracking and guidance features: your email, drink records, weekly goals, and AI chat history."
  },
  {
    title: "Where data is stored",
    content: "Your account data is stored in Firebase and scoped to your authenticated identity. Records are encrypted in transit and at rest."
  },
  {
    title: "AI conversations",
    content: "OpenAI requests are sent through secure server routes. API keys are never exposed to clients. Your conversation history is stored in Firestore under your account."
  },
  {
    title: "Data deletion",
    content: "You can permanently delete your account and all associated data at any time from Settings → Delete account. This removes your drink records, goals, and AI chat history, and cannot be undone."
  },
  {
    title: "Third parties",
    content: "We do not sell or share your personal data with third parties. Analytics, if any, are anonymized and aggregated."
  }
];

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          Privacy Policy
        </h2>
        <p className="mt-1 text-sm text-slate-400">Last updated: February 2026</p>
      </div>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-300">{section.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
