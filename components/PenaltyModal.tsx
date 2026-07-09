"use client";

import { useState } from "react";
import type { RacePenaltyCode } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const penaltyOptions: RacePenaltyCode[] = ["NONE", "DPI", "SCP", "ZFP", "UFD", "BFD", "DSQ", "DNF", "DNS", "DNC", "RET", "RDG"];

export function PenaltyModal({
  sailNumber,
  onSave,
  onCancel,
}: {
  sailNumber: string;
  onSave: (penaltyCode: RacePenaltyCode, penaltyPoints?: number, notes?: string) => void;
  onCancel: () => void;
}) {
  const [penaltyCode, setPenaltyCode] = useState<RacePenaltyCode>("UFD");
  const [penaltyPoints, setPenaltyPoints] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4 shadow-lg">
      <h3 className="font-bold text-slate-950">Penalty for {sailNumber}</h3>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-1">
          <Label>Penalty</Label>
          <Select value={penaltyCode} onValueChange={(value) => setPenaltyCode(value as RacePenaltyCode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{penaltyOptions.map((code) => <SelectItem key={code} value={code}>{code}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label>Manual points</Label>
          <Input value={penaltyPoints} onChange={(event) => setPenaltyPoints(event.target.value)} placeholder="DPI / RDG / SCP" />
        </div>
        <div className="grid gap-1">
          <Label>Notes</Label>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(penaltyCode, penaltyPoints ? Number(penaltyPoints) : undefined, notes)}>Save penalty</Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
