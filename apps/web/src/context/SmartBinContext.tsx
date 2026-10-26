import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import socketService from '../services/socketService';
import type { ReactNode } from 'react';
import type { BinStatus, SmartBinData, SmartBinPayload } from '../types/smartbin';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type SmartBinState = {
  data: SmartBinPayload | null;
  status: ConnectionStatus;
  lastUpdate: string | null;
  error?: string;
};

type SmartBinAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'RECEIVE_DATA'; payload: SmartBinPayload }
  | { type: 'ERROR'; message: string };

const initialState: SmartBinState = {
  data: null,
  status: 'connecting',
  lastUpdate: null,
};

const SmartBinContext = createContext<{
  state: SmartBinState;
  dispatch: React.Dispatch<SmartBinAction>;
} | null>(null);

const computeTotals = (bins: SmartBinData[]) => {
  const totalBins = bins.length;
  const onlineBins = bins.filter((bin) => bin.status !== 'offline').length;
  const offlineBins = bins.filter((bin) => bin.status === 'offline').length;
  const fullBins = bins.filter((bin) => bin.status === 'full').length;

  return {
    totalBins,
    onlineBins,
    offlineBins,
    fullBins,
    collectionsToday: Math.max(0, totalBins ? Math.round(totalBins * 0.72) : 0),
    liveAlerts: bins.filter((bin) => bin.status === 'warning' || bin.status === 'full' || bin.status === 'offline').length,
  };
};

const createAlertsFromBins = (bins: SmartBinData[]): SmartBinPayload['alerts'] =>
  bins
    .filter((bin) => bin.status === 'full' || bin.status === 'warning' || bin.status === 'offline')
    .slice(-6)
    .map((bin) => ({
      id: `${bin.deviceId}-${bin.lastUpdated}`,
      title: bin.status === 'full' ? 'Bin Full' : bin.status === 'offline' ? 'Device Offline' : 'High Fill Level',
      message: `${bin.location} is reporting ${bin.fillLevel}% fill and requires monitoring.`,
      severity: bin.status === 'offline' ? 'critical' : ('warning' as const),
      time: bin.lastUpdated,
    }));

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const getCoordinateFromPayload = (message: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = message[key];
    const parsed = parseNumber(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
};

const parseRawBin = (message: Record<string, unknown>): SmartBinData | null => {
  const deviceId = typeof message.deviceId === 'string' ? message.deviceId : undefined;
  
  // Handle both old format (timestamp) and EC2 format (lastUpdated)
  const timestamp = typeof message.timestamp === 'string' ? message.timestamp : typeof message.lastUpdated === 'string' ? message.lastUpdated : undefined;
  
  if (!deviceId || !timestamp) {
    return null;
  }

  // Map fillPercentage (EC2 format) to fillLevel, fallback to level field
  const fillLevel = parseNumber(message.fillPercentage) ?? parseNumber(message.fillLevel) ?? parseNumber(message.level) ?? 0;
  
  // Determine status from explicit status field or derive from fillLevel
  let status: BinStatus;
  if (typeof message.status === 'string') {
    // Map common status values
    if (['Almost Full', 'warning'].includes(message.status)) {
      status = 'warning';
    } else if (['full'].includes(message.status)) {
      status = 'full';
    } else if (['offline'].includes(message.status)) {
      status = 'offline';
    } else {
      status = 'online';
    }
  } else {
    // Derive status from fillLevel or online boolean
    if (message.online === false) {
      status = 'offline';
    } else if (fillLevel >= 90) {
      status = 'full';
    } else if (fillLevel >= 70) {
      status = 'warning';
    } else {
      status = 'online';
    }
  }

  const bin: SmartBinData = {
    deviceId,
    location: typeof message.location === 'string' ? message.location : `Bin ${deviceId}`,
    latitude: getCoordinateFromPayload(message, ['latitude', 'lat']),
    longitude: getCoordinateFromPayload(message, ['longitude', 'lng', 'lon', 'long']),
    fillLevel,
    temperature: parseNumber(message.temperature) ?? 0,
    humidity: parseNumber(message.humidity) ?? 0,
    gasLevel: parseNumber(message.gasLevel) ?? 0,
    battery: parseNumber(message.battery) ?? 0,
    rssi: parseNumber(message.rssi) ?? 0,
    status,
    lastUpdated: timestamp,
    // EC2 IoT Service optional fields
    distance: parseNumber(message.distance),
    uptime: parseNumber(message.uptime),
    online: typeof message.online === 'boolean' ? message.online : undefined,
  };

  return bin;
};

const buildPayloadFromMessage = (message: unknown, previousData: SmartBinPayload | null): SmartBinPayload | null => {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const maybePayload = message as SmartBinPayload;
  if (Array.isArray((maybePayload as any).bins)) {
    const bins = maybePayload.bins ?? [];
    const payloadAlerts = Array.isArray(maybePayload.alerts)
      ? (maybePayload.alerts as SmartBinPayload['alerts'])
      : undefined;
    return {
      bins,
      totals: maybePayload.totals ?? computeTotals(bins),
      charts: maybePayload.charts ?? {
        fillLevelHistory: [],
        temperatureHistory: [],
        gasLevelHistory: [],
        humidityHistory: [],
      },
      alerts: (payloadAlerts && payloadAlerts.length > 0 ? payloadAlerts : createAlertsFromBins(bins)) as SmartBinPayload['alerts'],
    };
  }

  const raw = message as Record<string, unknown>;
  const bin = parseRawBin(raw);
  if (!bin) {
    return null;
  }

  const existingBins = previousData?.bins ?? [];
  const updatedBins = [...existingBins.filter((item) => item.deviceId !== bin.deviceId), bin];
  const totals = computeTotals(updatedBins);
  const latestPoint = { time: bin.lastUpdated, value: bin.fillLevel };
  const temperaturePoint = { time: bin.lastUpdated, value: bin.temperature };
  const humidityPoint = { time: bin.lastUpdated, value: bin.humidity };
  const gasPoint = { time: bin.lastUpdated, value: bin.gasLevel };

  return {
    bins: updatedBins,
    totals,
    charts: {
      fillLevelHistory: [...(previousData?.charts.fillLevelHistory ?? []), latestPoint].slice(-12),
      temperatureHistory: [...(previousData?.charts.temperatureHistory ?? []), temperaturePoint].slice(-12),
      gasLevelHistory: [...(previousData?.charts.gasLevelHistory ?? []), gasPoint].slice(-12),
      humidityHistory: [...(previousData?.charts.humidityHistory ?? []), humidityPoint].slice(-12),
    },
    alerts: createAlertsFromBins(updatedBins) as SmartBinPayload['alerts'],
  };
};

const reducer = (state: SmartBinState, action: SmartBinAction): SmartBinState => {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, status: 'connecting', error: undefined };
    case 'CONNECTED':
      return { ...state, status: 'connected', error: undefined };
    case 'DISCONNECTED':
      return { ...state, status: 'disconnected' };
    case 'RECEIVE_DATA':
      return { ...state, status: 'connected', data: action.payload, lastUpdate: new Date().toISOString(), error: undefined };
    case 'ERROR':
      return { ...state, error: action.message };
    default:
      return state;
  }
};

export function SmartBinProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const latestDataRef = useRef<SmartBinPayload | null>(null);

  latestDataRef.current = state.data;

  useEffect(() => {
    dispatch({ type: 'CONNECTING' });

    const handleConnect = () => dispatch({ type: 'CONNECTED' });
    const handleDisconnect = () => dispatch({ type: 'DISCONNECTED' });
    const handleSmartBinData = (payload: unknown) => {
      const normalized = buildPayloadFromMessage(payload, latestDataRef.current);
      if (normalized) {
        dispatch({ type: 'RECEIVE_DATA', payload: normalized });
      }
    };
    const handleError = (error: Error) => dispatch({ type: 'ERROR', message: error.message });

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('smartbin-data', handleSmartBinData);
    socketService.on('connect_error', handleError);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('smartbin-data', handleSmartBinData);
      socketService.off('connect_error', handleError);
      socketService.disconnect();
    };
  }, []);

  return <SmartBinContext.Provider value={{ state, dispatch }}>{children}</SmartBinContext.Provider>;
}

export function useSmartBinContext() {
  const context = useContext(SmartBinContext);
  if (!context) {
    throw new Error('useSmartBinContext must be used within SmartBinProvider');
  }
  return context;
}
