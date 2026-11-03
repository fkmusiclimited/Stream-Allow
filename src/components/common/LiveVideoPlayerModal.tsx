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
    playlists,
    showToast
  } = useApp();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  // Find linked playlist if any
  const linkedPlaylist = playlists.find(p => p.id === activeViewingStream?.playlistId);
  const playlistTracks = linkedPlaylist?.videos || [];
  const currentTrack = playlistTracks[currentTrackIndex];

  // Auto-advance to next video in sequence
  useEffect(() => {
    if (!isPlaying || playlistTracks.length <= 1 || !autoAdvance) return;

    // Simulate track progression
    const timer = setTimeout(() => {
      const nextIndex = (currentTrackIndex + 1) % playlistTracks.length;
      setCurrentTrackIndex(nextIndex);
      const nextTrack = playlistTracks[nextIndex];
      showToast(`Auto-advanced to: "${nextTrack?.title}"`, 'info');
    }, 18000);

    return () => clearTimeout(timer);
  }, [isPlaying, autoAdvance, currentTrackIndex, playlistTracks, showToast]);

  const handleNextTrack = () => {
    if (playlistTracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlistTracks.length;
    setCurrentTrackIndex(nextIdx);
    showToast(`Next in sequence: "${playlistTracks[nextIdx]?.title}"`, 'info');
  };

  const handlePrevTrack = () => {
    if (playlistTracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlistTracks.length) % playlistTracks.length;
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

  if (!activeViewingStream) return null;


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
                  {currentTrack ? currentTrack.title : activeViewingStream.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {linkedPlaylist ? (
                  <>
                    Playlist: <span className="text-slate-200 font-medium">{linkedPlaylist.name}</span> (Track {currentTrackIndex + 1} of {playlistTracks.length})
                  </>
                ) : (
                  <>
                    Channel: <span className="text-slate-200 font-medium">{activeViewingStream.channelName}</span>
                  </>
                )}
                {' '}· Resolution: {activeViewingStream.resolution || '1080p60'} · Bitrate: {activeViewingStream.bitrate || '4500 kbps'}
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
            {/* Visualizer Background / Stream Feed */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={currentTrack ? currentTrack.thumbnail : activeViewingStream.thumbnail}
                alt={currentTrack ? currentTrack.title : activeViewingStream.title}
                className="w-full h-full object-cover filter brightness-[0.4] scale-105 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60" />

              {/* Animated Equalizer Wave Overlay for simulated live music/stream */}
              <div className="absolute bottom-16 left-6 right-6 flex items-end gap-1.5 h-20 opacity-80 pointer-events-none">
                {[40, 70, 95, 30, 60, 85, 100, 45, 90, 65, 35, 75, 90, 50, 80, 100, 60, 40, 90, 50, 70, 95, 30, 60, 85, 45, 90, 65].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#FF1B6B] to-[#3B82F6] rounded-t transition-all duration-300"
                    style={{
                      height: isPlaying ? `${(h * ((i % 3) + 1)) % 100}%` : '6%',
                      animation: isPlaying ? `pulse 1.${(i % 5) + 2}s infinite alternate` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Top Stream Overlays */}
            <div className="relative z-10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-white">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>{activeViewingStream.viewers.toLocaleString()} watching now</span>
              </div>
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {playlistTracks.length > 0 ? 'Playlist Auto-Advance: Active' : 'RTMP Pipeline Active'}
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
                      {currentTrackIndex + 1}/{playlistTracks.length}
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
                  {isPlaying ? 'LIVE 02:44:19' : 'PAUSED'}
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
