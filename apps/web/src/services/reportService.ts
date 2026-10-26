import { API_BASE, getAuthHeaders } from './apiConfig';
import { dataCache } from './dataCache';

export type AIClassification = {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction: string;
  suggestedDepartment: string;
  confidence: number;
  summary: string;
  extractedLocation?: string | null;
  probabilities?: Array<{ category: string; probability: number }>;
  source?: string;
};

export type AIMetricsPayload = {
  model_name: string;
  algorithm: string;
  feature_extractor: string;
  total_training_samples: number;
  num_classes: number;
  classes: string[];
  metrics: {
    test_accuracy: number;
    macro_precision: number;
    macro_recall: number;
    macro_f1: number;
    weighted_f1: number;
    cross_validation: {
      n_splits: number;
      fold_scores: number[];
      mean_accuracy: number;
      std_deviation: number;
    };
  };
  per_class_metrics: Record<
    string,
    {
      precision: number;
      recall: number;
      f1_score: number;
      support: number;
      department: string;
      severity: string;
    }
  >;
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
  };
};

export type ReportRecord = Record<string, unknown> & {
  reportId: string;
  location?: string;
  description?: string;
  issueType?: string;
  status?: string;
  binId?: string;
  createdAt?: string;
  userId?: string;
  aiClassification?: AIClassification;
};

export async function fetchReports(): Promise<ReportRecord[]> {
  const response = await fetch(`${API_BASE}/reports`, {
    headers: getAuthHeaders(),
  });
  const text = await response.text();

  if (!response.ok) {
    let message = 'Unable to load reports';
    try {
      const data: unknown = JSON.parse(text);
      if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') {
        message = data.error;
      } else if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      ) {
        message = data.message;
      }
    } catch {
      if (text.trimStart().startsWith('<')) {
        throw new Error('The Reports API returned an HTML page. Check that the backend is running.');
      }
    }
    throw new Error(message);
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : [];
  } catch {
    throw new Error('The Reports API returned invalid JSON.');
  }
  if (!Array.isArray(data)) {
    throw new Error('The Reports API returned an invalid report list.');
  }
  const isReportRecord = (report: unknown): report is ReportRecord =>
    typeof report === 'object' &&
    report !== null &&
    !Array.isArray(report) &&
    'reportId' in report &&
    typeof report.reportId === 'string';
  if (!data.every(isReportRecord)) {
    throw new Error('The Reports API returned a report without a valid reportId.');
  }
  dataCache.setReports(data);
  return data;
}

const parseJsonSafely = async (response: Response, defaultMessage: string) => {
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        'Backend returned an HTML response instead of JSON. Ensure the Node.js backend is running on port 5000 and has been restarted.'
      );
    }
    throw new Error('Invalid JSON received from server.');
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || defaultMessage);
  }

  return data;
};

export async function classifyReportText(
  text: string,
  location?: string,
  createNotification = false
): Promise<AIClassification> {
  const response = await fetch(`${API_BASE}/reports/classify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ text, location, createNotification }),
  });
  return parseJsonSafely(response, 'AI classification failed');
}

export async function fetchAIMetrics(): Promise<AIMetricsPayload> {
  const response = await fetch(`${API_BASE}/reports/ai-metrics`, {
    headers: getAuthHeaders(),
  });
  return parseJsonSafely(response, 'Unable to load AI model metrics');
}

export async function unassignReport(reportId: string): Promise<{ reportId: string; status: string }> {
  const response = await fetch(
    `${API_BASE}/reports/${encodeURIComponent(reportId)}/status`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'unassigned' }),
    }
  );
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      text.trimStart().startsWith('<')
        ? 'The Reports API returned an HTML page. Restart the updated backend.'
        : 'The Reports API returned invalid JSON.'
    );
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : 'Unable to unassign report';
    throw new Error(message);
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    !('reportId' in data) ||
    typeof data.reportId !== 'string' ||
    !('status' in data) ||
    typeof data.status !== 'string'
  ) {
    throw new Error('The Reports API returned an invalid status update.');
  }
  dataCache.updateReport(data.reportId, { status: data.status });
  return { reportId: data.reportId, status: data.status };
}
