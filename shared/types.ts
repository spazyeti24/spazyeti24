// Shared types between /server and /web. Plain TypeScript, imported by relative path.

export type JobSource = 'jsearch' | 'adzuna' | 'seed';
export type JobStatus = 'new' | 'scored' | 'dismissed';
export type ApplicationStage =
  | 'interested'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'withdrawn';
export type MaterialType = 'resume_bullets' | 'cover_letter' | 'outreach_message';
export type RemotePreference = 'remote_only' | 'remote_preferred' | 'hybrid' | 'onsite' | 'any';

export const APPLICATION_STAGES: ApplicationStage[] = [
  'interested',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

export interface Profile {
  id: number;
  name: string;
  resumeMarkdown: string;
  targetRoles: string[];
  locations: string[];
  remotePreference: RemotePreference;
  salaryFloor: number | null;
  scoreThreshold: number;
  extraScoringInstructions: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: number;
  query: string;
  location: string;
  sources: JobSource[];
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

export interface Job {
  id: number;
  source: JobSource;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryText: string | null;
  description: string;
  url: string;
  postedAt: string | null;
  fetchedAt: string;
  status: JobStatus;
}

export interface Score {
  id: number;
  jobId: number;
  overall: number;
  fit: number;
  requirementsMatch: number;
  growth: number;
  compSignal: number;
  strengths: string[];
  gaps: string[];
  verdict: string;
  model: string;
  createdAt: string;
}

export interface Application {
  id: number;
  jobId: number;
  stage: ApplicationStage;
  appliedAt: string | null;
  notes: string;
  nextAction: string | null;
  nextActionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: number;
  applicationId: number;
  type: MaterialType;
  content: string;
  createdAt: string;
}

// ---- API payload shapes ----

export interface IntegrationStatus {
  anthropic: boolean;
  jsearch: boolean;
  adzuna: boolean;
}

export interface StatusResponse {
  ok: boolean;
  integrations: IntegrationStatus;
  model: string;
}

export interface JobWithScore extends Job {
  score: Score | null;
  applicationId: number | null;
}

export interface FetchSourceResult {
  source: JobSource;
  fetched: number;
  inserted: number;
  duplicates: number;
  error: string | null;
}

export interface FetchRunSummary {
  searchId: number;
  query: string;
  results: FetchSourceResult[];
}

export interface ScoreProgress {
  running: boolean;
  total: number;
  done: number;
  errors: { jobId: number; message: string }[];
}

export interface ApplicationWithJob extends Application {
  job: Job;
  score: Score | null;
  materials: Material[];
}

export interface DashboardStats {
  newJobs: number;
  highScorersThisWeek: number;
  activeApplicationsByStage: Partial<Record<ApplicationStage, number>>;
  upcomingActions: {
    applicationId: number;
    jobTitle: string;
    company: string;
    nextAction: string;
    nextActionDate: string;
    overdue: boolean;
  }[];
}

export interface ApiError {
  error: string;
  detail?: string;
}
