"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Wine } from "lucide-react";

import { addDrinkRecord } from "@/lib/firestore";
import { DRINK_TYPES, drinkRecordSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  userId: string;
  onSaved?: () => void;
};

/** SVG countdown ring - 36px circle, 5-second animation */
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;

  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="hsl(218 18% 24%)" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke="hsl(165 60% 46%)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-200">
        {seconds > 0 ? seconds : <Pause className="h-3 w-3" />}
      </span>
    </div>
  );
}

const drinkEmoji: Record<string, string> = {
  beer: "Be",
  wine: "Wi",
  whiskey: "Wh",
  vodka: "Vo",
  other: "Ot"
};

export function LogDrinkModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [drinkType, setDrinkType] = useState<(typeof DRINK_TYPES)[number]>("beer");
  const [mood, setMood] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const canSubmit = useMemo(() => countdown === 0 && !saving, [countdown, saving]);

  const submit = async () => {
    setError("");

    const parsed = drinkRecordSchema.safeParse({
      quantity: Number(quantity),
      type: drinkType,
      mood: mood.trim() ? mood.trim() : undefined
    });

    if (!parsed.success) {
      setError("Please provide a valid quantity and drink type.");
      return;
    }

    try {
      setSaving(true);
      await addDrinkRecord(userId, parsed.data);
      setOpen(false);
      setQuantity("");
      setMood("");
      setDrinkType("beer");
      onSaved?.();
    } catch {
      setError("Could not save this record. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-14 w-full gap-2 text-base font-semibold sm:w-auto sm:px-8">
          <Wine className="h-5 w-5" />
          Alcohol consumed.
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-emerald-400" />
            Pause before logging
          </DialogTitle>
          <DialogDescription>
            This moment of friction helps bring your conscious choice back into the process.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (ml)</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={5000}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 330"
            />
          </div>
          <div className="space-y-2">
            <Label>Drink type</Label>
            <Select value={drinkType} onValueChange={(value) => setDrinkType(value as (typeof DRINK_TYPES)[number])}>
              <SelectTrigger aria-label="Drink type">
                <SelectValue placeholder="Select drink type" />
              </SelectTrigger>
              <SelectContent>
                {DRINK_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                        {drinkEmoji[type] ?? type.slice(0, 2)}
                      </span>
                      <span className="capitalize">{type}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mood">How are you feeling? <span className="text-xs text-slate-500">(optional)</span></Label>
            <Textarea
              id="mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              maxLength={120}
              placeholder="Stressed, social pressure, celebration..."
              rows={2}
            />
          </div>
          {error ? (
            <p role="alert" aria-live="polite" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="flex-row items-center gap-3">
          <div className="mr-auto flex items-center gap-2">
            <CountdownRing seconds={countdown} total={5} />
            <span id="submit-status" className="text-sm text-muted-foreground">
              {countdown > 0 ? `${countdown}s remaining` : "Ready to submit"}
            </span>
          </div>
          <Button onClick={submit} disabled={!canSubmit} aria-describedby="submit-status">
            {saving ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
