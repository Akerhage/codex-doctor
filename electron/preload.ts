import { contextBridge, ipcRenderer } from 'electron';
import type { DoctorApi } from '../src/shared/contracts.js';
import { parseEnvironmentResult, parseSnapshotResult } from '../src/shared/validation.js';

const doctorApi: DoctorApi = {
  getEnvironment: async () => parseEnvironmentResult(await ipcRenderer.invoke('doctor:get-environment')),
  getMockSnapshot: async () => parseSnapshotResult(await ipcRenderer.invoke('doctor:get-mock-snapshot'))
};

contextBridge.exposeInMainWorld('doctor', doctorApi);
