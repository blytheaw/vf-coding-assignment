import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { WeatherData, WeatherService } from '../services/weather.service';

@Component({
  selector: 'app-weather-widget',
  templateUrl: './weather-widget.component.html',
  styleUrls: ['./weather-widget.component.scss'],
})
export class WeatherWidgetComponent implements OnInit {
  weather: Observable<WeatherData>;

  constructor(private weatherService: WeatherService) {
    this.weather = this.weatherService.getWeather();
  }

  ngOnInit(): void {}
}
