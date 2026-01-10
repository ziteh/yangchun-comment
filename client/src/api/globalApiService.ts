import type { ApiService } from './apiService';

class GlobalApiService {
  private instance: ApiService | null = null;

  setInstance(service: ApiService): void {
    this.instance = service;
  }

  getInstance(): ApiService {
    if (!this.instance) {
      throw new Error('ApiService instance is not set');
    }
    return this.instance;
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }

  clear(): void {
    this.instance = null;
  }
}

export const globalApiService = new GlobalApiService();
