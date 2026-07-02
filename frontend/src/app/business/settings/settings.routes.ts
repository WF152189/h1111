import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * 設定画面の子ルート定義（Lazy Load方式）
 */
const settingsChildRoutes: Routes = [
  { path: '', redirectTo: 'user', pathMatch: 'full' },
  {
    path: 'user',
    loadComponent: () => import('./user-settings.component').then(m => m.UserSettingsComponent),
    data: { screenId: 'SETTINGS_USER_SCREEN', api1Start: '08:00', api1End: '21:00', api2Start: '00:00', api2End: '23:59' }
  },
  {
    path: 'system',
    loadComponent: () => import('./system-settings.component').then(m => m.SystemSettingsComponent),
    data: { screenId: 'SETTINGS_SYSTEM_SCREEN', api1Start: '08:00', api1End: '21:00', api2Start: '00:00', api2End: '23:59' }
  },
  {
    path: 'security',
    loadComponent: () => import('./security-settings.component').then(m => m.SecuritySettingsComponent),
    data: { screenId: 'SETTINGS_SECURITY_SCREEN', api1Start: '08:00', api1End: '21:00', api2Start: '00:00', api2End: '23:59' }
  },
  {
    path: 'notification',
    loadComponent: () => import('./notification-settings.component').then(m => m.NotificationSettingsComponent),
    data: { screenId: 'SETTINGS_NOTIFICATION_SCREEN', api1Start: '08:00', api1End: '21:00', api2Start: '00:00', api2End: '23:59' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(settingsChildRoutes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { };

