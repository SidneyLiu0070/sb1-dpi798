export interface AnalysisResult {
  summary: string;
  insights: string[];
}

export interface Config {
  apiKey: string;
}

export interface ApiError {
  message: string;
  code?: number;
  status?: number;
}