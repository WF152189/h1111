export const environment = {
  production: true,
  apiBaseUrl: '',  // 本番API URLを設定
  
  // MSAL設定
  tenantId: 'd5d48991-b228-4abb-a3fc-0e39ef6bbea6',
  clientId: '5ac00f7c-47ef-4242-a36b-0bc2949de139',
  redirectUri: 'http://localhost:4200/callback',
  authority: 'https://login.microsoftonline.com/d5d48991-b228-4abb-a3fc-0e39ef6bbea6',
  
  // スコープ設定
  scopes: ['openid', 'profile', 'email']
};
