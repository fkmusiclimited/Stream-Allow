import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Users,
  Eye,
  Sparkles,
  Send,
  ShieldCheck,
  SkipForward,
  SkipBack,
  Repeat
} from 'lucide-react';

export const LiveVideoPlayerModal: React.FC = () => {
  const {
    activeViewingStream,
    setActiveViewingStream,
    streams,
    playlists,
    showToast
  } = useApp();

  // Always read fresh stream state (including live currentTrackIndex & currentTrackStartedAt)
  const liveStream = streams.find(s => s.id === activeViewingStream?.id) || activeViewingStream;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [elapsedDisplay, setElapsedDisplay] = useState('00:00');

  // Find linked playlist if any
  const linkedPlaylist = playlists.find(
    p => p.id === liveStream?.playlistId ||
      (liveStream?.title && p.name && p.name.trim().toLowerCase() === liveStream.title.trim().toLowerCase())
  );
  const playlistTracks = linkedPlaylist?.videos || [];
  const safeTrackIndex = playlistTracks.length > 0
    ? ((currentTrackIndex % playlistTracks.length) + playlistTracks.length) % playlistTracks.length
    : 0;
  const currentTrack = playlistTracks[safeTrackIndex];

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const lastSyncedKeyRef = React.useRef<string>('');
  const pendingSeekRef = React.useRef<number | null>(null);

  const parseDurationSec = (durStr?: string, secs?: number): number => {
    if (secs && secs > 0) return secs;
    if (!durStr) return 0;
    const parts = durStr.trim().split(':').map(n => parseInt(n, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const formatClock = (secs: number): string => {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
  };

  // Resolve actual playable video source and poster
  const activeVideoUrl =
    currentTrack?.url ||
    (currentTrack as any)?.fileUrl ||
    (liveStream as any)?.videoUrl ||
    (liveStream as any)?.url ||
    (playlistTracks.length > 0 ? (playlistTracks[0]?.url || (playlistTracks[0] as any)?.fileUrl) : '') ||
    '';

  const activePoster =
    currentTrack?.thumbnail ||
    (currentTrack as any)?.thumbnailUrl ||
    liveStream?.thumbnail ||
    linkedPlaylist?.thumbnail ||
    '';

  // Synchronize live modal track index & playback offset with active server broadcast
  useEffect(() => {
    if (!liveStream) {
      lastSyncedKeyRef.current = '';
      pendingSeekRef.current = null;
      return;
    }
    if (liveStream.status !== 'live') {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    setIsPlaying(true);
    if (playlistTracks.length === 0) return;

    const serverIdx = typeof liveStream.currentTrackIndex === 'number'
      ? ((liveStream.currentTrackIndex % playlistTracks.length) + playlistTracks.length) % playlistTracks.length
      : 0;
    const syncKey = `${liveStream.id}:${serverIdx}:${liveStream.currentTrackStartedAt || ''}`;
    if (syncKey === lastSyncedKeyRef.current) return;
    lastSyncedKeyRef.current = syncKey;

    const startedMs = liveStream.currentTrackStartedAt ? Date.parse(liveStream.currentTrackStartedAt) : NaN;
    const elapsedSec = !isNaN(startedMs) ? Math.max(0, (Date.now() - startedMs) / 1000) : 0;

    if (serverIdx !== safeTrackIndex) {
      pendingSeekRef.current = elapsedSec > 1.5 ? elapsedSec : null;
      setCurrentTrackIndex(serverIdx);
    } else if (elapsedSec > 1.5 && videoRef.current) {
      const vid = videoRef.current;
      if (vid.duration && !isNaN(vid.duration) && elapsedSec < vid.duration - 1) {
        if (Math.abs(vid.currentTime - elapsedSec) > 3.5) {
          vid.currentTime = elapsedSec;
        }
      } else {
        pendingSeekRef.current = elapsedSec;
      }
    }
  }, [
    liveStream?.id,
    liveStream?.status,
    liveStream?.currentTrackIndex,
    liveStream?.currentTrackStartedAt,
    playlistTracks.length,
    safeTrackIndex
  ]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying && liveStream?.status === 'live') {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, safeTrackIndex, activeVideoUrl, liveStream?.status]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const handleAdvanceNext = React.useCallback((isManual: boolean = false) => {
    if (playlistTracks.length === 0) return;
    const nextIdx = (safeTrackIndex + 1) % playlistTracks.length;
    pendingSeekRef.current = null;
    if (nextIdx === safeTrackIndex) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        if (isPlaying) videoRef.current.play().catch(() => {});
      }
    } else {
      setCurrentTrackIndex(nextIdx);
    }
    if (isManual) {
      showToast(`Next in sequence: "${playlistTracks[nextIdx]?.title}"`, 'info');
    }
  }, [playlistTracks, safeTrackIndex, isPlaying, showToast]);

  // Fallback timer ONLY if <video> metadata/playback cannot drive onEnded (uses real track duration, never a fake 25s loop)
  useEffect(() => {
    if (!isPlaying || liveStream?.status !== 'live' || playlistTracks.length <= 1 || !autoAdvance) return;
    if (activeVideoUrl) return; // HTML5 <video onEnded> drives exact track completion when video URL exists

    const durSecs = parseDurationSec(currentTrack?.duration, (currentTrack as any)?.durationSeconds);
    if (durSecs <= 0) return;

    const timer = setTimeout(() => {
      handleAdvanceNext(false);
    }, durSecs * 1000);

    return () => clearTimeout(timer);
  }, [isPlaying, liveStream?.status, autoAdvance, playlistTracks.length, activeVideoUrl, currentTrack, handleAdvanceNext]);

  const handleNextTrack = () => handleAdvanceNext(true);

  const handlePrevTrack = () => {
    if (playlistTracks.length === 0) return;
    pendingSeekRef.current = null;
    const prevIdx = (safeTrackIndex - 1 + playlistTracks.length) % playlistTracks.length;
    setCurrentTrackIndex(prevIdx);
    showToast(`Previous video: "${playlistTracks[prevIdx]?.title}"`, 'info');
  };
  const [chatMessages, setChatMessages] = useState([
    { user: 'Samiul_01', text: 'Audio quality is amazing 🔥', time: '10:32 PM' },
    { user: 'ChillVibes', text: 'Listening from Dhaka while studying 🎧', time: '10:33 PM' },
    { user: 'AlexStreams', text: 'Zero buffering on 1080p60. Great bitrate!', time: '10:34 PM' },
    { user: 'Ayesha_N', text: 'Please play the next jazz mix! ☕', time: '10:35 PM' }
  ]);
  const [newChatText, setNewChatText] = useState('');

  if (!activeViewingStream || !liveStream) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { user: 'You (Host)', text: newChatText, time: 'Just now' }
    ]);
    setNewChatText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-[#0D131F] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#111827]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF1B6B] to-[#FF4585] flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  {currentTrack ? currentTrack.title : liveStream.title}
                </h3>
                {liveStream.status === 'live' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    STREAM STOPPED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {linkedPlaylist ? (
                  <>
                    Playlist: <span className="text-slate-200 font-medium">{linkedPlaylist.name}</span> (Track {safeTrackIndex + 1} of {playlistTracks.length})
                  </>
                ) : (
                  <>
                    Channel: <span className="text-slate-200 font-medium">{liveStream.channelName}</span>
                  </>
                )}
                {' '}· Resolution: {liveStream.resolution || '1080p60'} · Bitrate: {liveStream.bitrate || '4500 kbps'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveViewingStream(null)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player & Live Chat Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          {/* Main Video Screen Container */}
          <div className="lg:col-span-2 relative bg-black flex flex-col justify-between overflow-hidden min-h-[320px] sm:min-h-[420px]">
            {/* Real Live Video Feed / Poster */}
            <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
              {activeVideoUrl ? (
                <video
                  key={currentTrack?.id ? `${currentTrack.id}-${safeTrackIndex}` : `modal-track-${safeTrackIndex}`}
                  ref={videoRef}
                  src={activeVideoUrl}
                  poster={activePoster}
                  className="w-full h-full object-contain bg-black"
                  autoPlay={liveStream.status === 'live'}
                  playsInline
                  muted={isMuted}
                  loop={playlistTracks.length <= 1}
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    if (pendingSeekRef.current !== null && vid.duration && !isNaN(vid.duration) && pendingSeekRef.current < vid.duration - 1) {
                      vid.currentTime = pendingSeekRef.current;
                      pendingSeekRef.current = null;
                    } else {
                      pendingSeekRef.current = null;
                    }
                    if (liveStream.status === 'live' && isPlaying) {
                      vid.play().catch(() => {});
                    }
                  }}
                  onTimeUpdate={(e) => {
                    setElapsedDisplay(formatClock(e.currentTarget.currentTime));
                  }}
                  onEnded={() => {
                    if (autoAdvance && liveStream.status === 'live') {
                      handleAdvanceNext(false);
                    }
                  }}
                />
              ) : (
                <img
                  src={activePoster}
                  alt={currentTrack ? currentTrack.title : liveStream.title}
                  className="w-full h-full object-contain bg-black"
                />
              )}

              {/* Stream Stopped Overlay when not live */}
              {liveStream.status !== 'live' && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-6 text-center z-10 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Radio className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-white font-bold text-base">Broadcast Offline</h4>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Stream has been stopped. Playlist playback and RTMP output are offline.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Status: Stream Stopped
                  </span>
                </div>
              )}

              {/* Gradient vignette on controls overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40 pointer-events-none" />
            </div>

            {/* Top Stream Overlays */}
            <div className="relative z-10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>{liveStream.status === 'live' ? `${(liveStream.viewers ?? 0).toLocaleString()} watching now` : '0 watching (Offline)'}</span>
              </div>
              <div className={`flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs ${liveStream.status === 'live' ? 'text-emerald-400' : 'text-amber-400'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {liveStream.status === 'live'
                    ? (playlistTracks.length > 0 ? 'Playlist Auto-Advance: Active' : 'RTMP Pipeline Active')
                    : 'Broadcast Offline (Stream Stopped)'}
                </span>
              </div>
            </div>

            {/* Bottom Stream Controls Bar */}
            <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-200 transition-colors shadow-lg cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                {playlistTracks.length > 1 && (
                  <div className="flex items-center gap-1 bg-black/50 backdrop-blur px-2 py-1 rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={handlePrevTrack}
                      className="p-1 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Previous Video"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-rose-400 px-1">
                      {safeTrackIndex + 1}/{playlistTracks.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextTrack}
                      className="p-1 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Next Video"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="text-xs text-slate-300 font-mono">
                  {isPlaying && liveStream.status === 'live' ? `LIVE ${elapsedDisplay}` : 'PAUSED'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {playlistTracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAutoAdvance(!autoAdvance);
                      showToast(`Auto-move turned ${!autoAdvance ? 'ON' : 'OFF'}`, 'info');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-colors cursor-pointer ${
                      autoAdvance
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span>{autoAdvance ? 'Auto-Move: ON' : 'Auto-Move: OFF'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(activeViewingStream.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2');
                    showToast('RTMP URL copied to clipboard!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                >
                  Copy RTMP
                </button>
                <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold">
                  1080p 60fps
                </span>
              </div>
            </div>
          </div>

          {/* Live Chat Panel */}
          <div className="flex flex-col h-full bg-[#0D111D] border-t lg:border-t-0 lg:border-l border-slate-800">
            <div className="p-3.5 border-b border-slate-800 bg-[#111827] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-[#FF1B6B]" />
                <span>YouTube Live Chat</span>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                Connected
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[300px] lg:max-h-[340px]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="text-xs space-y-0.5">
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className={`font-semibold ${msg.user.includes('Host') ? 'text-[#FF1B6B]' : 'text-slate-300'}`}>
                      {msg.user}
                    </span>
                    <span className="text-slate-500">{msg.time}</span>
                  </div>
                  <p className="text-slate-200 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-[#111827] flex gap-2">
              <input
                type="text"
                placeholder="Send message to live chat..."
                value={newChatText}
                onChange={e => setNewChatText(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-[#FF1B6B] hover:bg-[#E11D48] text-white transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
