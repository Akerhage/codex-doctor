import { contextBridge, ipcRenderer } from 'electron';
import type { DoctorApi } from '../src/shared/contracts.js';

const doctorApi: DoctorApi = {
  getEnvironment: () => ipcRenderer.invoke('doctor:get-environment'),
  getMockSnapshot: () => ipcRenderer.invoke('doctor:get-mock-snapshot')
};

contextBridge.exposeInMainWorld('doctor', doctorApi);
