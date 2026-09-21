export type BinStatus = 'online' | 'offline' | 'full' | 'warning' | 'normal' | 'Almost Full';

export interface SmartBinData {
  deviceId: string;
  location: string;
  latitude?: number;
  longitude?: number;
  fillLevel: number;
  temperature: number;
  humidity: number;
  gasLevel: number;
  battery: number;
  rssi: number;
  status: BinStatus;
  lastUpdated: string;
  // EC2 IoT Service fields
  distance?: number;
  uptime?: number;
  online?: boolean;
}

export interface SmartBinPayload {
  bins: SmartBinData[];
  totals: {
    totalBins: number;
    onlineBins: number;
    offlineBins: number;
    fullBins: number;
    collectionsToday: number;
    liveAlerts: number;
  };
  charts: {
    fillLevelHistory: { time: string; value: number }[];
    temperatureHistory: { time: string; value: number }[];
    gasLevelHistory: { time: string; value: number }[];
    humidityHistory: { time: string; value: number }[];
  };
  alerts: {
    id: string;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    time: string;
  }[];
}
