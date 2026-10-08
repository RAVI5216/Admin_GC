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
  return data;
}

export async function unassignReport(reportId: string): Promise<{ reportId: string; status: string }> {
  const response = await fetch(
    `${API_BASE}/reports/${encodeURIComponent(reportId)}/status`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
  return { reportId: data.reportId, status: data.status };
}
