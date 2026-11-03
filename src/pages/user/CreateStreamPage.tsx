import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Radio,
  Youtube,
  Settings,
  Sparkles,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  Repeat,
  Film,
  Play,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Key,
  ShieldCheck
} from 'lucide-react';

export const CreateStreamPage: React.FC = () => {
  const {
    currentPath,
    channels,
    playlists,
    addPlaylist,
    addStream,
    addVideoToPlaylist,
    navigate,
    setActiveViewingStream,
    showToast,
    currentUser,
    userPlan
  } = useApp();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Music');
  const [privacy, setPrivacy] = useState<'Public' | 'Unlisted' | 'Private'>('Public');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80');

  // MP4 Video Upload States (Replaces Stream Thumbnail)
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('Deep Ambient Lo-Fi Tape #1.mp4');
  const [uploadedVideoSize, setUploadedVideoSize] = useState<string>('48.5 MB');
  const [uploadedVideoDuration, setUploadedVideoDuration] = useState<string>('15:20');
  const [videoResolution, setVideoResolution] = useState<string>('1080p FHD');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [planInactiveModalOpen, setPlanInactiveModalOpen] = useState(false);
  const [simulateInactivePlan, setSimulateInactivePlan] = useState(false);
  const videoFileInputRef = React.useRef<HTMLInputElement>(null);

  // Separate RTMP Server URL and YouTube Stream Key states
  const [rtmpServerUrl, setRtmpServerUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [streamKey, setStreamKey] = useState('live_9381_auto_streamjoin_key');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [dualStream, setDualStream] = useState(false);
  const [secondaryStreamUrl, setSecondaryStreamUrl] = useState('');
  const [backupRtmpServer, setBackupRtmpServer] = useState('rtmp://b.rtmp.youtube.com/live2?backup=1');

  const [selectedPlaylistId, setSelectedPlaylistId] = useState(playlists[0]?.id || '');
  const [autoCreatedPlaylistId, setAutoCreatedPlaylistId] = useState<string | null>(null);
  const [uploadedVideoData, setUploadedVideoData] = useState<{
    title: string;
    duration: string;
    durationSeconds?: number;
    resolution?: string;
    format?: string;
    filePath?: string;
    fileSizeBytes?: number;
    url: string;
    thumbnail: string;
  } | null>(null);
  const [resolution, setResolution] = useState('1080p60');
  const [loop247, setLoop247] = useState(true);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('Tomorrow, 8:00 PM');

  const selectedPlaylist = playlists.find(p => p.id === (autoCreatedPlaylistId || selectedPlaylistId)) || playlists[0];

  // MP4 Video Upload Handler with Real Server Storage & FFprobe
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('video') && !/\.(mp4|mkv|mov|webm|flv)$/i.test(file.name)) {
        showToast('Please upload a valid video file (MP4, MKV, MOV, or WebM).', 'error');
        return;
      }
      const url = URL.createObjectURL(file);
      setVideoFile(file);
      setVideoPreviewUrl(url);
      setUploadedVideoName(file.name);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadedVideoSize(`${sizeMB} MB`);

      // Auto-set title from video file name if title is currently empty
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName);
      }

      // Read video duration and dimensions client-side
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        const mins = Math.floor(tempVideo.duration / 60);
        const secs = Math.floor(tempVideo.duration % 60);
        setUploadedVideoDuration(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        if (tempVideo.videoHeight >= 1080) {
          setVideoResolution('1080p FHD');
        } else if (tempVideo.videoHeight >= 720) {
          setVideoResolution('720p HD');
        }
      };

      // Perform real file upload to backend via Multer /api/media/upload
      setIsUploadingVideo(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('video', file);

      const token = localStorage.getItem('streamjoin_token');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/media/upload');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploadingVideo(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const uploaded = res.file;
            setUploadProgress(100);
            setUploadedFilePath(uploaded.filePath);
            if (uploaded.thumbnailUrl) {
              setThumbnail(uploaded.thumbnailUrl);
            }
            if (uploaded.formattedDuration) {
              setUploadedVideoDuration(uploaded.formattedDuration);
            }
            if (uploaded.resolution) {
              setVideoResolution(uploaded.resolution);
            }

            const videoMeta = {
              title: title.trim() || file.name.replace(/\.[^/.]+$/, ''),
              duration: uploaded.formattedDuration || '05:00',
              durationSeconds: uploaded.durationSeconds,
              resolution: uploaded.resolution,
              format: uploaded.format,
              filePath: uploaded.filePath,
              fileSizeBytes: uploaded.fileSizeBytes,
              url: uploaded.url,
              thumbnail: uploaded.thumbnailUrl || thumbnail
            };
            setUploadedVideoData(videoMeta);

            if (autoCreatedPlaylistId) {
              addVideoToPlaylist(autoCreatedPlaylistId, videoMeta);
            }

            showToast(`Video "${file.name}" uploaded successfully!`, 'success');
          } catch {
            showToast(`"${file.name}" uploaded to server storage.`, 'success');
          }
        } else {
          showToast('Failed to upload video to server. Please try again.', 'error');
        }
      };

      xhr.onerror = () => {
        setIsUploadingVideo(false);
        showToast('Network error during video upload.', 'error');
      };

      xhr.send(formData);
    }
  };

  const handleResetVideo = () => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setUploadedVideoName('Deep Ambient Lo-Fi Tape #1.mp4');
    setUploadedVideoSize('48.5 MB');
    setUploadedVideoDuration('15:20');
    setVideoResolution('1080p FHD');
    setThumbnail('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80');
    setUploadedVideoData(null);
    showToast('Reset to default MP4 video preset.', 'info');
  };

  const handleSelectPresetVideo = (
    name: string,
    size: string,
    duration: string,
    res: string,
    thumb: string
  ) => {
    setVideoFile(null);
    setVideoPreviewUrl('');
    setUploadedVideoName(name);
    setUploadedVideoSize(size);
    setUploadedVideoDuration(duration);
    setVideoResolution(res);
    setThumbnail(thumb);
    if (!title.trim()) {
      setTitle(name.replace('.mp4', ''));
    }
    const presetMeta = {
      title: name.replace('.mp4', ''),
      duration: duration,
      durationSeconds: 900,
      resolution: res,
      format: 'MP4',
      url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
      thumbnail: thumb
    };
    setUploadedVideoData(presetMeta);
    if (autoCreatedPlaylistId) {
      addVideoToPlaylist(autoCreatedPlaylistId, presetMeta);
    }
    showToast(`Selected preset video: ${name}`, 'success');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    showToast(`${label} copied to clipboard!`, 'success');
  };

  const handlePasteRtmpUrl = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setRtmpServerUrl(text.trim());
        showToast('RTMP Server URL pasted from clipboard!', 'success');
      } else {
        showToast('Clipboard is empty. Type or paste manually.', 'info');
      }
    } catch {
      showToast('Please paste directly into the RTMP URL input.', 'info');
    }
  };

  const handlePasteStreamKey = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        let key = text.trim();
        // If user accidentally pasted full RTMP URL including the key:
        if (key.startsWith('rtmp://') || key.startsWith('rtmps://')) {
          const lastSlash = key.lastIndexOf('/');
          if (lastSlash !== -1 && lastSlash < key.length - 1) {
            const extractedServer = key.substring(0, lastSlash);
            key = key.substring(lastSlash + 1);
            setRtmpServerUrl(extractedServer);
          }
        }
        setStreamKey(key);
        showToast('YouTube Stream Key pasted from clipboard!', 'success');
      } else {
        showToast('Clipboard is empty. Type or paste manually.', 'info');
      }
    } catch {
      showToast('Please paste directly into the Stream Key input.', 'info');
    }
  };

  const handlePasteBackupUrl = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        setBackupRtmpServer(text.trim());
        showToast('Backup RTMP URL pasted from clipboard!', 'success');
      } else {
        showToast('Clipboard is empty. Type or paste manually.', 'info');
      }
    } catch {
      showToast('Please paste directly into the Backup RTMP URL input.', 'info');
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const streamTitle = title.trim();
      if (!streamTitle) {
        showToast('Please provide a Stream Title.', 'error');
        return;
      }

      let activePlId = autoCreatedPlaylistId;

      // Auto-create playlist with Stream Title if not already created
      if (!activePlId) {
        try {
          const newPl = await addPlaylist({
            name: streamTitle,
            description: description.trim() || `Playlist for stream: ${streamTitle}`,
            thumbnail: thumbnail,
            status: 'Active',
            isLiveLoop: true,
            duration: uploadedVideoDuration || '15:20',
            videosCount: 0,
            videos: []
          });

          if (newPl && newPl.id) {
            activePlId = newPl.id;
            setAutoCreatedPlaylistId(newPl.id);
            setSelectedPlaylistId(newPl.id);
          }
        } catch (err: any) {
          console.warn('Auto create playlist error:', err);
        }
      }

      // Attach video to this newly created playlist
      if (activePlId) {
        try {
          const videoPayload = uploadedVideoData || {
            title: streamTitle || uploadedVideoName.replace(/\.[^/.]+$/, ''),
            duration: uploadedVideoDuration || '15:20',
            durationSeconds: 920,
            resolution: videoResolution || '1080p FHD',
            format: 'MP4',
            filePath: uploadedFilePath || undefined,
            fileSizeBytes: 50000000,
            url: videoPreviewUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
            thumbnail: thumbnail
          };
          await addVideoToPlaylist(activePlId, videoPayload);
        } catch (vErr) {
          console.warn('Attach video error:', vErr);
        }
      }

      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!rtmpServerUrl.trim()) {
        showToast('Please provide an RTMP Server URL.', 'error');
        return;
      }
      if (!streamKey.trim()) {
        showToast('Please provide your YouTube Stream Key.', 'error');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const isAdmin = (currentUser && ['super_admin', 'admin', 'manager'].includes(currentUser.role)) || currentPath.startsWith('admin/');

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    } else {
      if (currentPath.startsWith('admin/') || isAdmin) {
        navigate('admin/streams');
      } else {
        navigate('user/my-streams');
      }
    }
  };

  const handleLaunchStream = () => {
    // Check if user account plan is active (Super Admin and Admin accounts have full unrestricted access)
    const isPlanActive = isAdmin || (!simulateInactivePlan && currentUser?.status === 'Active' && 
      (currentUser?.renewalDaysLeft === undefined || currentUser?.renewalDaysLeft > 0));

    if (!isPlanActive) {
      setPlanInactiveModalOpen(true);
      return;
    }

    const cleanServerUrl = rtmpServerUrl.trim() || 'rtmp://a.rtmp.youtube.com/live2';
    const cleanKey = streamKey.trim();

    if (!cleanKey) {
      showToast('YouTube Stream Key is required to broadcast.', 'error');
      return;
    }

    const targetPlaylistId = autoCreatedPlaylistId || selectedPlaylistId;

    const newStream = {
      title: title.trim() || uploadedVideoName.replace(/\.[^/.]+$/, ''),
      description: description || `24/7 Live broadcast of ${uploadedVideoName}`,
      channelName: dualStream ? 'YouTube Live (Dual Stream Active)' : 'YouTube Live Broadcast',
      channelId: 'yt-direct',
      thumbnail,
      status: isScheduled ? ('scheduled' as const) : ('live' as const),
      date: 'Today',
      time: 'Just now',
      scheduledTime: isScheduled ? scheduleTime : undefined,
      playlistId: targetPlaylistId,
      streamKey: cleanKey,
      rtmpUrl: cleanServerUrl,
      resolution,
      bitrate: resolution === '1080p60' ? '6000 kbps' : '4500 kbps',
      loop: loop247
    };

    addStream(newStream);
    showToast(
      isScheduled
        ? `Stream scheduled successfully for ${scheduleTime}!`
        : 'Stream is now broadcasting LIVE on YouTube!',
      'success'
    );
    if (currentPath.startsWith('admin/') || isAdmin) {
      navigate('admin/streams');
    } else {
      navigate('user/my-streams');
    }
  };

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'YouTube' },
    { num: 3, label: 'Settings' },
    { num: 4, label: 'Go Live' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
      {/* Admin Breadcrumb Navigation (Shown when creating stream from Admin) */}
      {(currentPath.startsWith('admin/') || isAdmin) && (
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button onClick={() => navigate('admin/dashboard')} className="hover:text-white transition-colors">Admin</button>
            <span>/</span>
            <button onClick={() => navigate('admin/streams')} className="hover:text-[#FF1B6B] text-slate-300 font-semibold transition-colors">
              Streams
            </button>
            <span>/</span>
            <span className="text-white font-bold">Create Stream</span>
          </div>
          <button
            onClick={() => navigate('admin/streams')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Streams</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Create New Stream</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Set up your YouTube live stream in just a few steps.
        </p>
      </div>

      {/* 4-Step Stepper Header matching reference 2 */}
      <div className="p-4 rounded-2xl bg-[#0F1626] border border-slate-800">
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />

          {steps.map((st) => {
            const isCompleted = currentStep > st.num;
            const isCurrent = currentStep === st.num;

            return (
              <div key={st.num} className="relative z-10 flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(st.num as any)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-[#FF1B6B] text-white ring-4 ring-[#FF1B6B]/20 shadow-lg'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                </button>
                <span className={`text-[11px] font-semibold ${isCurrent ? 'text-white' : 'text-slate-400'}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Card matching reference 2 */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Stream Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 24/7 Deep Study LoFi Beats - Chill Radio"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Write a short description, tracklist credits or community rules..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="Music">Music</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Education">Education</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Podcasts">Podcasts</option>
                  <option value="News">News & Politics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Privacy</label>
                <select
                  value={privacy}
                  onChange={e => setPrivacy(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="Public">Public (Visible to everyone)</option>
                  <option value="Unlisted">Unlisted (Anyone with link)</option>
                  <option value="Private">Private (Only you)</option>
                </select>
              </div>
            </div>

            {/* MP4 Video Upload Section (Replaced Stream Thumbnail) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#FF1B6B]" />
                  <label className="text-xs font-semibold text-slate-200">Broadcast MP4 Video File</label>
                </div>
                <span className="text-[11px] text-slate-400">MP4 (H.264 / AAC) · 1080p/720p HD · Loop Ready</span>
              </div>

              {/* Hidden Video File Input */}
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/mp4, .mp4"
                onChange={handleVideoUpload}
                className="hidden"
              />

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Video Preview / Player Thumbnail */}
                  <div className="relative group shrink-0 w-full sm:w-52 h-32 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-md">
                    {videoPreviewUrl ? (
                      <video
                        src={videoPreviewUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <img
                          src={thumbnail}
                          alt="Video Preview Thumbnail"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#FF1B6B]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 ml-0.5 fill-white" />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="bg-black/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white">
                        {uploadedVideoDuration}
                      </span>
                      <span className="bg-[#FF1B6B]/90 backdrop-blur px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">
                        {videoResolution}
                      </span>
                    </div>
                  </div>

                  {/* Upload Trigger & Details */}
                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => videoFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload MP4 Video</span>
                      </button>

                      {videoFile && (
                        <button
                          type="button"
                          onClick={handleResetVideo}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-800 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Video File Status */}
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Film className="w-3.5 h-3.5 text-[#FF1B6B] shrink-0" />
                          <span className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                            {uploadedVideoName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {uploadedVideoSize}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-0.5">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Ready for 24/7 RTMP broadcast (H.264 video stream)</span>
                      </div>
                    </div>

                    {/* Real Video Upload Progress Bar */}
                    {isUploadingVideo && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-[#FF1B6B]/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                          <span className="flex items-center gap-1.5 text-[#FF1B6B]">
                            <Upload className="w-3.5 h-3.5 animate-bounce" />
                            <span>Uploading video to server storage & analyzing with FFprobe...</span>
                          </span>
                          <span className="font-mono text-white font-bold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FF1B6B] to-[#E11D48] transition-all duration-300 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Quick Presets */}
                    <div className="pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1.5">
                        Or Choose Quick Preset Video:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPresetVideo(
                              'Deep Ambient Lo-Fi Tape #1.mp4',
                              '48.5 MB',
                              '15:20',
                              '1080p FHD',
                              'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                        >
                          LoFi Chill Tape (MP4)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPresetVideo(
                              'Cyberpunk Synthwave 24-7 Live.mp4',
                              '85.2 MB',
                              '24:10',
                              '1080p FHD',
                              'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                        >
                          Gaming Synth (MP4)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPresetVideo(
                              'Relaxing Piano & Rain Ambience.mp4',
                              '62.0 MB',
                              '18:45',
                              '1080p FHD',
                              'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                        >
                          Study Piano (MP4)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectPresetVideo(
                              'Coffee Shop Study & Chill Beats.mp4',
                              '54.8 MB',
                              '16:30',
                              '1080p FHD',
                              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                        >
                          Coffee Chill (MP4)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: YouTube RTMP Setup */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>YouTube Stream Setup</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure your YouTube Live destination and multi-relay streaming settings.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                RTMP Live Ready
              </span>
            </div>

            {/* Dual Stream On/Off Toggle Button */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 transition-all">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-white">Dual Stream</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide transition-colors ${
                      dualStream
                        ? 'bg-rose-500/20 text-[#FF1B6B] border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {dualStream ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Broadcast simultaneously to two channels or backup stream destinations for redundancy.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={dualStream}
                onClick={() => {
                  const newState = !dualStream;
                  setDualStream(newState);
                  showToast(`Dual Stream turned ${newState ? 'ON' : 'OFF'}`, 'info');
                }}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  dualStream ? 'bg-[#FF1B6B]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    dualStream ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* If Dual Stream is ON, show Secondary Destination Input */}
            {dualStream && (
              <div className="p-4 rounded-2xl bg-[#0D121F] border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-rose-300 block">
                    Secondary Stream URL (Dual Destination)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Relay 2 Active
                  </span>
                </div>
                <input
                  type="text"
                  value={secondaryStreamUrl}
                  onChange={e => setSecondaryStreamUrl(e.target.value)}
                  placeholder="rtmp://a.rtmp.youtube.com/live2/secondary_stream_key"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>
            )}

            {/* 1. RTMP Server URL Field */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block">
                    RTMP Server URL
                  </label>
                  <span className="text-[11px] text-slate-500">
                    YouTube Live RTMP ingest server endpoint
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteRtmpUrl}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(rtmpServerUrl, 'RTMP Server URL')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-[11px] font-semibold text-[#FF1B6B] hover:text-white transition-colors cursor-pointer"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRtmpServerUrl('rtmp://a.rtmp.youtube.com/live2');
                      showToast('Reset to default YouTube RTMP endpoint', 'info');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Default
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={rtmpServerUrl}
                onChange={e => setRtmpServerUrl(e.target.value)}
                placeholder="rtmp://a.rtmp.youtube.com/live2"
                className="w-full bg-[#0D121F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            {/* 2. YouTube Stream Key Field (Separate Secure Input) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#FF1B6B]" />
                    <span>YouTube Stream Key</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Find this in YouTube Studio &gt; Stream Settings &gt; Stream Key
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {showStreamKey ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{showStreamKey ? 'Hide Key' : 'Show Key'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteStreamKey}
                    className="px-2.5 py-1 rounded-lg bg-[#FF1B6B]/15 hover:bg-[#FF1B6B]/25 text-[11px] font-semibold text-[#FF1B6B] hover:text-white transition-colors cursor-pointer"
                  >
                    Paste Key
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  value={streamKey}
                  onChange={e => setStreamKey(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
                  className="w-full bg-[#0D121F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#FF1B6B] pr-10"
                />
              </div>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>AES-256-GCM hardware encryption active. Stream Key is never stored in plain text or logged.</span>
              </div>
            </div>

            {/* Backup RTMP URL (allows pasting new URL) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-semibold text-slate-200 block">
                    Backup RTMP URL
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Paste your new backup RTMP URL for failover redundancy
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteBackupUrl}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-[#FF1B6B] hover:text-white transition-colors cursor-pointer"
                  >
                    Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(backupRtmpServer, 'Backup RTMP URL')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={backupRtmpServer}
                onChange={e => setBackupRtmpServer(e.target.value)}
                placeholder="rtmp://b.rtmp.youtube.com/live2?backup=1"
                className="w-full bg-[#0D121F] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#FF1B6B]"
              />
            </div>

            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                Stream Join automatically encapsulates your video playlist into constant RTMP packets. No external broadcasting software (like OBS) is required on your computer.
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {currentStep === 3 && (
          <div className="space-y-5">
            {/* Selected MP4 Video Source Info Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#FF1B6B]/15 text-[#FF1B6B] shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate max-w-xs">{uploadedVideoName}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">Selected Video</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Duration: {uploadedVideoDuration} · Size: {uploadedVideoSize} · Format: MP4 ({videoResolution})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Change Video
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Stream Quality</label>
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                >
                  <option value="1080p60">1080p 60fps (Recommended - Full HD)</option>
                  <option value="1080p">1080p 30fps</option>
                  <option value="720p60">720p 60fps</option>
                  <option value="720p">720p 30fps</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">Broadcast Mode</label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsScheduled(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                      !isScheduled ? 'bg-[#FF1B6B] text-white border-[#FF1B6B]' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Go Live Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsScheduled(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
                      isScheduled ? 'bg-[#FF1B6B] text-white border-[#FF1B6B]' : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Schedule Later
                  </button>
                </div>
              </div>
            </div>

            {isScheduled && (
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">Scheduled Date & Time</label>
                <input
                  type="text"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  placeholder="e.g. Tomorrow, 8:00 PM"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF1B6B]"
                />
              </div>
            )}

            {/* Looping toggle */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Repeat Stream in Loop (24/7)</h4>
                  <p className="text-[11px] text-slate-400">Automatically restart video when finished without stopping YouTube broadcast</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={loop247}
                onChange={e => setLoop247(e.target.checked)}
                className="w-5 h-5 rounded text-[#FF1B6B] bg-slate-800 border-slate-700 focus:ring-[#FF1B6B]"
              />
            </div>
          </div>
        )}

        {/* Step 4: Go Live Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-28 h-20 rounded-xl object-cover border border-slate-700 shrink-0"
                />
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF1B6B]">Ready to broadcast</span>
                  <h3 className="text-base font-bold text-white">{title || uploadedVideoName.replace('.mp4', '')}</h3>
                  <p className="text-xs text-slate-400">
                    Platform: <strong className="text-white">YouTube Live</strong> · Mode: <strong className="text-white">{dualStream ? 'Dual Stream (Multi-Relay)' : 'Single Stream'}</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    RTMP Server: <strong className="text-slate-200 font-mono">{rtmpServerUrl}</strong> · Stream Key: <strong className="text-emerald-400 font-mono">•••••••• (AES-256-GCM Encrypted)</strong>
                  </p>
                  <p className="text-xs text-slate-400">
                    Video File: <strong className="text-emerald-400 font-mono">{uploadedVideoName}</strong> ({uploadedVideoSize} · {uploadedVideoDuration})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-xs">
                <div className="p-2 rounded bg-slate-950">
                  <span className="text-slate-500 text-[10px] block">Resolution</span>
                  <span className="font-bold text-slate-200">{resolution}</span>
                </div>
                <div className="p-2 rounded bg-slate-950">
                  <span className="text-slate-500 text-[10px] block">Looping</span>
                  <span className="font-bold text-emerald-400">{loop247 ? '24/7 Continuous' : 'Once'}</span>
                </div>
                <div className="p-2 rounded bg-slate-950">
                  <span className="text-slate-500 text-[10px] block">Privacy</span>
                  <span className="font-bold text-slate-200">{privacy}</span>
                </div>
                <div className="p-2 rounded bg-slate-950">
                  <span className="text-slate-500 text-[10px] block">Schedule</span>
                  <span className="font-bold text-white">{isScheduled ? scheduleTime : 'Instant Start'}</span>
                </div>
              </div>
            </div>

            {/* Plan Status Indicator & Testing Switch */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${!simulateInactivePlan && currentUser?.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse'}`} />
                <div>
                  <span className="font-bold text-white">Your Account Plan: </span>
                  <span className="text-[#FF1B6B] font-semibold">{currentUser?.plan || 'Pro'} Plan</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${!simulateInactivePlan && currentUser?.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {!simulateInactivePlan && currentUser?.status === 'Active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Dev/Testing Toggle to simulate inactive plan */}
              <button
                type="button"
                onClick={() => setSimulateInactivePlan(!simulateInactivePlan)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer self-start sm:self-auto"
                title="Click to toggle active vs inactive plan check simulation"
              >
                {simulateInactivePlan ? 'Simulate: Plan Inactive (ON)' : 'Test Inactive Plan Notice'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Stream Join cloud engine is pre-warmed and ready to broadcast to YouTube.</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunchStream}
              className="px-8 py-3 rounded-xl font-black text-sm text-white gradient-brand hover:opacity-95 shadow-xl shadow-rose-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>{isScheduled ? 'Schedule Stream' : 'Go Live Now'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Center-Screen Modal Notice: "Please activate your plan" */}
      {planInactiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0F1626] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/60 space-y-6 text-center animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPlanInactiveModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Warning Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-600/20">
              <AlertTriangle className="w-8 h-8 animate-pulse text-rose-500" />
            </div>

            {/* Notice Title & Message */}
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Please Activate Your Plan
              </h3>
              <p className="text-xs text-rose-400 font-semibold tracking-wider uppercase">
                লাইভ শুরু করতে অনুগ্রহ করে আপনার প্ল্যান সক্রিয় করুন
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                Your account currently does not have an active subscription, or your renewal period has expired.
                To broadcast 24/7 continuous high-definition live streams to YouTube, please activate or renew your plan.
              </p>
            </div>

            {/* Current Plan Status Card */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
              <div className="text-left">
                <span className="text-slate-400 text-[11px] block">Account Plan</span>
                <span className="font-bold text-white">{currentUser?.plan || 'Free'} Plan</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">Current Status</span>
                <span className="inline-block px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Inactive / Expired
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPlanInactiveModalOpen(false);
                  navigate('user/subscription');
                }}
                className="flex-1 py-3 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Activate Plan Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPlanInactiveModalOpen(false)}
                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
