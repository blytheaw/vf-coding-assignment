import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private config: AppConfig;

  constructor(private http: HttpClient) {
    this.config = {
      apiUrl: '',
    };
  }

  loadConfiguration() {
    return this.http
      .get<AppConfig>('/assets/appConfig.json')
      .toPromise()
      .then((data) => (this.config = data));
  }

  getConfiguration() {
    return this.config;
  }
}
