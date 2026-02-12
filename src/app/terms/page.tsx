import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    title: "Purpose",
    content: "This application is designed for habit support and progress reflection. It helps you track alcohol consumption, identify patterns, and receive AI-assisted guidance."
  },
  {
    title: "Not medical advice",
    content: "Recoverly is not a substitute for medical diagnosis, treatment, or emergency intervention. Always consult a healthcare professional for medical concerns."
  },
  {
    title: "Your responsibility",
    content: "You are responsible for decisions made based on app content and AI responses. The insights and suggestions provided are informational, not prescriptive."
  },
  {
    title: "Emergency situations",
    content: "Do not use this service to delay urgent help if you are in immediate danger. If you or someone you know is at risk, contact emergency services immediately."
  },
  {
    title: "AI limitations",
    content: "The AI assistant is designed to be compassionate and supportive but may not always provide perfect advice. It cannot replace a licensed counselor or therapist."
  }
];

export default function TermsPage() {
  return (
    <div className="animate-fade-in-up mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <FileText className="h-5 w-5 text-sky-400" />
          Terms of Use
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
