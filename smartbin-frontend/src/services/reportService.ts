const API_BASE = 'http://localhost:5000';

export type ReportRecord = Record<string, unknown> & {
  reportId: string;
};

export async function fetchReports(): Promise<ReportRecord[]> {
  const response = await fetch(`${API_BASE}/reports`);
  const text = await response.text();

  if (!response.ok) {
    let message = 'Unable to load reports';
    try {
      const data = JSON.parse(text);
      message = data.error || data.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }

  return text ? JSON.parse(text) as ReportRecord[] : [];
}
