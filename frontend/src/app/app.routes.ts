import { Routes } from '@angular/router';
import { AuthGuard, AuthChildGuard } from './core/guards/auth.guard';
import { permissionGuard, permissionChildGuard } from './core/guards/permission.guard';

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
    canActivate: [AuthGuard]
  },
  {
    path: 'business/data',
    loadComponent: () => import('./business/sample-data.component').then(m => m.SampleDataComponent),
    canActivate: [AuthGuard, permissionGuard],
    data: { screenId: 'BUSINESS_DATA_SCREEN' }
  },
  {
    path: 'admin/management',
    loadComponent: () => import('./business/admin-management.component').then(m => m.AdminManagementComponent),
    canActivate: [AuthGuard, permissionGuard],
    data: { screenId: 'ADMIN_MANAGEMENT_SCREEN' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./business/settings/settings.component').then(m => m.SettingsComponent),
    canActivateChild: [AuthChildGuard, permissionChildGuard],
    data: { screenId: 'SETTINGS_SCREEN' }
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
