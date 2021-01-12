import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface WeatherData {
  temperature: number;
  tempMin: number;
  tempMax: number;
  main: string;
  description: string;
  windSpeed: number;
  sunrise: Date;
  sunset: Date;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  constructor(private http: HttpClient, private configService: ConfigService) {}

  getWeather(): Observable<WeatherData> {
    return this.http.get(this.configService.getConfiguration().apiUrl).pipe(
      map((response: any) => {
        const weatherData: WeatherData = {
          temperature: parseInt(response['main']['temp']),
          tempMin: parseInt(response['main']['temp_min']),
          tempMax: parseInt(response['main']['temp_max']),
          main: response['weather'][0]['main'],
          description: response['weather'][0]['description'],
          windSpeed: parseFloat(response['wind']['speed']),
          sunrise: new Date(parseInt(response['sys']['sunrise']) * 1000),
          sunset: new Date(parseInt(response['sys']['sunset']) * 1000),
        };
        return weatherData;
      })
    );
  }
}
