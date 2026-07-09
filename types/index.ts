export const penaltyCodes = ["OK", "UFD", "BFD", "DNC", "DNF", "DNS", "DSQ", "RET", "ZFP", "SCP", "DPI", "RDG", "OCS"] as const;
export const boatClasses = ["Optimist", "ILCA 4", "ILCA 6", "ILCA 7", "Catamaran", "Other"] as const;
export const raceStatuses = ["Draft", "Finished", "Corrected"] as const;

export type PenaltyCode = (typeof penaltyCodes)[number];
export type RacePenaltyCode = "NONE" | "DPI" | "SCP" | "ZFP" | "UFD" | "BFD" | "DSQ" | "DNE" | "DGM" | "DNF" | "DNS" | "DNC" | "RET" | "RDG";
export type BoatClass = (typeof boatClasses)[number];
export type RaceStatus = (typeof raceStatuses)[number];
export type Sex = "M" | "F";

export type RaceResult = {
  raceNumber: number;
  sailNumber: string;
  position?: number;
  penalty: PenaltyCode;
  rank?: number;
  finishPosition?: number;
  finishTime?: number;
  elapsedSeconds?: number;
  penaltyCode?: RacePenaltyCode;
  penaltyPoints?: number;
  points: number;
  status?: string;
  notes?: string;
};

export type Athlete = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  sex: Sex;
  category: string;
  nationality: string;
  flag: string;
  clubName: string;
  clubLogo?: string;
  sailNumber: string;
  boatClass: BoatClass;
  licenseNumber?: string;
  results: Record<number, RaceResult>;
  total: number;
  discard?: number;
  net: number;
  rank: number;
};

export type Race = {
  raceNumber: number;
  status: RaceStatus;
  results: RaceResult[];
  updatedAt: string;
};

export type RaceNotification = {
  id: string;
  competitionId: string;
  raceNumber: number;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
};

export type StartCountdownMode = "5min" | "3min" | "1min" | "direct";

export type RaceLiveStatus = "not_started" | "countdown" | "open" | "started" | "finished" | "cancelled";

export type MarkType = "windward_mark" | "leeward_mark" | "finish";

export type ProtestStatus = "pending" | "accepted" | "rejected" | "resolved";

export type ProtestRecord = {
  id: string;
  raceId: string;
  protesterSailNumber: string;
  protestedSailNumber: string;
  witnessSailNumber?: string;
  reason?: string;
  juryNote?: string;
  status: ProtestStatus;
  createdAt: number;
  updatedAt: number;
};

export type RaceMarkRecord = {
  id: string;
  raceId: string;
  sailNumber: string;
  markType: MarkType;
  position: number;
  timestamp: number;
};

export type UFDRecord = {
  id: string;
  raceId: string;
  sailNumber: string;
  timestamp: number;
  note?: string;
};

export type RaceLiveState = {
  raceId: string;
  competitionId: string;
  raceNumber: number;
  status: RaceLiveStatus;
  countdownMode: StartCountdownMode;
  countdownSeconds: number;
  countdownStartedAt?: number;
  officialStartAt?: number;
  firstBoatStartedAt?: number;
  firstBoatFinishedAt?: number;
  lastBoatFinishedAt?: number;
  raceDurationSeconds?: number;
  selectedFlagCode?: string;
  activeFlags: string[];
  courseAreaImageUrl?: string;
  createdAt: number;
  updatedAt: number;
};

export type RaceStartListItem = {
  id: string;
  competitionId: string;
  raceId: string;
  sailNumber: string;
  sailorName: string;
  club?: string;
  nationality?: string;
  boatClass?: string;
  status?: "ready" | "ufd" | "dns" | "started" | "finished";
};

export type Competition = {
  id: string;
  publicCode: string;
  competitionCode?: string;
  publicAccessEnabled?: boolean;
  allowedRoles?: Array<"coach" | "athlete">;
  originalCompetitionId?: string;
  isLivePublished: boolean;
  name: string;
  clubName: string;
  clubLogo?: string;
  competitionLogo?: string;
  location: string;
  date: string;
  boatClass: BoatClass;
  raceCount: number;
  scoringSystem: "Low Point";
  athletes: Athlete[];
  races: Race[];
  notifications?: RaceNotification[];
  createdAt: string;
  updatedAt: string;
};
