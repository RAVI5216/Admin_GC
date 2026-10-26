import { useSmartBinContext } from '../context/SmartBinContext';

export function useSmartBinData() {
  const { state } = useSmartBinContext();
  return {
    data: state.data,
    connected: state.status === 'connected',
    status: state.status,
    lastUpdate: state.lastUpdate,
    error: state.error,
  };
}
