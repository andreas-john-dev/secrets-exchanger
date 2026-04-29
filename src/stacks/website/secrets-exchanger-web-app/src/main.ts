import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

async function loadRuntimeConfig(): Promise<void> {
  if (!environment.production) return;
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    if (typeof cfg.apiUrl === 'string') {
      environment.apiUrl = cfg.apiUrl.replace(/\/$/, '');
    }
  } catch (err) {
    console.error('Failed to load runtime config', err);
  }
}

loadRuntimeConfig().then(() =>
  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err)),
);
