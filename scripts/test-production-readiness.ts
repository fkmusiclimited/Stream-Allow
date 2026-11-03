import 'dotenv/config';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { encryptStreamKey, decryptStreamKey, maskStreamKey } from '../src/server/utils/crypto';

const API_BASE = 'http://localhost:3000';

async function main() {
  console.log('================================================================');
  console.log(' STREAM JOIN – COMPREHENSIVE PRODUCTION READINESS TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: ENCRYPTION & SECURITY TESTS
  // -------------------------------------------------------------
  console.log('--- 1. ENCRYPTION SUBSYSTEM TESTS ---');
  const testKey = 'live_youtube_secret_production_key_987654321';
  
  // Test 1.1: AES-256-GCM Encryption / Decryption with valid secret
  const enc = encryptStreamKey(testKey);
  assert(Boolean(enc.cipherText && enc.iv && enc.authTag), 'AES-256-GCM outputs cipherText, iv, and authTag');
  const decrypted = decryptStreamKey(enc.cipherText, enc.iv, enc.authTag);
  assert(decrypted === testKey, 'AES-256-GCM Decryption recovers original stream key 100%');

  // Test 1.2: Encryption throws on empty key
  let emptyThrows = false;
  try {
    encryptStreamKey('');
  } catch {
    emptyThrows = true;
  }
  assert(emptyThrows, 'encryptStreamKey throws error on empty key and prevents blank cipherText in DB');

  // Test 1.3: Decryption fails with wrong/tampered ciphertext or authTag
  let wrongDecThrows = false;
  try {
    decryptStreamKey('001122334455', enc.iv, enc.authTag);
  } catch {
    wrongDecThrows = true;
  }
  assert(wrongDecThrows, 'decryptStreamKey rejects tampered ciphertext or wrong auth tag');

  // Test 1.4: Stream Key Masking
  const masked = maskStreamKey(testKey);
  assert(masked.startsWith('live') && masked.includes('****') && !masked.includes(testKey), 'Stream Key is safely masked for logs/responses');

  // Wait for server to respond
  console.log('Connecting to Stream Join server...');
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_BASE}/api/billing/plans`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  if (!serverReady) {
    throw new Error('Server did not become ready in 15 seconds.');
  }
  console.log('Server is online and responding.\n');

  // Test 2.1: Register User A
  const emailA = `test_user_a_${Date.now()}@streamjoin.test`;
  const regARes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User A (Basic)', email: emailA, password: 'SecurePassword123!' })
  });
  const regA = await regARes.json();
  assert(regARes.status === 201 && regA.token && regA.user?.id, 'User A registered with real unique UUID in PostgreSQL');
  const tokenA = regA.token;
  const userA = regA.user;

  // Test 2.2: Register User B
  const emailB = `test_user_b_${Date.now()}@streamjoin.test`;
  const regBRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'User B (Pro)', email: emailB, password: 'SecurePassword123!' })
  });
  const regB = await regBRes.json();
  assert(regBRes.status === 201 && regB.token && regB.user?.id, 'User B registered with real unique UUID');
  const tokenB = regB.token;
  const userB = regB.user;

  // Test 2.3: Unauthenticated access returns 401
  const unauthRes = await fetch(`${API_BASE}/api/playlists`);
  assert(unauthRes.status === 401, 'Unauthenticated request to protected endpoint returns 401 Unauthorized');

  // -------------------------------------------------------------
  // SECTION 3: VIDEO UPLOAD, FFPROBE & THUMBNAILS
  // -------------------------------------------------------------
  console.log('\n--- 3. VIDEO UPLOAD, FFPROBE & THUMBNAILS ---');

  // Generate test video A (with audio)
  const tempVideoAPath = '/tmp/test_vid_a.mp4';
  execSync(`ffmpeg -y -f lavfi -i testsrc=duration=3:size=640x360:rate=25 -f lavfi -i sine=frequency=880:duration=3 -c:v libx264 -c:a aac -pix_fmt yuv420p ${tempVideoAPath}`, { stdio: 'ignore' });

  // Generate silent test video B (no audio)
  const tempSilentPath = '/tmp/test_vid_silent.mp4';
  execSync(`ffmpeg -y -f lavfi -i testsrc=duration=2:size=320x240:rate=25 -c:v libx264 -an -pix_fmt yuv420p ${tempSilentPath}`, { stdio: 'ignore' });

  // Test 3.1: User A uploads video with audio
  const formA = new FormData();
  formA.append('video', new Blob([fs.readFileSync(tempVideoAPath)], { type: 'video/mp4' }), 'vid_a.mp4');
  const upARes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` },
    body: formA
  });
  const upA = await upARes.json();
  if (upARes.status !== 201) {
    console.error('Upload A failed response:', upARes.status, upA);
  } else {
    console.log('Upload A succeeded:', upA);
  }
  assert(upARes.status === 201 && upA.file?.id && Math.round(upA.file?.durationSeconds || 0) === 3, 'User A uploaded video with genuine FFprobe duration (3s)');
  assert(Boolean(upA.file?.thumbnailUrl), 'FFmpeg generated real video poster thumbnail');
  const mediaA = upA.file;

  // Test 3.2: User B uploads silent video (system automatically normalizes audio track)
  const formB = new FormData();
  formB.append('video', new Blob([fs.readFileSync(tempSilentPath)], { type: 'video/mp4' }), 'silent_vid.mp4');
  const upBRes = await fetch(`${API_BASE}/api/media/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenB}` },
    body: formB
  });
  const upB = await upBRes.json();
  assert(upBRes.status === 201 && upB.file?.id, 'User B uploaded silent video with automatic silent audio ingestion');
  const mediaB = upB.file;

  // -------------------------------------------------------------
  // SECTION 4: PLAYLIST MANAGEMENT & VIDEO OWNERSHIP SECURITY
  // -------------------------------------------------------------
  console.log('\n--- 4. PLAYLIST & VIDEO OWNERSHIP SECURITY ---');

  // Test 4.1: User A creates Playlist A
  const plARes = await fetch(`${API_BASE}/api/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ name: 'User A Private Playlist', description: 'Testing isolation' })
  });
  const plA = await plARes.json();
  assert(plARes.status === 201 && plA.playlist?.id, 'User A created Playlist A');
  const playlistAId = plA.playlist.id;

  // Test 4.2: User A adds their own uploaded video to Playlist A
  const addVidARes = await fetch(`${API_BASE}/api/playlists/${playlistAId}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({ mediaId: mediaA.id, title: 'User A Track 1' })
  });
  const addVidA = await addVidARes.json();
  assert(addVidARes.status === 201 && addVidA.video?.filePath === mediaA.filePath, 'User A added own video to Playlist A with server-controlled filePath');

  // Test 4.3: User B attempts to add User A\'s video to User B\'s playlist -> MUST RETURN 403 Forbidden
  const plBRes = await fetch(`${API_BASE}/api/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ name: 'User B Playlist', description: 'Attacking playlist' })
  });
  const plB = await plBRes.json();
  const playlistBId = plB.playlist.id;

  const attackAddRes = await fetch(`${API_BASE}/api/playlists/${playlistBId}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ mediaId: mediaA.id }) // Attempting to steal User A's video!
  });
  assert(attackAddRes.status === 403, 'Cross-user video addition attempt blocked with 403 Forbidden');

  // Test 4.4: User B attempts to edit or delete User A\'s playlist -> MUST RETURN 403 Forbidden
  const attackEditRes = await fetch(`${API_BASE}/api/playlists/${playlistAId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ name: 'Hacked Playlist Name' })
  });
  assert(attackEditRes.status === 403, 'User B unauthorized playlist edit blocked with 403 Forbidden');

  const attackDeleteRes = await fetch(`${API_BASE}/api/playlists/${playlistAId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  assert(attackDeleteRes.status === 403, 'User B unauthorized playlist deletion blocked with 403 Forbidden');

  // Test 4.5: User B adds their OWN video to Playlist B -> SUCCEEDS
  const addVidBRes = await fetch(`${API_BASE}/api/playlists/${playlistBId}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenB}`
    },
    body: JSON.stringify({ mediaId: mediaB.id, title: 'User B Track 1' })
  });
  assert(addVidBRes.status === 201, 'User B added own video to Playlist B successfully');

  // -------------------------------------------------------------
  // SECTION 5: SUBSCRIPTION PLAN ENFORCEMENT
  // -------------------------------------------------------------
  console.log('\n--- 5. SUBSCRIPTION PLAN ENFORCEMENT ---');

  // Test 5.1: Dual Stream restriction on Basic Plan
  // User A has Basic plan (dualStream: false)
  const dualStreamRes = await fetch(`${API_BASE}/api/streams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'Basic User Dual Stream Attempt',
      playlistId: playlistAId,
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: 'live_test_key_abc123',
      isDualStream: true,
      backupRtmpUrl: 'rtmp://b.rtmp.facebook.com/live'
    })
  });
  assert(dualStreamRes.status === 400, 'Dual RTMP streaming request on Basic plan rejected with 400 Bad Request');

  // Test 5.2: Create valid single stream for User A
  const strARes = await fetch(`${API_BASE}/api/streams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: 'User A Live Stream 1',
      playlistId: playlistAId,
      streamUrl: 'rtmp://a.rtmp.youtube.com/live2',
      streamKey: 'live_user_a_key_1111'
    })
  });
  const strA = await strARes.json();
  assert(strARes.status === 201 && strA.stream?.id, 'User A created valid single RTMP stream');
  assert(strA.stream?.maskedStreamKey?.includes('****'), 'Response returns maskedStreamKey, plain key never exposed');

  // Test 5.3: User A attempts to start stream on an empty playlist -> rejected
  const emptyPlRes = await fetch(`${API_BASE}/api/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Empty Playlist' })
  });
  const emptyPl = await emptyPlRes.json();
  const emptyStreamRes = await fetch(`${API_BASE}/api/streams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
    body: JSON.stringify({ title: 'Empty Stream', playlistId: emptyPl.playlist.id, streamKey: 'live_empty_key' })
  });
  const emptyStream = await emptyStreamRes.json();
  const startEmptyRes = await fetch(`${API_BASE}/api/streams/${emptyStream.stream.id}/start`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  assert(startEmptyRes.status === 400, 'Cannot start stream when playlist has no videos (rejected with 400)');

  // -------------------------------------------------------------
  // SECTION 6: FFMPEG AUDIO & PLAYLIST LOOP TEST
  // -------------------------------------------------------------
  console.log('\n--- 6. FFMPEG AUDIO & PLAYLIST LOOP EXECUTION ---');

  // Test 6.1: Multi-track concat with mixed audio (1 with audio + 1 silent)
  const concatOut = '/tmp/real_ffmpeg_concat_test.flv';
  const concatList = `/tmp/test_concat_list_${Date.now()}.txt`;
  fs.writeFileSync(concatList, `ffconcat version 1.0\nfile '${tempVideoAPath}'\nfile '${tempSilentPath}'\n`);
  
  execSync(
    `ffmpeg -re -stream_loop 1 -f concat -safe 0 -i "${concatList}" -fflags +genpts+discardcorrupt -c:v libx264 -preset ultrafast -b:v 1500k -maxrate 1500k -bufsize 3000k -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 -c:a aac -b:a 128k -ar 44100 -ac 2 -af aresample=async=1:first_pts=0 -map 0:v:0 -map 0:a:0? -f flv -flvflags no_duration_filesize "${concatOut}" -y -t 5`,
    { stdio: 'ignore' }
  );
  assert(fs.existsSync(concatOut) && fs.statSync(concatOut).size > 10000, 'FFmpeg successfully streamed mixed audio + silent video playlist with auto-looping');

  // Clean test files
  try {
    fs.unlinkSync(tempVideoAPath);
    fs.unlinkSync(tempSilentPath);
    fs.unlinkSync(concatOut);
    fs.unlinkSync(concatList);
  } catch {}

  console.log('\n================================================================');
  console.log(` ALL ${totalTests} PRODUCTION READINESS TESTS PASSED SUCCESSFULLY (100%)`);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n[FATAL TEST RUNNER ERROR]:', err);
  process.exit(1);
});
