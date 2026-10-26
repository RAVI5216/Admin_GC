import type { SmartBinData } from '../types/smartbin';

export interface ChartPoint {
  time: string;
  value: number;
}

export interface ChartComputationResult {
  chartData: ChartPoint[];
  isStale: boolean;
  staleLabel: string;
  mode: 'stale_flat_line' | 'live_steady' | 'live_dynamic';
}

/**
 * Computes per-device chart data based on telemetry changes and update freshness.
 * - If lastUpdated >= 24h ago (or months ago): generates a flat line at the bin's current level.
 * - If live telemetry has arrived: charts the real-time dynamic changes for that specific device.
 */
export function computeBinChartData(
  bin: SmartBinData | null | undefined,
  deviceHistory: ChartPoint[] = [],
  currentTimeMs: number = Date.now()
): ChartComputationResult {
  if (!bin) {
    return {
      chartData: [],
      isStale: false,
      staleLabel: '',
      mode: 'stale_flat_line',
    };
  }

  const lastUpdatedDate = bin.lastUpdated ? new Date(bin.lastUpdated) : null;
  const isInvalidDate = !lastUpdatedDate || isNaN(lastUpdatedDate.getTime());
  const msAgo = isInvalidDate ? Infinity : currentTimeMs - lastUpdatedDate.getTime();
  const hoursAgo = msAgo / (1000 * 60 * 60);
  const stale = isInvalidDate || hoursAgo >= 24;

  let staleText = '';
  if (stale) {
    if (hoursAgo === Infinity) {
      staleText = 'No recent telemetry';
    } else if (hoursAgo >= 24 * 30) {
      const months = Math.floor(hoursAgo / (24 * 30));
      staleText = `No change in ~${months} month${months > 1 ? 's' : ''}`;
    } else if (hoursAgo >= 24) {
      const days = Math.floor(hoursAgo / 24);
      staleText = `No change in ${days} day${days > 1 ? 's' : ''}`;
    } else {
      staleText = `No change in ${Math.floor(hoursAgo)} hours`;
    }
  }

  // If live telemetry updates exist and are not stale
  if (!stale && deviceHistory.length >= 2) {
    return {
      chartData: deviceHistory,
      isStale: false,
      staleLabel: '',
      mode: 'live_dynamic',
    };
  }

  if (!stale && deviceHistory.length === 1) {
    return {
      chartData: [
        { time: 'Earlier', value: bin.fillLevel },
        { time: deviceHistory[0].time, value: bin.fillLevel },
      ],
      isStale: false,
      staleLabel: 'Live (Level steady)',
      mode: 'live_steady',
    };
  }

  // Stale or no updates for >= 24h: Flat horizontal line at current fill level
  const flatPoints: ChartPoint[] = [
    { time: '24h ago', value: bin.fillLevel },
    { time: '18h ago', value: bin.fillLevel },
    { time: '12h ago', value: bin.fillLevel },
    { time: '6h ago', value: bin.fillLevel },
    { time: 'Now', value: bin.fillLevel },
  ];

  return {
    chartData: flatPoints,
    isStale: stale,
    staleLabel: staleText,
    mode: 'stale_flat_line',
  };
}
