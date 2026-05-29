import { useEffect, useState, useRef } from 'react';

export const useWebcamWithTimestamp = (rawStream: MediaStream | null) => {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasStreamTracksRef = useRef<MediaStreamTrack[]>([]);

  useEffect(() => {
    if (!rawStream) {
      setProcessedStream(null);
      return;
    }

    const videoTrack = rawStream.getVideoTracks()[0];
    if (!videoTrack) {
      setError('No video track found in webcam stream');
      return;
    }

    setError(null);

    // Create a hidden video element to decode stream frames
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = rawStream;
    videoRef.current = video;

    // Create a hidden canvas for drawing the video and timestamp overlay
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Failed to create canvas 2D context');
      return;
    }

    let isStreaming = false;

    const startCanvasProcessing = () => {
      // Set canvas size matching the webcam resolution
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const draw = () => {
        if (!video || video.paused || video.ended) return;

        // Draw current webcam frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Generate current live digital clock text (HH:MM:SS)
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const timeString = `${hh}:${mm}:${ss}`;

        ctx.save();
        
        // Font sizing relative to canvas height
        const fontSize = Math.max(16, Math.floor(canvas.height * 0.055));
        ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
        
        // Measure text to dynamically calculate container capsule dimensions
        const textMetrics = ctx.measureText(timeString);
        const textWidth = textMetrics.width;
        const paddingX = fontSize * 0.5;
        const paddingY = fontSize * 0.35;
        
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = fontSize + paddingY * 2;
        
        // Position top-right corner with 24px margins
        const pillX = canvas.width - pillWidth - 24;
        const pillY = 24;

        // Draw slate dark capsule background with glowing indigo border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.lineWidth = Math.max(2, Math.floor(fontSize * 0.05));

        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 8);
        } else {
          ctx.rect(pillX, pillY, pillWidth, pillHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Write white time text inside the capsule
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(timeString, pillX + paddingX, pillY + paddingY + fontSize * 0.82);

        ctx.restore();

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      if (!isStreaming) {
        isStreaming = true;

        // Extract canvas capture track at 30 FPS
        const canvasStream = canvas.captureStream(30);
        const canvasVideoTrack = canvasStream.getVideoTracks()[0];
        canvasStreamTracksRef.current = [canvasVideoTrack];

        // Combine canvas video with original mic audio
        const outputStream = new MediaStream();
        outputStream.addTrack(canvasVideoTrack);
        
        const audioTrack = rawStream.getAudioTracks()[0];
        if (audioTrack) {
          outputStream.addTrack(audioTrack);
        }

        setProcessedStream(outputStream);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    video.onloadedmetadata = () => {
      video.play()
        .then(() => {
          startCanvasProcessing();
        })
        .catch((err) => {
          console.error('Failed to auto-play hidden video element:', err);
          setError('Failed to play webcam stream: ' + err.message);
        });
    };

    if (video.readyState >= video.HAVE_METADATA) {
      video.play().then(startCanvasProcessing).catch(err => {
        console.error('Failed to auto-play hidden video element:', err);
      });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      canvasStreamTracksRef.current.forEach(track => {
        track.stop();
      });
      canvasStreamTracksRef.current = [];
    };
  }, [rawStream]);

  return { processedStream, error };
};
