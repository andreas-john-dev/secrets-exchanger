// feature.routes.ts
import { Routes } from '@angular/router';
import { PublicComponent } from './public.component';

export const routes: Routes = [
  {
    path: '',
    component: PublicComponent,
    children: [
      {
        path: '',
        redirectTo: 'create-secret',
        pathMatch: 'full',
      },
      {
        path: 'create-secret',
        loadComponent: () =>
            import('./create-secret/create-secret.component').then((m) => m.CreateSecretComponent),
      },
      {
        path: 'read-secret',
        loadComponent: () =>
            import('./read-secret/read-secret.component').then((m) => m.ReadSecretComponent),
      },
    ],
  }
];