import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration: number;
  className?: string;
}

export function VoiceMessagePlayer({ audioUrl, duration, className }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioLevel(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.remove();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  const updateAudioLevel = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average / 255);

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  const setupAudioAnalyser = async () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio analyser:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      await setupAudioAnalyser();
      await audioRef.current.play();
      setIsPlaying(true);
      updateAudioLevel();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-2 min-w-[200px]", className)}>
      {/* Play/Pause button */}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={togglePlayPause}
        className="shrink-0 h-8 w-8"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Waveform/Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="relative h-6 cursor-pointer flex items-center gap-0.5"
          onClick={handleSeek}
        >
          {Array.from({ length: 30 }).map((_, i) => {
            const barProgress = (i / 30) * 100;
            const isActive = barProgress <= progress;
            const height = isActive && isPlaying
              ? Math.max(30, audioLevel * 100 * (0.5 + Math.random() * 0.5))
              : 40 + Math.random() * 60;

            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-100",
                  isActive ? "bg-primary" : "bg-muted-foreground/30"
                )}
                style={{
                  height: `${height}%`,
                }}
              />
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
