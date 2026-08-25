import { useState, useEffect, useRef, useCallback } from "react";
import {
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  PlayCircle,
  RotateCcw,
  RotateCw,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Upload } from "@/lib/lms-storage";

function uploadUrl(u: Upload): string | undefined {
  return (u as any).url ?? (u as any).content_url ?? undefined;
}

/**
 * Security note (frontend-only mitigation):
 * ------------------------------------------------------------
 * This function extracts ONLY the bare YouTube video ID. The raw
 * YouTube URL itself is never stored anywhere it could be rendered
 * as text, placed in an href/title/data-* attribute, or otherwise
 * surfaced in the DOM.
 *
 * This is NOT a complete protection: someone who opens DevTools'
 * Network tab can still see the underlying request. That part is
 * inherent to using YouTube as a video host and cannot be solved
 * from the frontend alone.
 * ------------------------------------------------------------
 */
function getYouTubeVideoId(value?: string): string | undefined {
  if (!value) return undefined;

  const input = value.trim();

  // Already a bare YouTube video ID.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // Defensive fallback: some stored records may have a YouTube link
  // concatenated after another URL (e.g. a storage base URL). Look
  // for any recognizable YouTube pattern embedded anywhere in the
  // string before falling back to strict URL parsing.
  const embeddedMatch = input.match(
    /https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (embeddedMatch) {
    return embeddedMatch[1];
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : undefined;
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const id = url.searchParams.get("v");
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;

      const parts = url.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      const shortsIndex = parts.indexOf("shorts");
      const candidate =
        embedIndex >= 0 ? parts[embedIndex + 1] :
        shortsIndex >= 0 ? parts[shortsIndex + 1] :
        undefined;

      return candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)
        ? candidate
        : undefined;
    }
  } catch {
    // Ignore invalid URLs. The existing UI will simply show the fallback state.
  }

  return undefined;
}

/* ============ YouTube IFrame Player API loader (singleton) ============ */
// Loaded once and reused across every lesson/video mount. We talk to the
// player exclusively through this API (postMessage under the hood) instead
// of letting the student interact with YouTube's own iframe UI directly.
let youTubeApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (youTubeApiPromise) return youTubeApiPromise;

  youTubeApiPromise = new Promise((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return youTubeApiPromise;
}

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const QUALITY_LABELS: Record<string, string> = {
  auto: "Auto",
  highres: "4K+",
  hd2160: "2160p",
  hd1440: "1440p",
  hd1080: "1080p",
  hd720: "720p",
  large: "480p",
  medium: "360p",
  small: "240p",
  tiny: "144p",
};
function qualityLabel(level: string): string {
  return QUALITY_LABELS[level] ?? level;
}

const SEEK_STEP_SECONDS = 10; // amount skipped on double-click / double-tap
const CONTROLS_HIDE_DELAY_MS = 2500; // auto-hide the control bar after inactivity

/**
 * Fully custom video player.
 * ------------------------------------------------------------
 * YouTube's own UI is completely hidden (`controls: 0`), so the
 * student never sees YouTube's default control bar. Instead, an
 * entirely custom, in-house control layer (its own DOM, not the
 * YouTube iframe) handles play/pause, seeking, mute, volume, speed,
 * quality and fullscreen via the IFrame Player API. Because that
 * overlay lives in our own document (not inside YouTube's
 * cross-origin iframe), we CAN reliably block the right-click
 * "Copy video URL" context menu — something that was previously
 * impossible once a click reached YouTube's own iframe.
 *
 * IMPORTANT DESIGN CHOICE (brief top-strip blur, not full black screen):
 * -----------------------------------------------------------------
 * On pause, YouTube (with controls=0 / rel=0) shows nothing extra —
 * the paused frame is already clean. The only moment YouTube's own
 * chrome (title/channel name) flashes on screen is for ~1–2 seconds
 * right after RESUMING playback (or after a seek), in a thin strip
 * along the TOP of the player. Earlier versions of this component
 * covered the ENTIRE video with solid black on every pause, which
 * defeats the purpose for an education product: students frequently
 * pause a lecture video specifically to read something on screen (a
 * worksheet, a diagram, code, a whiteboard). That full-frame cover
 * has been removed entirely.
 *
 * What remains is a short-lived, top-strip-only BLUR (via
 * `backdrop-filter: blur`, a pure compositing effect — not a pixel
 * read, so it works fine over a cross-origin iframe) that appears
 * for ~1.2s right after play/seek and then fades out on its own.
 * Nothing is ever covered while the video is genuinely paused, and
 * nothing outside that thin top strip is ever touched at all. A
 * transparent full-frame click-catcher still sits above everything
 * so the student always interacts with our own controls, never
 * YouTube's.
 *
 * Still not solvable from the frontend: someone using the browser's
 * DevTools Network tab, or reading this component's compiled source,
 * can find the underlying request. No client-side technique can
 * prevent that.
 * ------------------------------------------------------------
 */
export function YouTubePlayer({
  video,
  title,
  poster,
}: {
  video: Upload;
  title: string;
  poster?: string;
}) {
  const source = uploadUrl(video);
  const videoId = getYouTubeVideoId(source);

  const containerRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const guardTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clickCountRef = useRef(0);
  const skipHideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPct, setBufferedPct] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [availableRates, setAvailableRates] = useState<number[]>([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  const [quality, setQualityState] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [volumeSliderOpen, setVolumeSliderOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Hover/scrub preview shown above the progress bar.
  const [hoverPreview, setHoverPreview] = useState<{ x: number; time: number } | null>(null);
  // Big center "+10 / -10" bounce shown after a double-click/double-tap seek.
  const [skipIndicator, setSkipIndicator] = useState<{ dir: "forward" | "backward"; key: number } | null>(null);
  // Whether we're in the brief window right after RESUMING playback or
  // seeking, where YouTube might still be rendering its own top-strip
  // title/channel overlay. This is the ONLY time the top strip is ever
  // touched — a genuinely paused video shows nothing extra, so no guard
  // is needed while paused.
  const [topGuardActive, setTopGuardActive] = useState(false);

  useEffect(() => {
    setReady(false);
    setStarted(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTopGuardActive(false);

    if (!videoId) return;
    let cancelled = false;
    let progressTimer: ReturnType<typeof setInterval> | undefined;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      const YT = (window as any).YT;

      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        // Belt-and-suspenders: also ask for a 100% box up front. The real
        // fix is below in onReady, because the API replaces our styled
        // mount div with its own <iframe> that otherwise defaults to a
        // fixed 640x390 pixel box — which is why the video used to render
        // small, pinned to the top-left corner, especially in fullscreen.
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,        // hide YouTube's own control bar entirely
          modestbranding: 1,
          rel: 0,              // no related videos from other channels
          iv_load_policy: 3,   // hide annotations/cards
          disablekb: 1,        // our overlay handles interaction, not the iframe
          fs: 0,                // fullscreen handled by our own button
          cc_load_policy: 0,   // no captions/subtitles shown by default
          playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            // The API's own <iframe> ignores our Tailwind classes, so we
            // pin it to fill its (positioned) parent directly via inline
            // styles. This is what actually makes fullscreen work correctly.
            const iframeEl: HTMLIFrameElement | undefined = e.target?.getIframe?.();
            if (iframeEl) {
              iframeEl.style.position = "absolute";
              iframeEl.style.inset = "0";
              iframeEl.style.width = "100%";
              iframeEl.style.height = "100%";
              iframeEl.style.border = "0";
            }
            setReady(true);
            setDuration(e.target.getDuration?.() ?? 0);

            const initialVolume = e.target.getVolume?.();
            if (typeof initialVolume === "number") setVolume(initialVolume);
            setMuted(!!e.target.isMuted?.());

            // Playback speed options this specific video actually supports.
            const rates = e.target.getAvailablePlaybackRates?.();
            if (Array.isArray(rates) && rates.length) setAvailableRates(rates);

            // Best-effort: YouTube's adaptive streaming means manual quality
            // selection isn't honored for every video, but we still expose
            // it when the API reports levels for this one.
            const qualities = e.target.getAvailableQualityLevels?.();
            if (Array.isArray(qualities) && qualities.length) setAvailableQualities(qualities);

            // Defensive: make sure no caption track got auto-enabled.
            try {
              e.target.unloadModule?.("captions");
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const State = (window as any).YT.PlayerState;
            if (e.data === State.PLAYING) {
              setPlaying(true);
              setStarted(true);
              setBuffering(false);
              // YouTube briefly re-renders its top-strip title/channel
              // overlay for a moment right after playback resumes (and
              // after every seek). Blur just that thin strip through the
              // short window, then fade it out — everything below the
              // strip (the actual lesson content) is visible the whole
              // time regardless, and nothing is touched at all once this
              // window passes.
              setTopGuardActive(true);
              clearTimeout(guardTimerRef.current);
              guardTimerRef.current = setTimeout(() => setTopGuardActive(false), 4200);
              if (!progressTimer) {
                progressTimer = setInterval(() => {
                  const p = playerRef.current;
                  if (p?.getCurrentTime && !scrubbingRef.current) {
                    setCurrentTime(p.getCurrentTime());
                    setDuration(p.getDuration?.() ?? 0);
                  }
                  const fraction = p?.getVideoLoadedFraction?.();
                  if (typeof fraction === "number") setBufferedPct(fraction * 100);
                }, 400);
              }
            } else if (e.data === State.PAUSED || e.data === State.ENDED) {
              setPlaying(false);
              setBuffering(false);
              // Deliberately no top-strip guard here: a genuinely paused
              // video shows nothing extra from YouTube, and a paused
              // lesson video is often exactly when a student wants to
              // read what's on screen — so nothing is covered or blurred.
              clearTimeout(guardTimerRef.current);
              setTopGuardActive(false);
              setControlsVisible(true);
              if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = undefined;
              }
            } else if (e.data === State.BUFFERING) {
              setBuffering(true);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (progressTimer) clearInterval(progressTimer);
      clearTimeout(guardTimerRef.current);
      clearTimeout(controlsHideTimerRef.current);
      clearTimeout(clickTimerRef.current);
      clearTimeout(skipHideTimerRef.current);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  // Track native fullscreen state so the icon and layout stay in sync,
  // including when the user exits via Escape rather than our own button.
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }, [playing]);

  const seekBy = useCallback(
    (delta: number) => {
      const p = playerRef.current;
      if (!p) return;
      const current = p.getCurrentTime?.() ?? currentTime;
      const dur = p.getDuration?.() ?? duration;
      const next = Math.min(dur, Math.max(0, current + delta));
      p.seekTo(next, true);
      setCurrentTime(next);
    },
    [currentTime, duration],
  );

  const seekToRatio = useCallback(
    (ratio: number, commit = true) => {
      const p = playerRef.current;
      if (!p || !duration) return;
      const target = duration * Math.min(1, Math.max(0, ratio));
      setCurrentTime(target);
      if (commit) p.seekTo(target, true);
    },
    [duration],
  );

  const showSkip = (dir: "forward" | "backward") => {
    setSkipIndicator({ dir, key: Date.now() });
    clearTimeout(skipHideTimerRef.current);
    skipHideTimerRef.current = setTimeout(() => setSkipIndicator(null), 650);
  };

  // Single click toggles play/pause; a second click within the window is
  // treated as a double-click that rewinds or fast-forwards instead —
  // mirroring the familiar "double tap to seek 10s" gesture, without ever
  // firing an unwanted play/pause toggle alongside it.
  const handleAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isRightHalf = e.clientX - rect.left > rect.width / 2;

    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        togglePlay();
        clickCountRef.current = 0;
      }, 220);
    } else {
      clearTimeout(clickTimerRef.current);
      clickCountRef.current = 0;
      seekBy(isRightHalf ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS);
      showSkip(isRightHalf ? "forward" : "backward");
    }
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute();
      setMuted(false);
      if (volume === 0) {
        p.setVolume(50);
        setVolume(50);
      }
    } else {
      p.mute();
      setMuted(true);
    }
  };

  const handleVolumeChange = (value: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setVolume(value);
    setVolume(value);
    if (value === 0) {
      p.mute();
      setMuted(true);
    } else if (muted) {
      p.unMute();
      setMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  };

  const changeSpeed = (rate: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackRate(rate);
    setPlaybackRateState(p.getPlaybackRate?.() ?? rate);
  };

  const changeQuality = (level: string) => {
    const p = playerRef.current;
    if (!p) return;
    p.setPlaybackQuality(level);
    setQualityState(level);
  };

  // Auto-hide the control bar during playback after a short period of
  // mouse/keyboard inactivity, like every mainstream video player. Any
  // movement, click, or keypress resets the timer and reveals it again.
  const wakeControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(controlsHideTimerRef.current);
    if (playing) {
      controlsHideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        setSettingsOpen(false);
        setVolumeSliderOpen(false);
      }, CONTROLS_HIDE_DELAY_MS);
    }
  }, [playing]);

  useEffect(() => {
    wakeControls();
  }, [playing, wakeControls]);

  // Keyboard shortcuts, scoped to the player container so they don't
  // interfere with the rest of the page. Space/K = play-pause,
  // Left/Right = seek 5s, Up/Down = volume, M = mute, F = fullscreen.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!ready) return;
    wakeControls();
    switch (e.key) {
      case " ":
      case "k":
      case "K":
        e.preventDefault();
        togglePlay();
        break;
      case "ArrowRight":
        e.preventDefault();
        seekBy(5);
        showSkip("forward");
        break;
      case "ArrowLeft":
        e.preventDefault();
        seekBy(-5);
        showSkip("backward");
        break;
      case "ArrowUp":
        e.preventDefault();
        handleVolumeChange(Math.min(100, volume + 10));
        break;
      case "ArrowDown":
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 10));
        break;
      case "m":
      case "M":
        e.preventDefault();
        toggleMute();
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        break;
    }
  };

  if (!videoId) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <p className="px-6 text-center text-sm text-white/70">
          Unable to load this video.
        </p>
      </div>
    );
  }

  const handleStart = () => {
    setStarted(true);
    playerRef.current?.playVideo?.();
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  // Show the top-strip blur only during the brief post-resume/seek guard
  // window. Never while genuinely paused, and never anywhere outside this
  // thin top strip.
  const showTopGuard = topGuardActive;

  // Shared ratio calculation for hover-preview and drag-scrubbing.
  const ratioFromClientX = (clientX: number) => {
    const bar = progressBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const ratio = ratioFromClientX(e.clientX);
    setHoverPreview({ x: e.clientX - e.currentTarget.getBoundingClientRect().left, time: ratio * duration });
    if (scrubbingRef.current) seekToRatio(ratio, false);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    seekToRatio(ratioFromClientX(e.clientX), false);

    const onMove = (ev: MouseEvent) => {
      const ratio = ratioFromClientX(ev.clientX);
      setHoverPreview((prev) => (prev ? { ...prev, time: ratio * duration } : prev));
      seekToRatio(ratio, false);
    };
    const onUp = (ev: MouseEvent) => {
      const ratio = ratioFromClientX(ev.clientX);
      seekToRatio(ratio, true);
      scrubbingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="relative h-full w-full select-none bg-black outline-none"
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={wakeControls}
      onKeyDown={handleKeyDown}
    >
      {/* YouTube's IFrame API renders its (UI-less, controls=0) player here.
          It is never interacted with directly by the student. */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Poster shown only before the very first play. Once the student has
          started the video, we never re-show the poster on pause — the
          actual paused video frame (rendered by YouTube itself) stays
          visible, which is the whole point for an education product. */}
      {!started && poster && (
        <div
          className="absolute inset-0 z-10 bg-black bg-cover bg-center"
          style={{ backgroundImage: `url(${poster})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Our own transparent, same-origin click-catcher. Sits above the
          YouTube iframe at all times, so any click/right-click lands here
          first rather than on YouTube's own UI. A single click toggles
          play/pause; a quick second click seeks ±10s (left half rewinds,
          right half fast-forwards), like a double-tap gesture. This layer
          covers the FULL frame for click-handling purposes, but is fully
          transparent — it does not visually hide anything. */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={(e) => e.preventDefault()}
        onClick={started ? handleAreaClick : handleStart}
      >
        {started && !ready && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
          </div>
        )}
        {ready && buffering && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/80" />
          </div>
        )}
        {/* Center play button — shown before first play, and whenever
            paused. Unlike before, this sits on a transparent layer, not
            an opaque cover, so the paused frame stays visible behind it. */}
        {(!started || (!playing && ready)) && (
          <div className="pointer-events-none flex h-full items-center justify-center">
            <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/95 text-primary shadow-elegant">
              <PlayCircle className="h-8 w-8" />
            </div>
          </div>
        )}
      </div>

      {/* Center bounce shown after a double-click/double-tap or arrow-key
          seek, so the skip always has clear visual feedback. */}
      {skipIndicator && (
        <div
          key={skipIndicator.key}
          className={cn(
            "pointer-events-none absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 rounded-full bg-black/60 px-4 py-2 text-white animate-in fade-in zoom-in-95",
            skipIndicator.dir === "forward" ? "right-8" : "left-8",
          )}
        >
          {skipIndicator.dir === "forward" ? (
            <RotateCw className="h-5 w-5" />
          ) : (
            <RotateCcw className="h-5 w-5" />
          )}
          <span className="text-sm font-medium tabular-nums">{SEEK_STEP_SECONDS}s</span>
        </div>
      )}

      {/* TOP-STRIP BLUR — brief, resume/seek-only, never covers content.
          For ~1.2s right after playback resumes (or after a seek),
          YouTube can flash its own title/channel-name text in a thin band
          along the top of the frame. Instead of an opaque block, we blur
          just that band with `backdrop-filter: blur`, which is a pure
          GPU compositing effect applied to whatever is rendered behind
          it — it works fine over a cross-origin iframe because it never
          reads pixel data, it just blurs the final composited output.
          The text becomes illegible without ever hard-covering the
          frame. It fades out on its own and never appears while the
          video is genuinely paused. */}
      {showTopGuard && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-14 backdrop-blur-md bg-black/10 transition-opacity duration-500"
          aria-hidden="true"
        />
      )}

      {/* Fully custom control bar — replaces YouTube's native controls.
          Kept above the guard strip (z-30) so it stays visible and usable
          even while paused, matching normal player expectations. Auto-hides
          during uninterrupted playback and reappears on any interaction. */}
      {started && ready && (
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-30 flex flex-col gap-1 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-6 transition-opacity duration-300",
            controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Progress bar with hover/drag time preview. */}
          <div className="relative pb-1">
            {hoverPreview && (
              <div
                className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-black/90 px-2 py-1 text-xs tabular-nums text-white shadow-elegant"
                style={{ left: hoverPreview.x }}
              >
                {formatTime(hoverPreview.time)}
              </div>
            )}
            <div
              ref={progressBarRef}
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/25 hover:h-2 transition-all"
              onMouseDown={handleProgressMouseDown}
              onMouseMove={handleProgressMouseMove}
              onMouseLeave={() => !scrubbingRef.current && setHoverPreview(null)}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${progressPct}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100"
                style={{ left: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="text-white/90 transition-colors hover:text-white"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                seekBy(-SEEK_STEP_SECONDS);
                showSkip("backward");
              }}
              className="text-white/90 transition-colors hover:text-white"
              aria-label={`Rewind ${SEEK_STEP_SECONDS} seconds`}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                seekBy(SEEK_STEP_SECONDS);
                showSkip("forward");
              }}
              className="text-white/90 transition-colors hover:text-white"
              aria-label={`Forward ${SEEK_STEP_SECONDS} seconds`}
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <span className="text-xs tabular-nums text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex-1" />

            {/* Mute toggle + volume slider (revealed on hover/click). */}
            <div
              className="relative flex items-center gap-2"
              onMouseEnter={() => setVolumeSliderOpen(true)}
              onMouseLeave={() => setVolumeSliderOpen(false)}
            >
              <button
                type="button"
                onClick={toggleMute}
                className="text-white/90 transition-colors hover:text-white"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                <VolumeIcon className="h-5 w-5" />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  volumeSliderOpen ? "w-16 opacity-100" : "w-0 opacity-0",
                )}
              >
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="h-1.5 w-16 cursor-pointer accent-primary"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Our own speed/quality menu — replaces YouTube's gear icon,
                which is gone now that controls=0 hides YouTube's native UI. */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="text-white/90 transition-colors hover:text-white"
                aria-label="Playback settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              {settingsOpen && (
                <>
                  {/* Backdrop: closes the menu on outside click. */}
                  <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                  <div
                    className="absolute bottom-full right-0 z-50 mb-2 w-44 rounded-lg border border-white/10 bg-black/90 p-2 text-xs shadow-elegant"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="px-2 pb-1 pt-1 font-semibold text-white/60">Speed</p>
                    <div className="grid grid-cols-4 gap-1 pb-2">
                      {availableRates.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => changeSpeed(rate)}
                          className={cn(
                            "rounded-md px-1.5 py-1 text-center transition-colors",
                            playbackRate === rate
                              ? "bg-primary text-primary-foreground"
                              : "text-white/80 hover:bg-white/10",
                          )}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    {availableQualities.length > 0 && (
                      <>
                        <p className="border-t border-white/10 px-2 pb-1 pt-2 font-semibold text-white/60">
                          Quality
                        </p>
                        <div className="max-h-40 space-y-0.5 overflow-y-auto">
                          {availableQualities.map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => changeQuality(level)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors",
                                quality === level ? "text-primary" : "text-white/80 hover:bg-white/10",
                              )}
                            >
                              {qualityLabel(level)}
                              {quality === level && <Check className="h-3.5 w-3.5" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white/90 transition-colors hover:text-white"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}