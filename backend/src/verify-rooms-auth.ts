// Automated verification for Google & Email Auth and Private Rooms with Unique Invite Codes
async function runTest() {
  const baseUrl = 'http://localhost:5000/api';
  console.log('🧪 Starting TaskFlow Auth & Private Rooms Verification...\n');

  // 1. Fetch Demo Accounts
  console.log('1️⃣ Testing GET /api/auth/demo-accounts');
  const demoRes = await fetch(`${baseUrl}/auth/demo-accounts`);
  const demoData: any = await demoRes.json();
  console.log(`   Found ${demoData.demoAccounts?.length} demo accounts.`);
  const sarah = demoData.demoAccounts.find((a: any) => a.displayName === 'Sarah Chen');
  if (!sarah) throw new Error('Sarah Chen demo account not found');
  console.log(`   ✅ Demo account token retrieved for ${sarah.displayName}`);

  // 2. Google Auth
  console.log('\n2️⃣ Testing POST /api/auth/google (Google Sign-In)');
  const googleRes = await fetch(`${baseUrl}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'alex.google@gmail.com',
      displayName: 'Alex (Google)',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80',
      googleId: 'g_109283748291',
    }),
  });
  const googleData: any = await googleRes.json();
  console.log(`   Google Auth Response: ${googleData.message}`);
  const alexToken = googleData.token;
  console.log(`   ✅ Google user logged in with ID: ${googleData.user?.id}`);

  // 3. Create Private Room as Sarah Chen
  console.log('\n3️⃣ Testing POST /api/rooms (Create Private Room with Unique Invite Code)');
  const createRoomRes = await fetch(`${baseUrl}/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sarah.token}`,
    },
    body: JSON.stringify({
      name: 'Mobile Core Alpha Sprint',
    }),
  });
  const createRoomData: any = await createRoomRes.json();
  const inviteCode = createRoomData.inviteCode;
  console.log(`   Created Room: "${createRoomData.room?.name}"`);
  console.log(`   Generated Unique Invite Code: 🔑 ${inviteCode}`);
  console.log(`   Is Private: ${createRoomData.room?.isPrivate}`);
  if (!inviteCode || !inviteCode.startsWith('TF-')) {
    throw new Error('Invalid invite code generated!');
  }
  console.log('   ✅ Private room successfully created with unique invite code.');

  // 4. Test Join with WRONG Invite Code (Must Fail)
  console.log('\n4️⃣ Testing POST /api/rooms/join with Invalid Code (Should be rejected)');
  const invalidJoinRes = await fetch(`${baseUrl}/rooms/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alexToken}`,
    },
    body: JSON.stringify({
      inviteCode: 'TF-INVALID-CODE',
    }),
  });
  console.log(`   HTTP Status: ${invalidJoinRes.status} (Expected 404)`);
  const invalidData: any = await invalidJoinRes.json();
  console.log(`   Response: "${invalidData.error}"`);
  if (invalidJoinRes.status !== 404) throw new Error('Invalid code was not rejected!');
  console.log('   ✅ Privacy enforced: Unauthorized access rejected.');

  // 5. Test Join with CORRECT Unique Invite Code (Should Succeed)
  console.log('\n5️⃣ Testing POST /api/rooms/join with Valid Unique Code');
  const validJoinRes = await fetch(`${baseUrl}/rooms/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${alexToken}`,
    },
    body: JSON.stringify({
      inviteCode,
    }),
  });
  const validJoinData: any = await validJoinRes.json();
  console.log(`   Joined Room: "${validJoinData.room?.name}"`);
  console.log(`   Current Member Count: ${validJoinData.members?.length}`);
  const alexIsMember = validJoinData.members?.some((m: any) => m.displayName.includes('Alex'));
  if (!alexIsMember) throw new Error('Alex was not added to room members!');
  console.log('   ✅ Valid invite code allowed teammate to enter private room.');

  // 6. Test My Rooms listing
  console.log('\n6️⃣ Testing GET /api/rooms/my-rooms for Alex');
  const myRoomsRes = await fetch(`${baseUrl}/rooms/my-rooms`, {
    headers: { Authorization: `Bearer ${alexToken}` },
  });
  const myRoomsData: any = await myRoomsRes.json();
  console.log(`   Alex is a member of ${myRoomsData.rooms?.length} rooms.`);
  const foundRoom = myRoomsData.rooms?.find((r: any) => r.inviteCode === inviteCode);
  if (!foundRoom) throw new Error('Joined room not found in My Rooms!');
  console.log(`   Found joined room: "${foundRoom.name}" with code ${foundRoom.inviteCode}`);
  console.log('   ✅ My Rooms accurately lists private rooms.');

  console.log('\n🎉 ALL 6 BACKEND AUTH & PRIVATE ROOM VERIFICATIONS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
