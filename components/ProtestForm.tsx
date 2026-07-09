"use client";

import { useState } from "react";
import { createProtest } from "@/lib/raceLive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProtestFormProps = {
  competitionId: string;
  raceId: string;
  onSaved?: () => void;
};

export function ProtestForm({ competitionId, raceId, onSaved }: ProtestFormProps) {
  const [protesterSailNumber, setProtesterSailNumber] = useState("");
  const [protestedSailNumber, setProtestedSailNumber] = useState("");
  const [witnessSailNumber, setWitnessSailNumber] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  async function submitProtest() {
    setMessage("");
    try {
      await createProtest({
        competitionId,
        raceId,
        protesterSailNumber,
        protestedSailNumber,
        witnessSailNumber,
        reason,
      });
      setProtesterSailNumber("");
      setProtestedSailNumber("");
      setWitnessSailNumber("");
      setReason("");
      setMessage("Protest saved.");
      onSaved?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save protest.");
    }
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-slate-950">Protest</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <div className="grid gap-1">
          <Label>Protester sail no</Label>
          <Input value={protesterSailNumber} onChange={(event) => setProtesterSailNumber(event.target.value)} placeholder="1978" />
        </div>
        <div className="grid gap-1">
          <Label>Protested sail no</Label>
          <Input value={protestedSailNumber} onChange={(event) => setProtestedSailNumber(event.target.value)} placeholder="2041" />
        </div>
        <div className="grid gap-1">
          <Label>Witness sail no</Label>
          <Input value={witnessSailNumber} onChange={(event) => setWitnessSailNumber(event.target.value)} placeholder="optional" />
        </div>
        <div className="grid gap-1">
          <Label>Reason</Label>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rule / note" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={submitProtest}>Save protest</Button>
        {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
      </div>
    </section>
  );
}
