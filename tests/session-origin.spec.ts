import {test,expect} from '@playwright/test';

// No account is created: an empty body must reach validation for the real
// browser origin, and must be rejected earlier for other origins.
test('local admin accepts the browser host, rejects foreign, missing and null origins',async({request,baseURL})=>{
  const origin=new URL(baseURL!).origin;
  const valid=await request.post('/api/admin/session/',{headers:{Origin:origin},data:{}});
  expect(valid.status()).toBe(400);
  expect((await valid.json()).error).toContain('email hợp lệ');
  expect((await request.post('/api/frames/',{headers:{Origin:origin},data:{}})).status()).toBe(401);
  for(const headers of [{Origin:'https://untrusted.example'},{Origin:'null'},{}] as Record<string,string>[]){
    expect((await request.post('/api/admin/session/',{headers,data:{}})).status()).toBe(403);
  }
  const wrongHost=new URL(origin);wrongHost.hostname='localhost';
  expect((await request.post('/api/admin/session/',{headers:{Origin:wrongHost.origin},data:{}})).status()).toBe(403);
  // A forwarded header must never replace the browser's actual host.
  expect((await request.post('/api/admin/session/',{headers:{Origin:'https://untrusted.example','X-Forwarded-Host':'untrusted.example'},data:{}})).status()).toBe(403);
});

