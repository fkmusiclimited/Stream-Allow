-- Stream Join PostgreSQL Production Database Schema
-- Compatible with PostgreSQL 14, 15, 16, and 17 (Hostinger Ubuntu 24.04 VPS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'manager', 'support', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('Active', 'Suspended', 'Pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stream_status_enum AS ENUM ('live', 'scheduled', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stream_privacy_enum AS ENUM ('Public', 'Unlisted', 'Private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE playlist_status_enum AS ENUM ('Active', 'Scheduled', 'Ended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE process_state_enum AS ENUM ('starting', 'running', 'reconnecting', 'stopped', 'crashed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('Paid', 'Pending', 'Failed', 'Refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    phone VARCHAR(50),
    status user_status_enum NOT NULL DEFAULT 'Active',
    max_concurrent_streams INT NOT NULL DEFAULT 1,
    storage_quota_mb INT NOT NULL DEFAULT 5120, -- 5GB
    used_storage_mb INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Roles & Permissions Table
CREATE TABLE IF NOT EXISTS roles_permissions (
    role user_role_enum PRIMARY KEY,
    description TEXT NOT NULL,
    can_manage_users BOOLEAN NOT NULL DEFAULT false,
    can_manage_all_streams BOOLEAN NOT NULL DEFAULT false,
    can_manage_billing BOOLEAN NOT NULL DEFAULT false,
    can_view_vps_metrics BOOLEAN NOT NULL DEFAULT false,
    can_manage_system_settings BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{}'
);

-- 3. Uploaded Media Table (Original source files on VPS)
CREATE TABLE IF NOT EXISTS uploaded_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    formatted_duration VARCHAR(20) NOT NULL DEFAULT '00:00',
    resolution VARCHAR(50) DEFAULT '1080p FHD',
    format VARCHAR(20) DEFAULT 'MP4',
    thumbnail_path TEXT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_media_user ON uploaded_media(user_id);

-- 4. Playlists Table
CREATE TABLE IF NOT EXISTS playlists (
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

CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

-- 5. Playlist Videos Table (Sequential playback queue)
CREATE TABLE IF NOT EXISTS playlist_videos (
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

CREATE INDEX IF NOT EXISTS idx_playlist_videos_pl_order ON playlist_videos(playlist_id, position_order);

-- 6. Live Streams Table (Manual RTMP, AES-256-GCM Encrypted Keys)
CREATE TABLE IF NOT EXISTS live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'Music',
    privacy stream_privacy_enum DEFAULT 'Public',
    thumbnail_url TEXT,
    
    -- RTMP Configuration
    stream_url TEXT NOT NULL DEFAULT 'rtmp://a.rtmp.youtube.com/live2',
    encrypted_stream_key TEXT NOT NULL,
    stream_key_iv VARCHAR(64) NOT NULL,
    stream_key_auth_tag VARCHAR(64) NOT NULL,
    
    -- Dual Stream Options
    is_dual_stream BOOLEAN NOT NULL DEFAULT false,
    backup_rtmp_url TEXT,
    
    -- Encoding profile
    resolution VARCHAR(50) DEFAULT '1080p60',
    video_bitrate_kbps INT DEFAULT 4500,
    audio_bitrate_kbps INT DEFAULT 128,
    fps INT DEFAULT 30,
    
    -- Stream status & metrics
    status stream_status_enum NOT NULL DEFAULT 'scheduled',
    current_viewers INT NOT NULL DEFAULT 0,
    total_views INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    auto_restart_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);

-- 7. Stream Background Processes (One OS child process per stream)
CREATE TABLE IF NOT EXISTS stream_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID UNIQUE NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pid INT,
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

-- 8. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
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

-- 9. User Subscriptions Table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Payments & Billing Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES subscription_plans(id),
    amount_usd DECIMAL(10,2) NOT NULL,
    amount_bdt DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    gateway VARCHAR(50) NOT NULL DEFAULT 'bKash',
    transaction_ref VARCHAR(255),
    status payment_status_enum NOT NULL DEFAULT 'Pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- 11. VPS System Metrics Table (CPU, RAM, Disk, Active Processes)
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGSERIAL PRIMARY KEY,
    total_cpu_usage_percent NUMERIC(5,2) NOT NULL,
    total_memory_usage_mb NUMERIC(10,2) NOT NULL,
    free_memory_mb NUMERIC(10,2) NOT NULL,
    active_ffmpeg_processes INT NOT NULL,
    disk_used_gb NUMERIC(10,2) NOT NULL,
    disk_total_gb NUMERIC(10,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'stream',
    ip_address VARCHAR(50) DEFAULT '103.52.12.45',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- 13. Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
