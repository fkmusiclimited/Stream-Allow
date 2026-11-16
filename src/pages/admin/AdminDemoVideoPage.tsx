import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { getUploadAuthToken } from '../../utils/chunkedUpload';
import {
  Tv,
  Film,
  Upload,
  Link,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Sparkles,
  ShieldCheck,
  Eye,
  Info,
  Radio,
  FileVideo,
  Image as ImageIcon
} from 'lucide-react';

export const AdminDemoVideoPage: React.FC = () => {
  const {
    currentUser,
    homepageDemoConfig,
    updateHomepageDemoConfig,
    resetHomepageDemoConfig,
    navigate,
    showToast
  } = useApp();

  // Working state initialized from active homepageDemoConfig
  const [sourceType, setSourceType] = useState<'uploaded' | 'url'>(
    homepageDemoConfig?.videoSourceType || 'uploaded'
  );
  const [title, setTitle] = useState(homepageDemoConfig?.title || 'Relaxing LoFi Music 24/7');
  const [channelName, setChannelName] = useState(homepageDemoConfig?.channelName || 'Music World');
  const [viewersText, setViewersText] = useState(homepageDemoConfig?.viewersText || '1.2K watching');
  const [videoUrl, setVideoUrl] = useState(
    homepageDemoConfig?.videoUrl || '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4'
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    homepageDemoConfig?.thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80'
  );
  const [resolution, setResolution] = useState(homepageDemoConfig?.resolution || '1080p · 60 FPS');
  const [bitrate, setBitrate] = useState(homepageDemoConfig?.bitrate || '4,500 kbps');

  // Upload status states
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Live preview player state inside admin panel
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewMuted, setIsPreviewMuted] = useState(true);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const thumbFileInputRef = useRef<HTMLInputElement>(null);

  // Handle uploading video file directly to server
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getUploadAuthToken();
    const formData = new FormData();
    formData.append('video', file);

    setIsUploadingVideo(true);
    setVideoUploadProgress(20);

    try {
      const progressTimer = setInterval(() => {
        setVideoUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
      }, 300);

      const res = await fetch('/api/admin/homepage-demo/upload-video', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      clearInterval(progressTimer);
      setVideoUploadProgress(100);

      const data = await res.json();
      if (res.ok && data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        if (data.thumbnailUrl) {
          setThumbnailUrl(data.thumbnailUrl);
        }
        if (data.resolution) {
          setResolution(`${data.resolution} · 60 FPS`);
        }
        setSourceType('uploaded');
        showToast('Video uploaded and processed! Thumbnail extracted automatically.', 'success');
      } else {
        showToast(data.message || 'Video upload failed.', 'error');
      }
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`, 'error');
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  // Handle uploading custom thumbnail image
  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = getUploadAuthToken();
    const formData = new FormData();
    formData.append('thumbnail', file);

    setIsUploadingThumbnail(true);
    try {
      const res = await fetch('/api/admin/homepage-demo/upload-thumbnail', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success && data.thumbnailUrl) {
        setThumbnailUrl(data.thumbnailUrl);
        showToast('Custom thumbnail image uploaded successfully!', 'success');
      } else {
        showToast(data.message || 'Thumbnail upload failed.', 'error');
      }
    } catch (err: any) {
      showToast(`Thumbnail upload error: ${err.message}`, 'error');
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbFileInputRef.current) {
        thumbFileInputRef.current.value = '';
      }
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Please enter a demo video title.', 'error');
      return;
    }
    if (!videoUrl.trim()) {
      showToast('Please upload a video or enter a valid video URL.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateHomepageDemoConfig({
        title: title.trim(),
        channelName: channelName.trim() || 'Music World',
        viewersText: viewersText.trim() || '1.2K watching',
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80',
        videoSourceType: sourceType,
        resolution: resolution.trim() || '1080p · 60 FPS',
        bitrate: bitrate.trim() || '4,500 kbps'
      });
      if (success) {
        setIsPreviewPlaying(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to Default
  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to restore the default Homepage Demo Video settings?')) {
      return;
    }
    setIsResetting(true);
    try {
      const success = await resetHomepageDemoConfig();
      if (success) {
        setTitle('Relaxing LoFi Music 24/7');
        setChannelName('Music World');
        setViewersText('1.2K watching');
        setVideoUrl('/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4');
        setThumbnailUrl('https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80');
        setSourceType('uploaded');
        setResolution('1080p · 60 FPS');
        setBitrate('4,500 kbps');
        setIsPreviewPlaying(false);
      }
    } finally {
      setIsResetting(false);
    }
  };

  // Quick preset sample videos for testing
  const samplePresets = [
    {
      name: 'Lo-Fi Chill Beats',
      title: 'Relaxing LoFi Music 24/7',
      channel: 'Music World',
      viewers: '1.2K watching',
      url: '/uploads/media/video-Music_video_animating_storyboard____1080-1793964845416-990953612.mp4',
      thumb: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80'
    },
    {
      name: 'Cyberpunk Synthwave',
      title: '24/7 Synthwave Radio · Chill & Coding Beats',
      channel: 'Neon City Radio',
      viewers: '2.4K watching',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumb: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=900&auto=format&fit=crop&q=80'
    },
    {
      name: 'Nature & Relaxing',
      title: 'Peaceful Ambient Nature Sounds 24/7',
      channel: 'Relaxation Hub',
      viewers: '850 watching',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=900&auto=format&fit=crop&q=80'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#FF1B6B]/10 text-[#FF1B6B] border border-[#FF1B6B]/30">
              <Tv className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
                Homepage Demo Video
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  Super Admin
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Manage the public demo video, thumbnail, and title displayed on the marketing website homepage.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
            title="Restore default LoFi beats demo"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-amber-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('public/home')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#FF1B6B]" />
            <span>View Homepage</span>
          </button>
        </div>
      </div>

      {/* Safety & Isolation Guarantee Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="space-y-0.5">
            <p className="font-bold text-white text-xs sm:text-sm">
              Strict Isolation Guarantee
            </p>
            <p className="text-[11px] text-emerald-200/90">
              The video, thumbnail, and title configured here are displayed <strong className="text-white underline">strictly on the Public Website Homepage</strong>. User Dashboards, User Playlists, and Real YouTube Live Streaming RTMP processes are 100% isolated and will never be affected.
            </p>
          </div>
        </div>
        <span className="hidden md:inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0">
          Frontend Demo Only
        </span>
      </div>

      {/* Main Grid: Left Configuration Form & Right Live Simulator Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="p-6 sm:p-7 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-6 shadow-xl">
            {/* Step 1: Video Source Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Demo Video Source
              </label>

              <div className="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSourceType('uploaded')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    sourceType === 'uploaded'
                      ? 'bg-gradient-to-r from-[#FF1B6B] to-[#FF4585] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Video File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType('url')}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    sourceType === 'url'
                      ? 'bg-gradient-to-r from-[#FF1B6B] to-[#FF4585] text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Direct Video URL</span>
                </button>
              </div>

              {/* Upload Input */}
              {sourceType === 'uploaded' ? (
                <div className="space-y-3">
                  <div
                    onClick={() => videoFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isUploadingVideo
                        ? 'border-[#FF1B6B] bg-[#FF1B6B]/5'
                        : 'border-slate-700 hover:border-[#FF1B6B] bg-slate-900/60 hover:bg-slate-900'
                    }`}
                  >
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/m4v,video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#FF1B6B]/10 text-[#FF1B6B] flex items-center justify-center">
                        <FileVideo className="w-6 h-6" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">
                          {isUploadingVideo ? 'Uploading and generating thumbnail...' : 'Click to Upload Demo Video'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Supports MP4, WebM, MOV (High bitrate 1080p supported)
                        </p>
                      </div>
                    </div>

                    {isUploadingVideo && (
                      <div className="mt-4 max-w-xs mx-auto space-y-1.5">
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#FF1B6B] h-full rounded-full transition-all duration-300"
                            style={{ width: `${videoUploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-[#FF1B6B]">Processing: {videoUploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  {videoUrl && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-slate-300 truncate font-mono text-[11px]">{videoUrl}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded shrink-0 ml-2">
                        Active File
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* URL Input */
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://example.com/video.mp4"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter a direct playable MP4 or WebM URL hosted on your CDN or storage bucket.
                  </p>

                  {/* Preset quick picks */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                      Or pick from demo presets:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {samplePresets.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setVideoUrl(preset.url);
                            setThumbnailUrl(preset.thumb);
                            setTitle(preset.title);
                            setChannelName(preset.channel);
                            setViewersText(preset.viewers);
                            setSourceType('url');
                            showToast(`Loaded preset "${preset.name}"! Click Save to apply.`, 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-700 transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Cover Photo / Thumbnail */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Demo Thumbnail / Poster Image
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative w-28 h-18 sm:w-32 sm:h-20 rounded-xl overflow-hidden border border-slate-700 bg-black shrink-0 shadow-md">
                  <img
                    src={thumbnailUrl}
                    alt="Preview"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[9px] font-mono text-white">
                    Cover
                  </div>
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /uploads/thumbnails/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#FF1B6B]"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => thumbFileInputRef.current?.click()}
                      disabled={isUploadingThumbnail}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-750 hover:text-white border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#FF1B6B]" />
                      <span>{isUploadingThumbnail ? 'Uploading...' : 'Upload Image File'}</span>
                    </button>
                    <input
                      ref={thumbFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      className="hidden"
                    />
                    <span className="text-[11px] text-slate-500">JPG, PNG, WebP up to 20MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Titles & Metadata Display */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                3. Display Labels & Metadata
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Homepage Demo Title:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Relaxing LoFi Music 24/7"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#FF1B6B]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Simulated Channel Name:
                    </label>
                    <input
                      type="text"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="e.g., Music World"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Live Watching Badge:
                    </label>
                    <input
                      type="text"
                      value={viewersText}
                      onChange={(e) => setViewersText(e.target.value)}
                      placeholder="e.g., 1.2K watching"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Resolution Tag:
                    </label>
                    <input
                      type="text"
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      placeholder="e.g., 1080p · 60 FPS"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Bitrate Tag:
                    </label>
                    <input
                      type="text"
                      value={bitrate}
                      onChange={(e) => setBitrate(e.target.value)}
                      placeholder="e.g., 4,500 kbps"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-[#FF1B6B]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500">
                Super Admin: {currentUser?.name || 'Admin'}
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white gradient-brand hover:opacity-95 shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save & Publish to Homepage'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Interactive Simulation Preview */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0F1626] border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#FF1B6B]" />
                <h3 className="font-bold text-white text-sm">Live Homepage Simulator</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Live View</span>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              This preview reflects the exact interactive box that visitors see on the homepage of <strong>streamallow.com</strong>:
            </p>

            {/* Simulated Live Studio Broadcast Box */}
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-[#0B0F17] shadow-2xl">
              {/* Window bar */}
              <div className="px-3.5 py-2.5 bg-[#111827] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="ml-2 text-[10px] font-mono text-slate-400">streamallow.cloud/live/control-center</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white flex items-center gap-1 uppercase">
                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                  LIVE NOW
                </span>
              </div>

              {/* Video Player Display */}
              <div className="relative aspect-video bg-black group overflow-hidden">
                {isPreviewPlaying ? (
                  <video
                    ref={previewVideoRef}
                    key={videoUrl}
                    src={videoUrl}
                    poster={thumbnailUrl}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted={isPreviewMuted}
                    playsInline
                  />
                ) : (
                  <img
                    src={thumbnailUrl}
                    alt={title}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=900&auto=format&fit=crop&q=80';
                    }}
                    className="w-full h-full object-cover brightness-[0.7] transition-all"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

                {/* Central Play/Pause Toggle button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewVideoRef.current) {
                        if (isPreviewPlaying) {
                          previewVideoRef.current.pause();
                        } else {
                          previewVideoRef.current.play().catch(() => {});
                        }
                      }
                      setIsPreviewPlaying(!isPreviewPlaying);
                    }}
                    className="w-14 h-14 rounded-full bg-[#FF1B6B]/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
                    title={isPreviewPlaying ? 'Pause preview' : 'Play video preview'}
                  >
                    {isPreviewPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Sound control toggle */}
                {isPreviewPlaying && (
                  <button
                    type="button"
                    onClick={() => {
                      if (previewVideoRef.current) {
                        previewVideoRef.current.muted = !isPreviewMuted;
                      }
                      setIsPreviewMuted(!isPreviewMuted);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors cursor-pointer"
                    title={isPreviewMuted ? 'Unmute' : 'Mute'}
                  >
                    {isPreviewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}

                {/* Overlay Text Tags */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white pointer-events-none">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-xs truncate">{title}</p>
                    <p className="text-slate-300 text-[10px]">Channel: {channelName} · {viewersText}</p>
                  </div>
                  <div className="bg-black/70 px-2 py-0.5 rounded backdrop-blur border border-white/10 font-mono text-[10px] shrink-0">
                    {resolution}
                  </div>
                </div>
              </div>

              {/* Sub-bar stats */}
              <div className="p-3 bg-[#0A0E17] grid grid-cols-3 gap-1.5 text-center text-xs border-t border-slate-800">
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Bitrate</span>
                  <span className="font-bold text-slate-100 text-[11px]">{bitrate}</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Loop Status</span>
                  <span className="font-bold text-emerald-400 text-[11px]">Repeating (24/7)</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Health</span>
                  <span className="font-bold text-emerald-400 text-[11px]">Excellent</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <Info className="w-3.5 h-3.5 text-[#FF1B6B]" />
                <span>Publishing Status</span>
              </div>
              <p className="text-[11px]">
                When saved, your new video is instantly served to all public visitors on the website without restarting the server or interrupting active YouTube streams.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
