# Stream Join — Revised Architecture & PostgreSQL Database Plan

## Executive Summary
This document establishes the revised, enterprise-grade architecture for **Stream Join**. Based on production requirements:
1. **Zero YouTube/Google OAuth Dependency**: All live broadcasts use direct RTMP Stream URLs and AES-256-GCM encrypted Stream Keys provided by users from YouTube Studio.
2. **Dedicated FFmpeg Job Manager**: Each live stream operates as an independent, isolated OS process (`child_process.spawn`) with automatic reconnection, heartbeat health checks, and restart recovery.
3. **VPS Resource & Process Monitoring**: Real-time tracking of CPU, RAM, active transcode streams, and disk bandwidth.
4. **Dual RTMP Streaming Ready**: Native architecture for broadcasting simultaneously to Primary and Backup RTMP destinations using the FFmpeg `tee` muxer.
5. **Zero UI/Code Regressions**: Existing React 19 + Vite frontend views and routes remain completely intact and functional.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Direct RTMP Streaming (No OAuth)**: Eliminates YouTube API quota exhaustion, Google Cloud verification delays, and token expiration. Users simply paste their RTMP URL and Stream Key.
> - **Security & Encryption**: Stream keys are encrypted at rest using `AES-256-GCM` with initialization vectors (`IV`) and authorization tags.
> - **Crash Recovery & Persistence**: If the VPS reboots or Express restarts, a startup reconciliation worker inspects the database and automatically restarts all active 24/7 streams.
> - **Process Isolation**: A crashed or disconnected stream in one account will never affect another user's live stream.

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           Stream Join Client (React 19 + Vite)                          │
│   • 13 Public Pages  • 16 User Dashboard Pages  • 16 Admin Management Pages             │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ REST API / WebSockets / JWT
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            Express.js Backend Engine (server.ts)                        │
│   ├── Auth Service       (JWT, bcrypt, Multi-tenant Tenant Isolation)                   │
│   ├── Media Service      (Video Upload, ffprobe Duration & Auto-Thumbnail Extractor)    │
│   ├── Playlist Service   (Dynamic Sequence Queue, Loop Rules, Re-order Handler)         │
│   ├── Billing Service    (Subscriptions, bKash / Nagad / Stripe, Invoicing)             │
│   └── Resource Monitor   (VPS CPU, RAM, Disk, Active Processes Engine)                  │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┴──────────────────────────┐
               ▼                                                       ▼
┌──────────────────────────────────────────────┐    ┌──────────────────────────────────────────────┐
│       FFmpeg Background Job Supervisor       │    │      PostgreSQL Relational Database          │
│  ├── Isolated Process Pool (One PID/Stream)  │    │  ├── users & roles_permissions               │
│  ├── Automatic Reconnection (Exponential)    │    │  ├── uploaded_media & playlists              │
│  ├── Concat Demuxer Seamless 24/7 Loop       │    │  ├── playlist_videos (Order & Runtime)       │
│  ├── Dual RTMP Engine (tee muxer)            │    │  ├── live_streams (Encrypted Stream Keys)    │
│  └── Crash Recovery & Heartbeat Worker       │    │  ├── stream_processes (PIDs & Resource Stats)│
└──────────────────────┬───────────────────────┘    │  ├── subscriptions & payment_transactions    │
                       │ RTMP Streams               │  └── activity_logs & system_metrics          │
                       ▼                            └──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│           YouTube Live Ingestion             │
│   • Primary RTMP: rtmp://a.rtmp.youtube.com  │
│   • Backup RTMP:  rtmp://b.rtmp.youtube.com  │
└──────────────────────────────────────────────┘
```

---

## 2. PostgreSQL Relational Database Schema

### 1. Users & Roles (`users`, `roles_permissions`)
```sql
CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'manager', 'support', 'user');
CREATE TYPE user_status_enum AS ENUM ('Active', 'Suspended', 'Pending');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    phone VARCHAR(50),
    status user_status_enum NOT NULL DEFAULT 'Active',
    max_concurrent_streams INT NOT NULL DEFAULT 1,
    storage_quota_mb INT NOT NULL DEFAULT 5120, -- 5GB for Basic
    used_storage_mb INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles_permissions (
    role user_role_enum PRIMARY KEY,
    description TEXT NOT NULL,
    can_manage_users BOOLEAN NOT NULL DEFAULT false,
    can_manage_all_streams BOOLEAN NOT NULL DEFAULT false,
    can_manage_billing BOOLEAN NOT NULL DEFAULT false,
    can_view_vps_metrics BOOLEAN NOT NULL DEFAULT false,
    can_manage_system_settings BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{}'
);
```

### 2. Uploaded Media & Storage Library (`uploaded_media`)
```sql
CREATE TABLE uploaded_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,          -- Local VPS path (e.g., /var/streamjoin/media/...)
    file_url TEXT NOT NULL,           -- Public or authenticated streaming URL
    file_size_bytes BIGINT NOT NULL,
    duration_seconds INT NOT NULL,    -- Extracted via ffprobe
    formatted_duration VARCHAR(20) NOT NULL,
    resolution VARCHAR(50) DEFAULT '1080p FHD',
    format VARCHAR(20) DEFAULT 'MP4',
    thumbnail_path TEXT,              -- Generated auto-thumbnail frame
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_uploaded_media_user ON uploaded_media(user_id);
```

### 3. Playlists & Ordered Video Sequences (`playlists`, `playlist_videos`)
```sql
CREATE TYPE playlist_status_enum AS ENUM ('Active', 'Scheduled', 'Ended');

CREATE TABLE playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status playlist_status_enum NOT NULL DEFAULT 'Active',
    is_live_loop BOOLEAN NOT NULL DEFAULT true,
    total_videos INT NOT NULL DEFAULT 0,
    total_runtime_seconds INT NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_id UUID REFERENCES uploaded_media(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    storage_path TEXT,
    duration_seconds INT NOT NULL DEFAULT 0,
    formatted_duration VARCHAR(20) NOT NULL DEFAULT '00:00',
    resolution VARCHAR(50) DEFAULT '1080p FHD',
    thumbnail_url TEXT NOT NULL,
    position_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_playlist_videos_pl_order ON playlist_videos(playlist_id, position_order);
```

### 4. Live Streams & Encrypted RTMP Credentials (`live_streams`)
```sql
CREATE TYPE stream_status_enum AS ENUM ('live', 'scheduled', 'completed', 'failed');
CREATE TYPE stream_privacy_enum AS ENUM ('Public', 'Unlisted', 'Private');

CREATE TABLE live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Music',
    privacy stream_privacy_enum DEFAULT 'Public',
    thumbnail_url TEXT,
    
    -- RTMP Configuration (Encrypted)
    stream_url TEXT NOT NULL DEFAULT 'rtmp://a.rtmp.youtube.com/live2',
    encrypted_stream_key TEXT NOT NULL, -- AES-256-GCM cipher text
    stream_key_iv VARCHAR(64) NOT NULL, -- Initialization Vector
    stream_key_auth_tag VARCHAR(64) NOT NULL, -- GCM Auth Tag
    
    -- Dual RTMP Configuration
    is_dual_stream BOOLEAN NOT NULL DEFAULT false,
    backup_rtmp_url TEXT,
    
    -- Video Output Profile
    resolution VARCHAR(50) DEFAULT '1080p60',
    video_bitrate_kbps INT DEFAULT 4500,
    audio_bitrate_kbps INT DEFAULT 128,
    fps INT DEFAULT 30,
    
    -- Status & Metrics
    status stream_status_enum NOT NULL DEFAULT 'scheduled',
    current_viewers INT NOT NULL DEFAULT 0,
    total_views INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    auto_restart_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_live_streams_user ON live_streams(user_id);
CREATE INDEX idx_live_streams_status ON live_streams(status);
```

### 5. FFmpeg Processes & Health Monitoring (`stream_processes`)
```sql
CREATE TYPE process_state_enum AS ENUM ('starting', 'running', 'reconnecting', 'stopped', 'crashed');

CREATE TABLE stream_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID UNIQUE NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pid INT,                                  -- Linux OS Process ID
    state process_state_enum NOT NULL DEFAULT 'starting',
    restart_attempts INT NOT NULL DEFAULT 0,
    max_restart_attempts INT NOT NULL DEFAULT 10,
    cpu_percent NUMERIC(5,2) DEFAULT 0.0,
    memory_mb NUMERIC(8,2) DEFAULT 0.0,
    fps_output NUMERIC(5,2) DEFAULT 0.0,
    bitrate_output_kbps INT DEFAULT 0,
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6. Subscriptions, Plans & Payments (`subscription_plans`, `user_subscriptions`, `payments`)
```sql
CREATE TABLE subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'basic', 'pro', 'business'
    name VARCHAR(100) NOT NULL,
    price_usd DECIMAL(10,2) NOT NULL,
    price_bdt DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    max_streams INT NOT NULL,
    max_storage_gb INT NOT NULL,
    auto_loop_streaming BOOLEAN NOT NULL DEFAULT true,
    dual_stream_enabled BOOLEAN NOT NULL DEFAULT false,
    priority_support BOOLEAN NOT NULL DEFAULT false,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    amount_usd DECIMAL(10,2) NOT NULL,
    amount_bdt DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    gateway VARCHAR(50) NOT NULL DEFAULT 'bKash',
    transaction_ref VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 7. VPS Resource Metrics & System Audit (`system_metrics`, `activity_logs`)
```sql
CREATE TABLE system_metrics (
    id BIGSERIAL PRIMARY KEY,
    total_cpu_usage_percent NUMERIC(5,2) NOT NULL,
    total_memory_usage_mb NUMERIC(10,2) NOT NULL,
    free_memory_mb NUMERIC(10,2) NOT NULL,
    active_ffmpeg_processes INT NOT NULL,
    disk_used_gb NUMERIC(10,2) NOT NULL,
    disk_total_gb NUMERIC(10,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'stream',
    ip_address VARCHAR(50) DEFAULT '103.52.12.45',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. FFmpeg Job Manager & Live Streaming Architecture

### A. Isolated Process Lifecycle
Each active stream runs as an independent child process via Node.js `child_process.spawn`.
- When a user starts a stream:
  1. The server loads the playlist videos in sequential order.
  2. Generates a temporary FFmpeg concat file (`concat_list.txt`) with continuous looping:
     ```
     ffconcat version 1.0
     file '/var/streamjoin/media/video1.mp4'
     file '/var/streamjoin/media/video2.mp4'
     ```
  3. Decrypts the stream key in memory (never written to disk).
  4. Spawns FFmpeg:
     ```bash
     ffmpeg -re -stream_loop -1 -f concat -safe 0 -i concat_list.txt \
       -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k -pix_fmt yuv420p -g 60 \
       -c:a aac -b:a 128k -ar 44100 \
       -f flv "rtmp://a.rtmp.youtube.com/live2/{DECRYPTED_STREAM_KEY}"
     ```

### B. Dual RTMP Streaming (Future-Ready Tee Muxer)
When `is_dual_stream` is true:
```bash
ffmpeg -re -stream_loop -1 -f concat -safe 0 -i concat_list.txt \
  -c:v libx264 -preset veryfast -b:v 4500k -maxrate 4500k -bufsize 9000k -pix_fmt yuv420p -g 60 \
  -c:a aac -b:a 128k -ar 44100 \
  -f tee -map 0:v -map 0:a \
  "[f=flv:onfail=ignore]rtmp://a.rtmp.youtube.com/live2/{KEY}|[f=flv:onfail=ignore]{BACKUP_RTMP_URL}"
```
*Notice `onfail=ignore`: If the backup destination drops, YouTube Primary remains completely uninterrupted.*

### C. Automatic Reconnection & Process Recovery
1. **Heartbeat Supervisor**: A background worker checks all running PIDs every 5 seconds.
2. **Auto-Reconnect**: If FFmpeg exits with a non-zero code or YouTube closes the RTMP socket, the supervisor applies an exponential backoff (2s, 5s, 10s) and automatically restarts the broadcast up to `max_restart_attempts` (10 times).
3. **Crash Recovery on Server Boot**: When the Express server starts (or after a VPS reboot), a recovery job queries:
   ```sql
   SELECT * FROM live_streams WHERE status = 'live' AND auto_restart_enabled = true;
   ```
   and immediately relaunches each stream in the background without user intervention.

---

## 4. Multi-Tenant Isolation & Admin Permissions

1. **User Isolation**:
   - Every database query for media, playlists, videos, and streams strictly checks `WHERE user_id = $auth_user_id`.
   - Users cannot inspect, alter, or terminate another creator's stream process.
2. **Admin & Super Admin Roles**:
   - `super_admin`: Full access to VPS resource graphs, all users, global stream kill-switches, and payment management.
   - `admin`: User support, ticket handling, and stream moderation.
   - `manager`: Content moderation and subscription review.
   - `user`: Standard creator access to their own playlists and streams.

---

## 5. Implementation Roadmap (Phased & Non-Destructive)

- **Phase 1: Database & ORM Layer**
  - Install `pg` (PostgreSQL client) and configure `src/db/db.ts` with connection pooling.
  - Create database schema and migration script for Hostinger Ubuntu VPS.
- **Phase 2: Encrypted Key Storage & Media Probe API**
  - Implement AES-256-GCM crypto utility for secure stream key encryption/decryption.
  - Implement `/api/media/upload` with `ffprobe` duration extraction and auto-thumbnail frame generation.
- **Phase 3: FFmpeg Background Process Manager**
  - Implement `StreamManager` class inside Express to manage process spawning, PID tracking, and log streaming.
  - Implement `/api/streams/:id/start`, `/api/streams/:id/stop`, `/api/streams/:id/restart`.
- **Phase 4: VPS Resource Monitor & Recovery Hook**
  - Implement CPU/RAM monitoring using `os` module or `pidusage`.
  - Add Express server initialization hook to auto-recover active streams upon launch.
- **Phase 5: Seamless React Context Connection**
  - Hook `AppContext.tsx` dispatchers to the new Express endpoints with optimistic UI updates.
