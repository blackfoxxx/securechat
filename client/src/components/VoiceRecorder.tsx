import { Button } from "@/components/ui/button";
import { Mic, X, Send, Pause, Play } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
    pauseRecording,
    resumeRecording,
  } = useVoiceRecorder();

  const [isHolding, setIsHolding] = useState(false);
  const [mode, setMode] = useState<'hold' | 'tap'>('hold'); // hold-to-record or tap-to-record

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start recording when component mounts (tap mode)
  useEffect(() => {
    startRecording();
    setMode('tap');
  }, []);

  const handleMouseDown = () => {
    if (mode === 'hold' && !isRecording) {
      setIsHolding(true);
      startRecording();
    }
  };

  const handleMouseUp = async () => {
    if (mode === 'hold' && isHolding && isRecording) {
      setIsHolding(false);
      const recording = await stopRecording();
      if (recording && recording.duration >= 1) {
        onRecordingComplete(recording.blob, recording.duration);
      } else if (recording && recording.duration < 1) {
        // Too short
        cancelRecording();
      }
    }
  };

  const handleCancel = () => {
    setIsHolding(false);
    cancelRecording();
    onCancel();
  };

  const handleSend = async () => {
    const recording = await stopRecording();
    if (recording) {
      onRecordingComplete(recording.blob, recording.duration);
    }
  };

  // Prevent context menu on long press
  useEffect(() => {
    const preventContextMenu = (e: Event) => {
      if (isHolding) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', preventContextMenu);
    return () => document.removeEventListener('contextmenu', preventContextMenu);
  }, [isHolding]);

  // Tap mode (current behavior) - show recording UI
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 w-full bg-muted/50 rounded-lg p-2">
        {/* Cancel button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          className="shrink-0"
        >
          <X className="h-5 w-5 text-destructive" />
        </Button>

        {/* Recording indicator */}
        <div className="flex items-center gap-2 flex-1">
          <div className={cn(
            "w-3 h-3 rounded-full bg-red-500 animate-pulse",
            isPaused && "animate-none opacity-50"
          )} />
          
          {/* Waveform visualization */}
          <div className="flex items-center gap-0.5 flex-1 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/30 rounded-full transition-all duration-100"
                style={{
                  height: `${Math.max(20, audioLevel * 100 * (0.5 + Math.random() * 0.5))}%`,
                }}
              />
            ))}
          </div>

          {/* Timer */}
          <span className="text-sm font-mono font-medium min-w-[3rem] text-right">
            {formatTime(recordingTime)}
          </span>
        </div>

        {/* Pause/Resume button */}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={isPaused ? resumeRecording : pauseRecording}
          className="shrink-0"
        >
          {isPaused ? (
            <Play className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </Button>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          className="shrink-0"
          disabled={recordingTime < 1}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Hold mode - show mic button
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="shrink-0"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
