import type { Metadata } from "next";
import { HelpCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about Recoverly — how it works, your privacy, the AI coach, and how we keep you safe while you reduce or quit alcohol."
};

const faqs = [
  {
    q: "Is Recoverly a medical service?",
    a: "No. Recoverly offers emotional support, motivation, and a simple way to track your drinking. It is not a doctor, and it does not diagnose, treat, or cure addiction. For anything medical, please speak to a qualified professional."
  },
  {
    q: "Can I just stop drinking suddenly?",
    a: "If you drink heavily or every day, stopping suddenly can be medically dangerous — withdrawal can cause seizures or delirium tremens. Please see a doctor before you quit and only reduce or stop under medical supervision. Recoverly will never push you to quit cold turkey."
  },
  {
    q: "Is my data private?",
    a: "Yes. Your records, goals, and chats are tied to your own account and are not visible to anyone else. Data is encrypted in transit and at rest, and we never sell or share your personal information. You can permanently delete everything from Settings → Delete account at any time."
  },
  {
    q: "How does the AI coach work?",
    a: "When you chat, your message is sent through a secure server to an AI model that replies with non-judgmental support. It is designed to avoid medical advice and to point you to real help when needed. It is a companion for motivation and reflection — not a clinician."
  },
  {
    q: "What happens if I mention self-harm or crisis?",
    a: "Your safety comes first. If the app detects crisis language, it will always show real helpline numbers (such as Tele-MANAS 14416) so you can reach someone who can help right away. You can also visit the Support page at any time."
  },
  {
    q: "Why does Recoverly add a short delay before logging a drink?",
    a: "That brief pause is intentional — a few seconds to reconsider is a gentle, proven nudge. There's no shame either way: logging honestly is how you see real progress."
  },
  {
    q: "Will Recoverly shame me if I slip?",
    a: "Never. Recovery isn't a straight line. Recoverly is built on encouragement and identity-based reinforcement — you are someone who is choosing awareness — not guilt or scolding."
  },
  {
    q: "How much does it cost?",
    a: "Recoverly is free to use. It is part of a youth-led anti-addiction project focused on helping people, not profit."
  },
  {
    q: "Can Recoverly replace therapy or a de-addiction programme?",
    a: "No. Think of it as support between and alongside professional care. If you need treatment, a doctor or de-addiction specialist is the right place to start — see the Support page for how to find help."
  }
];

export default function FaqPage() {
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Frequently Asked Questions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Honest answers about how Recoverly works and how we keep you safe.
        </p>
      </div>

      {faqs.map((item) => (
        <Card key={item.q}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{item.q}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-body">{item.a}</p>
          </CardContent>
        </Card>
      ))}

      <p className="px-1 text-center text-xs text-subtle">
        Still have a question? If it&apos;s urgent or about your health, please reach out via the{" "}
        <a href="/support" className="underline underline-offset-2 hover:text-foreground">
          Support page
        </a>
        .
      </p>
    </div>
  );
}
