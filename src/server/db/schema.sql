-- Stream Join PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    plan VARCHAR(50) NOT NULL DEFAULT 'Basic',
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    joined_date VARCHAR(50) DEFAULT 'Today',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS playlists (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'Scheduled',
    is_live_loop BOOLEAN DEFAULT true,
    total_videos INT DEFAULT 0,
    total_runtime VARCHAR(50) DEFAULT '00:00',
    thumbnail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

CREATE TABLE IF NOT EXISTS playlist_videos (
    id VARCHAR(255) PRIMARY KEY,
    playlist_id VARCHAR(255) NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    duration VARCHAR(50) NOT NULL DEFAULT '00:00',
    duration_seconds INT NOT NULL DEFAULT 0,
    resolution VARCHAR(50) DEFAULT '1080p FHD',
    format VARCHAR(50) DEFAULT 'MP4',
    url TEXT NOT NULL,
    file_path TEXT,
    file_size_bytes BIGINT DEFAULT 0,
    thumbnail TEXT,
    position_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_playlist_videos_order ON playlist_videos(playlist_id, position_order);

CREATE TABLE IF NOT EXISTS uploaded_media (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    url TEXT NOT NULL,
    duration_seconds INT DEFAULT 0,
    formatted_duration VARCHAR(50) DEFAULT '00:00',
    resolution VARCHAR(50) DEFAULT '1080p FHD',
    format VARCHAR(50) DEFAULT 'MP4',
    file_size_bytes BIGINT DEFAULT 0,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uploaded_media_user ON uploaded_media(user_id);

CREATE TABLE IF NOT EXISTS live_streams (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    playlist_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    thumbnail TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    viewers INT NOT NULL DEFAULT 0,
    resolution VARCHAR(50) DEFAULT '1080p60',
    bitrate VARCHAR(50) DEFAULT '4500 kbps',
    stream_url TEXT NOT NULL DEFAULT 'rtmp://a.rtmp.youtube.com/live2',
    is_dual_stream BOOLEAN NOT NULL DEFAULT false,
    backup_rtmp_url TEXT DEFAULT '',
    category VARCHAR(100) DEFAULT 'Music',
    privacy VARCHAR(50) DEFAULT 'Public',
    encrypted_key_cipher TEXT NOT NULL,
    encrypted_key_iv VARCHAR(64) NOT NULL,
    encrypted_key_tag VARCHAR(64) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams(status);

CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    plan VARCHAR(100) NOT NULL,
    amount_usd NUMERIC(10,2) DEFAULT 0,
    amount_bdt NUMERIC(10,2) DEFAULT 0,
    currency VARCHAR(20) DEFAULT 'BDT',
    status VARCHAR(50) DEFAULT 'Paid',
    gateway VARCHAR(50) DEFAULT 'bKash',
    transaction_ref VARCHAR(255),
    date_str VARCHAR(50) DEFAULT 'Today',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    action TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'system',
    ip_address VARCHAR(100) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
