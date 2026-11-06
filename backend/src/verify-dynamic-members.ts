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
  console.log('--- STARTING DYNAMIC ROOM MEMBERS VERIFICATION ---');

  // Step 1: Register Alice
  const aliceEmail = `alice_${Date.now()}@taskflow.dev`;
  console.log(`[Step 1] Registering Alice (${aliceEmail})...`);
  const aliceReg = await makeRequest('POST', '/api/auth/register', {
    displayName: 'Alice Engineer',
    email: aliceEmail,
    password: 'Password123!',
  });
  if (aliceReg.status !== 201) throw new Error('Failed to register Alice: ' + JSON.stringify(aliceReg.body));
  const aliceToken = aliceReg.body.token;
  console.log('✅ Alice registered with ID:', aliceReg.body.user.id);

  // Step 2: Alice creates a new private room
  console.log('\n[Step 2] Alice creates private room "Design Sprint Alpha"...');
  const roomRes = await makeRequest('POST', '/api/rooms', { name: 'Design Sprint Alpha' }, aliceToken);
  if (roomRes.status !== 201) throw new Error('Failed to create room: ' + JSON.stringify(roomRes.body));
  const inviteCode = roomRes.body.room.inviteCode;
  console.log(`✅ Private room created with unique invite code: ${inviteCode}`);

  // Step 3: Check room members - MUST ONLY BE ALICE (No Sarah, No Alex, No dummy members)
  console.log('\n[Step 3] Verifying room members for Alice only...');
  const membersRes1 = await makeRequest('GET', `/api/rooms/${inviteCode}/members`, undefined, aliceToken);
  console.log('Status:', membersRes1.status);
  console.log('Members count:', membersRes1.body.members.length);
  const members1 = membersRes1.body.members;
  if (members1.length !== 1) {
    throw new Error(`Expected exactly 1 member, found ${members1.length}: ` + JSON.stringify(members1));
  }
  if (members1[0].displayName !== 'Alice Engineer') {
    throw new Error(`Expected Alice Engineer, got: ${members1[0].displayName}`);
  }
  console.log('✅ PASS: Only Alice is in the room. Zero dummy members found!');

  // Step 4: Register Bob
  const bobEmail = `bob_${Date.now()}@taskflow.dev`;
  console.log(`\n[Step 4] Registering Bob (${bobEmail})...`);
  const bobReg = await makeRequest('POST', '/api/auth/register', {
    displayName: 'Bob Collaborator',
    email: bobEmail,
    password: 'Password123!',
  });
  if (bobReg.status !== 201) throw new Error('Failed to register Bob: ' + JSON.stringify(bobReg.body));
  const bobToken = bobReg.body.token;
  console.log('✅ Bob registered with ID:', bobReg.body.user.id);

  // Step 5: Bob joins Alice's room with invite code
  console.log(`\n[Step 5] Bob enters Alice's room with code [${inviteCode}]...`);
  const joinRes = await makeRequest('POST', '/api/rooms/join', { inviteCode }, bobToken);
  if (joinRes.status !== 200) throw new Error('Bob failed to join room: ' + JSON.stringify(joinRes.body));
  console.log('✅ Bob successfully joined room.');

  // Step 6: Verify room members now dynamically contains BOTH Alice and Bob
  console.log('\n[Step 6] Fetching updated room members for [', inviteCode, ']...');
  const membersRes2 = await makeRequest('GET', `/api/rooms/${inviteCode}/members`, undefined, bobToken);
  console.log('Members count:', membersRes2.body.members.length);
  const memberNames = membersRes2.body.members.map((m: any) => m.displayName);
  console.log('Members list:', memberNames);

  if (membersRes2.body.members.length !== 2) {
    throw new Error(`Expected exactly 2 members, found ${membersRes2.body.members.length}`);
  }
  if (!memberNames.includes('Alice Engineer') || !memberNames.includes('Bob Collaborator')) {
    throw new Error('Both Alice and Bob must be present in room members!');
  }
  console.log('✅ PASS: Room members now dynamically includes invited account Bob Collaborator!');

  console.log('\n🎉 ALL DYNAMIC ROOM MEMBERS VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
