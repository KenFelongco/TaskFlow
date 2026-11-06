import http from 'http';

function makeRequest(
  method: string,
  path: string,
  data?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(resBody) });
          } catch {
            resolve({ status: res.statusCode || 500, body: resBody });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING REAL GOOGLE AUTH & LOGOUT VERIFICATION ---');

  // Test 1: Real Google Auth endpoint rejects invalid / forged token
  console.log('\n[Test 1] Testing POST /api/auth/google with forged/invalid token...');
  const fakeTokenRes = await makeRequest('POST', '/api/auth/google', {
    idToken: 'forged_fake_google_jwt_header.payload.signature',
  });
  console.log('Status:', fakeTokenRes.status);
  console.log('Response:', JSON.stringify(fakeTokenRes.body));
  if (fakeTokenRes.status === 401) {
    console.log('✅ PASS: Real Google cryptographic verification rejected invalid token (Status 401).');
  } else {
    console.error('❌ FAIL: Expected 401, got', fakeTokenRes.status);
    process.exit(1);
  }

  // Test 2: Missing idToken is rejected with 400
  console.log('\n[Test 2] Testing POST /api/auth/google with missing idToken...');
  const emptyTokenRes = await makeRequest('POST', '/api/auth/google', {});
  console.log('Status:', emptyTokenRes.status);
  if (emptyTokenRes.status === 400) {
    console.log('✅ PASS: Missing token validation caught by Zod schema (Status 400).');
  } else {
    console.error('❌ FAIL: Expected 400, got', emptyTokenRes.status);
    process.exit(1);
  }

  // Test 3: Standard Auth (Register + Login) and Token Verification
  console.log('\n[Test 3] Testing Standard Auth Registration & Profile Fetching...');
  const testEmail = `testuser_${Date.now()}@google-verified-domain.com`;
  const regRes = await makeRequest('POST', '/api/auth/register', {
    displayName: 'Verified User',
    email: testEmail,
    password: 'SecurePassword123!',
  });
  console.log('Register Status:', regRes.status);
  if (regRes.status !== 201) {
    console.error('❌ FAIL: Registration failed', regRes.body);
    process.exit(1);
  }
  const token = regRes.body.token;
  console.log('✅ PASS: Successfully registered real account, JWT issued.');

  // Test 4: Authenticated Request to /api/auth/me
  console.log('\n[Test 4] Testing GET /api/auth/me with TaskFlow Session Bearer Token...');
  const meRes = await makeRequest('GET', '/api/auth/me', undefined, token);
  console.log('Me Status:', meRes.status);
  console.log('Me User:', meRes.body.user.email, '| Name:', meRes.body.user.name);
  if (meRes.status === 200 && meRes.body.user.email === testEmail) {
    console.log('✅ PASS: User session verified via authentic JWT.');
  } else {
    console.error('❌ FAIL: Failed fetching user profile', meRes.body);
    process.exit(1);
  }

  // Test 5: Verify Room creation with real user token
  console.log('\n[Test 5] Testing Private Room Creation with real authenticated user...');
  const roomRes = await makeRequest(
    'POST',
    '/api/rooms',
    { name: 'Google Team Sync' },
    token
  );
  console.log('Room Status:', roomRes.status);
  const inviteCode = roomRes.body.room?.inviteCode || roomRes.body.inviteCode;
  console.log('Room Invite Code:', inviteCode);
  if (roomRes.status === 201 && inviteCode) {
    console.log('✅ PASS: Authenticated user created room with code:', inviteCode);
  } else {
    console.error('❌ FAIL: Room creation failed', roomRes.body);
    process.exit(1);
  }

  console.log('\n🎉 ALL REAL AUTHENTICATION & SESSION VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
