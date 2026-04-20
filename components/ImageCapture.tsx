"use client";
// components/ImageCapture.tsx

import { useRef, useState, useCallback, useEffect } from "react";

interface ImageCaptureProps {
  onFileSelected: (file: File) => void;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";
const MAX_FILE_MB = 10;

export default function ImageCapture({ onFileSelected }: ImageCaptureProps) {
  const fileInputRef       = useRef<HTMLInputElement>(null);
  const videoRef           = useRef<HTMLVideoElement>(null);
  const canvasRef          = useRef<HTMLCanvasElement>(null);
  const streamRef          = useRef<MediaStream | null>(null);

  const [preview, setPreview]         = useState<string | null>(null);
  const [pendingFile, setPending]     = useState<File | null>(null);
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sizeError, setSizeError]     = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // ── Stop any active stream
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  // ── Open live camera
  const openCamera = useCallback(async () => {
    setCameraError(null);
    setCameraOpen(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your browser does not support camera access. Please upload an image instead.");
      setCameraOpen(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCameraError("No camera found on this device. Please upload an image instead.");
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
      setCameraOpen(false);
    }
  }, []);

  // ── Close camera without capturing
  const closeCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
    setCameraError(null);
  }, [stopStream]);

  // ── Capture a still frame from the video stream
  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const url  = URL.createObjectURL(blob);
      setPreview(url);
      setPending(file);
      stopStream();
      setCameraOpen(false);
    }, "image/jpeg", 0.92);
  }, [stopStream]);

  // ── Handle gallery/file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSizeError(null);
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_MB) {
      setSizeError(`File too large (${sizeMB.toFixed(1)} MB). Max is ${MAX_FILE_MB} MB.`);
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setPending(file);
    e.target.value = "";
  }, [preview]);

  const handleCancel = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPending(null);
    setSizeError(null);
  }, [preview]);

  const handleProcess = useCallback(() => {
    if (pendingFile) onFileSelected(pendingFile);
  }, [pendingFile, onFileSelected]);

  // ── Cleanup stream on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  // ── PREVIEW SCREEN ──────────────────────────────────────────
  if (preview && pendingFile) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl overflow-hidden border-2 border-focus/30 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Captured preview" className="w-full object-contain max-h-[50vh] bg-cream-100" />
        </div>
        <p className="text-center text-ink-500 text-sm">
          {pendingFile.name} · {(pendingFile.size / 1024).toFixed(0)} KB
        </p>
        <button onClick={handleProcess} className="btn-primary w-full text-lg py-4">
          ✨ Process Text
        </button>
        <button onClick={handleCancel} className="btn-ghost w-full">
          ← Retake / Choose Different
        </button>
      </div>
    );
  }

  // ── LIVE CAMERA SCREEN ──────────────────────────────────────
  if (cameraOpen) {
    return (
      <div className="space-y-4">
        {/* Video viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-focus/30 shadow-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onCanPlay={() => setCameraReady(true)}
            className="w-full max-h-[55vh] object-cover"
          />
          {/* Aim guide overlay */}
          {cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-white/60 rounded-xl w-4/5 h-3/4" />
            </div>
          )}
          {/* Loading state */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <p className="text-white text-sm animate-pulse">Starting camera…</p>
            </div>
          )}
        </div>

        {/* Hidden canvas used for capture */}
        <canvas ref={canvasRef} className="hidden" />

        <button
          onClick={capturePhoto}
          disabled={!cameraReady}
          className="btn-primary w-full py-5 text-xl"
          aria-label="Take photo"
        >
          📸 Capture
        </button>

        <button onClick={closeCamera} className="btn-ghost w-full">
          ✕ Cancel
        </button>
      </div>
    );
  }

  // ── DEFAULT SCREEN ──────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="card text-center py-10 space-y-3">
        <span className="text-6xl block">📸</span>
        <h2 className="font-display text-xl font-semibold text-ink-900">
          Capture or upload text
        </h2>
        <p className="text-ink-500 text-sm reading-text max-w-xs mx-auto">
          Point your camera at any text — a book, sign, or screen — and we'll simplify it.
        </p>
      </div>

      {/* Camera button */}
      <button
        onClick={openCamera}
        className="btn-primary w-full text-base py-4 flex items-center justify-center gap-3"
      >
        <span className="text-2xl">📷</span>
        <span>Open Camera</span>
      </button>

      {/* Camera error */}
      {cameraError && (
        <p role="alert" className="text-red-600 text-sm text-center bg-red-50 rounded-xl p-3">
          {cameraError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-cream-200" />
        <span className="text-ink-300 text-sm">or</span>
        <div className="flex-1 h-px bg-cream-200" />
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="btn-ghost w-full text-base py-4 flex items-center justify-center gap-3"
      >
        <span className="text-2xl">🖼️</span>
        <span>Upload from Gallery</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {sizeError && (
        <p role="alert" className="text-red-600 text-sm text-center bg-red-50 rounded-xl p-3">
          {sizeError}
        </p>
      )}

      <p className="text-center text-ink-300 text-xs">
        Camera requires browser permission. Tap <strong>Allow</strong> when prompted.
      </p>
    </div>
  );
}
