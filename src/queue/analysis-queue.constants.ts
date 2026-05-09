export const ANALYSIS_QUEUE_NAME = 'analysis-generation';
export const ANALYSIS_JOB_NAME = 'generate-analysis';

export enum AnalysisJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface AnalysisJobData {
  consultationId: string;
  requestedAt: string;
}
