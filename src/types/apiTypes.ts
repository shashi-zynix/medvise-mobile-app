
export interface SignedUrlResponse {
  url: string;
  fields?: Record<string, string>;
  record_id: number;
  expiration: string;
}

export interface SignedUrlRequest {
  record_id: number;
}

export interface TranscribeChunkResponse {
  status: string;
  message?: string;
  chunk_id?: number;
}

export interface TranscribeChunkRequest {
  recordId: number;
  sequenceId: number;
  audioData: number[];
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  id: number;
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  status?: number;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
  expiration: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  date: string;
  status: string;
  notes?: string;
  recording_id?: number;
}
