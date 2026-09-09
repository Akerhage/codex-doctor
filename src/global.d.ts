import type { DoctorApi } from './shared/contracts';

declare global {
  interface Window {
    doctor: DoctorApi;
  }
}

export {};
