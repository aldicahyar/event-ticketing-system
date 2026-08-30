import { resolveCorsOrigins } from './cors.utils';

describe('resolveCorsOrigins', () => {
  it('memakai fallback frontend lokal saat CORS_ORIGIN tidak diset di dev', () => {
    expect(resolveCorsOrigins(undefined, 'development')).toEqual(['http://localhost:3001']);
    expect(resolveCorsOrigins('   ', 'development')).toEqual(['http://localhost:3001']);
  });

  it('memecah dan merapikan daftar origin dipisah koma', () => {
    expect(
      resolveCorsOrigins(' http://localhost:3001 , http://localhost:3002 ,, ', 'development'),
    ).toEqual(['http://localhost:3001', 'http://localhost:3002']);
  });

  it('menerima origin https eksplisit di production, termasuk dengan port', () => {
    expect(
      resolveCorsOrigins('https://tix.example.com,https://admin.example.com:8443', 'production'),
    ).toEqual(['https://tix.example.com', 'https://admin.example.com:8443']);
  });

  it('menolak konfigurasi permisif di production', () => {
    expect(() => resolveCorsOrigins('', 'production')).toThrow(/wajib diisi/);
    expect(() => resolveCorsOrigins('*', 'production')).toThrow(/https/);
    expect(() => resolveCorsOrigins('http://tix.example.com', 'production')).toThrow(/https/);
    expect(() => resolveCorsOrigins('https://*.example.com', 'production')).toThrow(/https/);
    expect(() => resolveCorsOrigins('https://tix.example.com/app', 'production')).toThrow(/https/);
  });
});
