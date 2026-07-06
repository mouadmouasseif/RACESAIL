export const penaltyCodes = ["OK", "DNC", "DNF", "DNS", "DSQ", "UFD", "BFD", "RET", "OCS"] as const;
export const boatClasses = ["Optimist", "ILCA 4", "ILCA 6", "ILCA 7", "Catamaran", "Other"] as const;
export const raceStatuses = ["Draft", "Finished", "Corrected"] as const;

export type PenaltyCode = (typeof penaltyCodes)[number];
export type BoatClass = (typeof boatClasses)[number];
export type RaceStatus = (typeof raceStatuses)[number];
export type Sex = "M" | "F";

export type RaceResult = {
  raceNumber: number;
  sailNumber: string;
  position?: number;
  penalty: PenaltyCode;
  points: number;
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

export type Competition = {
  id: string;
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
