export type StatusType = 'VERIFIED' | 'NEEDS_REVIEW' | 'MISMATCH' | 'HIGH_RISK';

export interface ScreeningRecord {
  id: string;
  name: string;
  docType: 'Aadhaar Card' | 'Passport' | 'Border Pass' | 'Voter ID' | 'Driving License';
  docNumber: string;
  status: StatusType;
  timestamp: string;
  checkpointId: string;
  officerId: string;
  gender: 'M' | 'F' | 'Other';
  dob: string;
  address: string;
  nationality: string;
  matchScore: number;
  ocrConfidence: number;
  securityChecks: {
    hologramDetected: boolean;
    tamperingDetected: boolean;
    watchlistMatch: boolean;
    biometricMatch: boolean;
  };
  notes?: string;
  photoUrl?: string;
  livePhotoUri?: string;
}

export interface OfficerProfile {
  id: string;
  name: string;
  rank: string;
  unit: string;
  checkpoint: string;
  securityClearance: string;
  role: 'checkpoint' | 'admin';
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  location: string;
  acknowledged: boolean;
  docRef?: string;
}
