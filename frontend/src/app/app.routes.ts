import { Routes } from '@angular/router';
import { authAndPermissionGuard, authAndPermissionChildGuard } from './core/guards/auth-and-permission.guard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'callback',
    loadComponent: () => import('./auth/callback.component').then(m => m.CallbackComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./business/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'menu',
    loadComponent: () => import('./business/menu.component').then(m => m.MenuComponent),
    canActivate: [authAndPermissionGuard],
    data: { screenId: 'MENU_SCREEN', typeId: 'B', api2Start: '08:00', api2End: '23:59' }
  },
  {
    path: 'business/data',
    loadComponent: () => import('./business/sample-data.component').then(m => m.SampleDataComponent),
    canActivate: [authAndPermissionGuard],
    data: { screenId: 'BUSINESS_DATA_SCREEN', typeId: 'C', api1Start: '08:00', api1End: '21:00' }
  },
  {
    path: 'admin/management',
    loadComponent: () => import('./business/admin-management.component').then(m => m.AdminManagementComponent),
    canActivate: [authAndPermissionGuard],
    data: { screenId: 'ADMIN_MANAGEMENT_SCREEN', typeId: 'B', api2Start: '08:00', api2End: '23:59' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./business/settings/settings.component').then(m => m.SettingsComponent),
    canActivateChild: [authAndPermissionChildGuard],
    data: { screenId: 'SETTINGS_SCREEN', typeId: 'A', api1Start: '08:00', api1End: '21:00', api2Start: '08:00', api2End: '23:59' }
  },
  {
    path: 'error/auth',
    loadComponent: () => import('./shared/auth-error.component').then(m => m.AuthErrorComponent)
  },
  {
    path: 'error/forbidden',
    loadComponent: () => import('./shared/forbidden-error.component').then(m => m.ForbiddenErrorComponent)
  },
  {
    path: 'logout',
    loadComponent: () => import('./auth/logout-complete.component').then(m => m.LogoutCompleteComponent)
  },
  { path: '**', redirectTo: '/login' }
];
