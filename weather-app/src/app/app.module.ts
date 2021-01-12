import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { WeatherWidgetComponent } from './weather-widget/weather-widget.component';
import { ConfigService } from './services/config.service';

const appInitFunction = (configService: ConfigService) => {
  return () => {
    return configService.loadConfiguration();
  };
};

@NgModule({
  declarations: [AppComponent, WeatherWidgetComponent],
  imports: [BrowserModule, AppRoutingModule, HttpClientModule],
  providers: [
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: appInitFunction,
      multi: true,
      deps: [ConfigService],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
