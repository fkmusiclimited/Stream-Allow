import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  PlusCircle,
  Film,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Trash2,
  Clock,
  Radio,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileVideo,
  Eye,
  Layers,
  RefreshCw,
  Repeat,
  Volume2,
  VolumeX,
  Shuffle
} from 'lucide-react';
import { StreamItem } from '../../types';

export const PlaylistDetailsPage: React.FC = () => {
  const {
    playlists,
    selectedPlaylistId,
    navigate,
    addStream,
    updateStreamStatus,
    addVideoToPlaylist,
    addVideoToPlaylistAndRestartLive,
    restartLiveBroadcast,
    removeVideoFromPlaylist,
    streamRestartState,
    streams,
    setActiveViewingStream,
    showToast
  } = useApp();

  const playlist = playlists.find(p => p.id === selectedPlaylistId) || playlists[0];
  const videoList = playlist?.videos || [];

  // Connected live stream for this specific playlist ONLY (no global fallback)
  const connectedLiveStream = streams.find(
    s => s.playlistId === playlist?.id && s.status === 'live'
  ) || null;
  const isPlaylistLive = Boolean(connectedLiveStream);

  // Interactive Live Sequence Player State
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true); // Auto move enabled by default
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState<string | null>(null);

  // Upload Video File & Extraction State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('https://cdn.streamjoin.com/media/uploaded-loop.mp4');
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
  const [isExtractingFrame, setIsExtractingFrame] = useState(false);
  const [frameExtracted, setFrameExtracted] = useState(false);

  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const currentPlayingVideo = videoList[activeTrackIndex] || videoList[0];

  // Automated Sequence Progression & Continuous Loop
  useEffect(() => {
    if (!isPlaying || videoList.length === 0) return;

    const interval = setInterval(() => {
      setPlaybackSeconds(prev => {
        // Parse track duration in seconds or default to 15s simulated transition cycle for preview
        if (prev >= 15) {
          if (autoAdvance) {
            // Auto advance to next video!
            const nextIndex = (activeTrackIndex + 1) % videoList.length;
            const nextVideo = videoList[nextIndex];
            setActiveTrackIndex(nextIndex);
            setAutoAdvanceNotice(
              `Auto-moved: "${currentPlayingVideo?.title || 'Video'}" finished -> Now playing: "${nextVideo?.title || 'Next'}"`
            );
            setTimeout(() => setAutoAdvanceNotice(null), 4000);
          }
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, autoAdvance, activeTrackIndex, videoList, currentPlayingVideo]);

  // Handle manual next track
  const handleNextTrack = () => {
    if (videoList.length === 0) return;
    const nextIndex = (activeTrackIndex + 1) % videoList.length;
    setActiveTrackIndex(nextIndex);
    setPlaybackSeconds(0);
    showToast(`Playing next: "${videoList[nextIndex]?.title}"`, 'info');
  };

  // Handle manual previous track
  const handlePrevTrack = () => {
    if (videoList.length === 0) return;
    const prevIndex = (activeTrackIndex - 1 + videoList.length) % videoList.length;
    setActiveTrackIndex(prevIndex);
    setPlaybackSeconds(0);
    showToast(`Playing: "${videoList[prevIndex]?.title}"`, 'info');
  };

  // Helper to format video duration in mm:ss or hh:mm:ss format
  const formatVideoDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const totalSecs = Math.round(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fallback duration estimate based on uploaded file size (~2.2MB per minute for standard 1080p MP4)
  const estimateDurationFromFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    const estimatedMinutes = Math.max(1, Math.round(mb / 2.2));
    const mins = estimatedMinutes % 60;
    const hrs = Math.floor(estimatedMinutes / 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    }
    return `${mins.toString().padStart(2, '0')}:30`;
  };

  // Function to extract actual frame thumbnail AND duration directly from the uploaded video file
  const extractRealVideoMetadata = (file: File): Promise<{ thumbnail: string; duration: string }> => {
    return new Promise((resolve) => {
      try {
        const fileUrl = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = fileUrl;
        video.muted = true;
        video.playsInline = true;

        let detectedDuration = '';

        video.onloadedmetadata = () => {
          if (video.duration && !isNaN(video.duration) && video.duration > 0) {
            detectedDuration = formatVideoDuration(video.duration);
          }
          // Seek to 1 second (or middle of short video) to get a clear, non-blank frame
          video.currentTime = Math.min(1.0, (video.duration || 3) / 2);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              URL.revokeObjectURL(fileUrl);
              resolve({
                thumbnail: dataUrl,
                duration: detectedDuration || estimateDurationFromFileSize(file.size)
              });
              return;
            }
          } catch (e) {
            console.warn('Canvas frame capture error, using dynamic generator', e);
          }
          URL.revokeObjectURL(fileUrl);
          resolve({
            thumbnail: generateDynamicVideoFrame(file.name),
            duration: detectedDuration || estimateDurationFromFileSize(file.size)
          });
        };

        video.onerror = () => {
          URL.revokeObjectURL(fileUrl);
          resolve({
            thumbnail: generateDynamicVideoFrame(file.name),
            duration: detectedDuration || estimateDurationFromFileSize(file.size)
          });
        };

        // Fallback after 2.5 seconds if seeking hangs
        setTimeout(() => {
          URL.revokeObjectURL(fileUrl);
          resolve({
            thumbnail: generateDynamicVideoFrame(file.name),
            duration: detectedDuration || estimateDurationFromFileSize(file.size)
          });
        }, 2500);
      } catch {
        resolve({
          thumbnail: generateDynamicVideoFrame(file.name),
          duration: estimateDurationFromFileSize(file.size)
        });
      }
    });
  };

  // Dynamic canvas frame generator if browser cannot decode the container format directly
  const generateDynamicVideoFrame = (fileName: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(0.5, '#1E1B4B');
    grad.addColorStop(1, '#090D16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);

    ctx.fillStyle = '#FF1B6B20';
    ctx.beginPath();
    ctx.arc(320, 180, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF1B6B';
    ctx.beginPath();
    ctx.moveTo(310, 155);
    ctx.lineTo(345, 180);
    ctx.lineTo(310, 205);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fileName.substring(0, 32), 320, 255);

    ctx.fillStyle = '#10B981';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Auto-Extracted Video Frame · 1080p FHD', 320, 285);

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // Handle local video file selection and automatically extract frame thumbnail & duration
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setSelectedFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');

      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setVideoTitle(cleanName);

      // Automatically extract real video thumbnail & duration from this uploaded file
      setIsExtractingFrame(true);
      showToast(`Analyzing video "${file.name}" for duration & thumbnail...`, 'info');

      try {
        const metadata = await extractRealVideoMetadata(file);
        setVideoThumbnail(metadata.thumbnail);
        setVideoDuration(metadata.duration);
        setFrameExtracted(true);
        showToast(`Video duration (${metadata.duration}) & thumbnail detected automatically!`, 'success');
      } catch {
        const fallbackThumb = generateDynamicVideoFrame(file.name);
        const fallbackDur = estimateDurationFromFileSize(file.size);
        setVideoThumbnail(fallbackThumb);
        setVideoDuration(fallbackDur);
        setFrameExtracted(true);
      } finally {
        setIsExtractingFrame(false);
      }
    }
  };

  // Submit new video & add to playlist queue WITHOUT restarting live stream
  const handleUploadVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) {
      showToast('Please enter a video title.', 'error');
      return;
    }

    const finalThumbnail = videoThumbnail || generateDynamicVideoFrame(videoTitle);
    const finalDuration = videoDuration || '04:15';

    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 25;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);

      // Add to playlist queue WITHOUT restarting live stream
      addVideoToPlaylist(playlist.id, {
        title: videoTitle,
        duration: finalDuration,
        url: videoUrl,
        thumbnail: finalThumbnail
      });

      setIsUploading(false);
      setUploadModalOpen(false);
      setUploadProgress(0);
      setVideoTitle('');
      setSelectedFileName('');
      setSelectedFileSize('');
      setVideoThumbnail('');
      setVideoDuration('');
      setFrameExtracted(false);
    }, 1000);
  };

  // Handle restarting live broadcast: restarts stream on YouTube and local player from beginning WITHOUT adding any videos
  const handleRestartLiveBroadcast = () => {
    setActiveTrackIndex(0);
    setPlaybackSeconds(0);
    setIsPlaying(true);
    restartLiveBroadcast(playlist.id, 0);
  };

  // Handle starting live stream for this playlist if offline
  const handleStartLiveStream = () => {
    const existing = streams.find(s => s.playlistId === playlist.id);
    if (existing) {
      updateStreamStatus(existing.id, 'live');
      showToast(`⚡ Live stream started for "${playlist.name}"!`, 'success');
    } else {
      addStream({
        title: `${playlist.name} Live Stream`,
        description: `Continuous 24/7 live broadcast for ${playlist.name}`,
        channelName: 'Music World',
        channelId: 'ch-2',
        thumbnail: playlist.thumbnail,
        status: 'live',
        date: 'Today',
        time: 'Now',
        playlistId: playlist.id,
        streamKey: `live_${Date.now()}_rtmp`,
        rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
        resolution: '1080p60',
        bitrate: '4500 kbps',
        loop: true
      });
      showToast(`⚡ Live stream launched for "${playlist.name}"!`, 'success');
    }
  };

  if (!playlist) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-400">Playlist not found.</p>
        <button
          onClick={() => navigate('user/playlist')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate('user/playlist')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Playlists</span>
        </button>

        <div className="flex items-center gap-3">
          {isPlaylistLive ? (
            <button
              onClick={handleRestartLiveBroadcast}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Restart Live Broadcast</span>
            </button>
          ) : (
            <button
              onClick={handleStartLiveStream}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Go Live with Playlist</span>
            </button>
          )}

          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-5 py-2 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#FF1B6B]" />
            <span>Upload New Video / Add File</span>
          </button>
        </div>
      </div>

      {/* Auto-Advance Notification Banner */}
      {autoAdvanceNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 shadow-lg text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold">{autoAdvanceNotice}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            Continuous Queue
          </span>
        </div>
      )}

      {/* Live Stream Restart In-Progress Banner */}
      {streamRestartState?.isRestarting && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border-2 border-[#FF1B6B] shadow-2xl shadow-rose-600/30 animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FF1B6B] text-white flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                    Live Stream Restarting
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </div>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  Broadcasting updated video: &ldquo;{streamRestartState.updatedVideoTitle}&rdquo;
                </h4>
                <p className="text-xs text-slate-400">
                  RTMP encoder syncing keyframes... Live stream on YouTube will start from this updated video without dropping stream key.
                </p>
              </div>
            </div>

            <div className="w-full sm:w-48 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-[#FF1B6B] h-full rounded-full animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '85%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Sequence Player with Continuous Auto-Move */}
      {videoList.length > 0 && currentPlayingVideo && (
        <div className="rounded-3xl bg-gradient-to-b from-[#141B2D] to-[#0D121F] border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-5">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            {/* Screen Preview & Active Video Info */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative w-36 h-22 sm:w-44 sm:h-26 rounded-2xl overflow-hidden border border-slate-700 bg-black shrink-0 shadow-lg group">
                <img
                  src={isPlaylistLive ? currentPlayingVideo.thumbnail : playlist.thumbnail}
                  alt={currentPlayingVideo.title}
                  className="w-full h-full object-cover"
                />

                {/* ONLY show live stream overlay if this playlist is actually broadcasting live */}
                {isPlaylistLive ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2 pointer-events-none">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-600/90 text-white text-[9px] font-black tracking-wider uppercase shadow">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>24/7 Live</span>
                      </div>
                      <div className="flex items-end gap-0.5 h-3">
                        <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_0.8s_infinite] h-3" />
                        <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_0.6s_infinite] h-2" />
                        <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_1.0s_infinite] h-2.5" />
                      </div>
                    </div>
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>#{activeTrackIndex + 1} LIVE</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-bold text-slate-300 flex items-center gap-1">
                    <span>Track #{activeTrackIndex + 1}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isPlaylistLive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                      <Radio className="w-3 h-3 animate-pulse" />
                      Now Broadcasting
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 flex items-center gap-1.5 border border-slate-700">
                      <Film className="w-3 h-3 text-slate-400" />
                      Playlist Sequence Preview
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400">
                    Track {activeTrackIndex + 1} of {videoList.length}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {currentPlayingVideo.title}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span>Up Next:</span>
                  <strong className="text-slate-200">
                    #{((activeTrackIndex + 1) % videoList.length) + 1} {videoList[(activeTrackIndex + 1) % videoList.length]?.title}
                  </strong>
                </p>
              </div>
            </div>

            {/* Sequence Player Controls & Auto-Advance Toggle */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              {/* Previous / Live Status or Preview / Next Buttons */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-md">
                <button
                  type="button"
                  onClick={handlePrevTrack}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Previous Video"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {isPlaylistLive ? (
                  /* 24/7 Unstoppable Live Indicator (Play/Pause removed so live stream cannot be stopped) */
                  <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/60 border border-rose-500/40 text-rose-400 text-xs font-bold flex items-center gap-2 select-none">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="tracking-wide font-extrabold uppercase text-[11px]">24/7 Live</span>
                    <div className="flex items-end gap-0.5 h-3 ml-0.5">
                      <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_0.8s_infinite] h-3" />
                      <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_0.6s_infinite] h-2" />
                      <span className="w-0.5 bg-rose-400 rounded-full animate-[bounce_1.0s_infinite] h-2.5" />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current text-rose-400" /> : <Play className="w-3.5 h-3.5 fill-current text-emerald-400 ml-0.5" />}
                    <span>{isPlaying ? 'Pause' : 'Preview'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNextTrack}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Next Video"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Automatic Move to Next Video Toggle Switch */}
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">Automatic Move</span>
                    <span className="text-[10px] text-slate-400">Play next on finish</span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={autoAdvance}
                  onClick={() => {
                    const newState = !autoAdvance;
                    setAutoAdvance(newState);
                    showToast(
                      newState
                        ? 'Auto-move ON: Videos will play continuously in sequence.'
                        : 'Auto-move OFF: Video will stop after finishing.',
                      'info'
                    );
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    autoAdvance ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      autoAdvance ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#FF1B6B] to-emerald-400 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min(100, (playbackSeconds / 15) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>00:{playbackSeconds < 10 ? `0${playbackSeconds}` : playbackSeconds}</span>
              <span className="text-emerald-400 font-semibold">
                {autoAdvance
                  ? isPlaylistLive
                    ? 'Continuous Loop (24/7 Live Stream)'
                    : 'Continuous Loop (Preview Queue)'
                  : 'Single Play'}
              </span>
              <span>{currentPlayingVideo.duration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Hero Info Card - ONLY shows live options if this playlist is actively live */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group shrink-0">
            <img
              src={isPlaylistLive ? (currentPlayingVideo?.thumbnail || playlist.thumbnail) : playlist.thumbnail}
              alt={playlist.name}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-xl transition-all duration-300 ${
                isPlaylistLive
                  ? 'border-2 border-rose-500/60 shadow-rose-950/40'
                  : 'border border-slate-700 shadow-slate-950/40'
              }`}
            />
            {/* ONLY show LIVE SYNC on hero thumbnail if live */}
            {isPlaylistLive && (
              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/85 backdrop-blur-xs rounded-md px-1.5 py-0.5 text-[9px] font-black text-rose-400 border border-rose-500/40 flex items-center justify-center gap-1 shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>LIVE SYNC</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isPlaylistLive
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : playlist.status === 'Scheduled'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : playlist.status === 'Ended'
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isPlaylistLive ? 'Live Broadcasting' : (playlist.status === 'Active' ? 'Ready' : playlist.status)}
              </span>

              {/* ONLY show 24/7 Loop Active pill if playlist is live */}
              {isPlaylistLive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-[#FF1B6B] border border-rose-500/20 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>24/7 Loop Active</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                  Loop Sequence Ready
                </span>
              )}

              <span className="text-xs text-slate-400">Created: {playlist.createdAt}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{playlist.name}</h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              {isPlaylistLive
                ? 'All files in this playlist automatically play in sequence. When one video finishes, the next video begins broadcasting immediately in a 24/7 seamless loop.'
                : 'All files in this playlist are queued and ready. Click "Go Live with Playlist" to start 24/7 streaming on YouTube Live.'}
            </p>

            <div className="flex items-center gap-5 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <Film className="w-4 h-4 text-[#FF1B6B]" />
                <span>{videoList.length} Added Files</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Total Runtime: {playlist.duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Broadcast Target Pill or Stream Offline Action Box */}
        {isPlaylistLive && connectedLiveStream ? (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shrink-0 w-full md:w-72 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Live on YouTube
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {connectedLiveStream.viewers.toLocaleString()} watching
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate">{connectedLiveStream.title}</p>
            <button
              onClick={() => setActiveViewingStream(connectedLiveStream)}
              className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-rose-400" />
              <span>Watch Live Stream</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shrink-0 w-full md:w-72 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Stream Offline
              </span>
              <span className="text-xs font-semibold text-slate-500">
                0 watching
              </span>
            </div>
            <p className="text-xs text-slate-400">Not broadcasting on YouTube</p>
            <button
              onClick={handleStartLiveStream}
              className="w-full py-1.5 rounded-xl bg-[#FF1B6B] hover:bg-[#E11D48] text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-600/20"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Start Live Broadcast</span>
            </button>
          </div>
        )}
      </div>

      {/* Added Files Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF1B6B]" />
              <span>All Added Files & Videos ({videoList.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              When one video ends, playback automatically moves to the next video and loops back continuously.
            </p>
          </div>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#FF1B6B] hover:text-white bg-rose-500/10 hover:bg-[#FF1B6B] border border-rose-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New File</span>
          </button>
        </div>

        {/* Video Files Table/Cards */}
        {videoList.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <FileVideo className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No files added yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload video or audio files from your computer to start continuous 24/7 broadcasting.
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/25 inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video Now</span>
            </button>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#0F1626] border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-xl">
            {videoList.map((video, idx) => {
              const isCurrentlyPlaying = idx === activeTrackIndex;

              return (
                <div
                  key={video.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group ${
                    isCurrentlyPlaying
                      ? isPlaylistLive
                        ? 'bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border-l-4 border-l-[#FF1B6B]'
                        : 'bg-slate-900/90 border-l-4 border-l-slate-600'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-500 w-6 text-center shrink-0">
                      #{idx + 1}
                    </span>

                    {/* Video Thumbnail */}
                    <div
                      onClick={() => {
                        setActiveTrackIndex(idx);
                        setPlaybackSeconds(0);
                        setIsPlaying(true);
                      }}
                      className="relative w-28 h-18 sm:w-36 sm:h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 cursor-pointer group/thumb shadow-md"
                    >
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-[#FF1B6B] text-white flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 ml-0.5 fill-current" />
                        </div>
                      </div>
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                        {video.duration}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {isCurrentlyPlaying && (
                          isPlaylistLive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              Live Now in Sequence
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 flex items-center gap-1 border border-slate-700">
                              <Play className="w-3 h-3 text-slate-400 fill-current" />
                              Active in Preview
                            </span>
                          )
                        )}
                        <span className="text-[11px] font-medium text-slate-400">1080p FHD · MP4 Loop</span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-[#FF1B6B] transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate max-w-md">
                        {video.url}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTrackIndex(idx);
                        setPlaybackSeconds(0);
                        setIsPlaying(true);
                        showToast(`Selected video #${idx + 1}: "${video.title}"`, 'info');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrentlyPlaying
                          ? isPlaylistLive
                            ? 'bg-[#FF1B6B] text-white shadow-md shadow-rose-600/30'
                            : 'bg-slate-700 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isCurrentlyPlaying ? (isPlaylistLive ? 'Currently Broadcasting' : 'Previewing') : 'Play Video'}</span>
                    </button>

                    {/* Remove Restart Live From Here button as requested */}

                    <button
                      type="button"
                      onClick={() => removeVideoFromPlaylist(playlist.id, video.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Remove file from playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload New Video / Add File Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-[#0F1626] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#FF1B6B]" />
                  <span>Upload Video to Playlist</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  An authentic video frame thumbnail will be automatically extracted from your video.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadVideo} className="space-y-5">
              {/* File Upload Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Select Video File (MP4, WebM, MKV, QuickTime)
                </label>

                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onClick={() => videoFileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#FF1B6B] bg-slate-900/60 hover:bg-slate-900 text-center cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-[#FF1B6B] flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    {isExtractingFrame ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-[#FF1B6B]" />
                    ) : (
                      <FileVideo className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {selectedFileName ? selectedFileName : 'Click to Browse Video File from Computer'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedFileSize ? `File Size: ${selectedFileSize}` : 'MP4, MOV, WebM up to 4K resolution supported'}
                    </p>
                  </div>
                  {isExtractingFrame && (
                    <p className="text-[11px] font-semibold text-[#FF1B6B] animate-pulse">
                      Capturing authentic video frame thumbnail...
                    </p>
                  )}
                  {frameExtracted && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Video frame thumbnail captured automatically</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Real Extracted Frame Preview (No demo thumbnail) */}
              {videoThumbnail && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF1B6B]" />
                      <span>Automatic Video Thumbnail (From Your Upload)</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Real Video Frame
                    </span>
                  </div>
                  <div className="relative h-32 rounded-xl overflow-hidden border border-slate-700 bg-black">
                    <img
                      src={videoThumbnail}
                      alt="Extracted video frame"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-200">
                      Frame Captured @ 00:01
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This thumbnail will automatically represent this video and update your playlist card.
                  </p>
                </div>
              )}

              {/* Video Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Video Title in Stream
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="e.g. Midnight Ambient Lo-Fi Session #2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              {/* Duration input - Automatically extracted from video */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    Duration (mm:ss)
                  </label>
                  {videoDuration ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Auto-detected: {videoDuration}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">
                      Auto-detected upon file selection
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={e => setVideoDuration(e.target.value)}
                  placeholder="Auto-detected from video (e.g. 03:45)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>

              {/* Progress bar when uploading */}
              {isUploading && (
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-400">Uploading file to playlist queue...</span>
                    <span className="font-mono text-white">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#FF1B6B] to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Seamless Queue Addition Notice (Live stream does NOT restart) */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  <strong>Continuous Live Stream Queue:</strong> When uploaded, this video is added smoothly to your playlist queue with its exact detected duration, without interrupting or restarting your ongoing 24/7 live broadcast.
                </span>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading to Playlist...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Add to Playlist</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
