import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  userNames: string[];
  className?: string;
}

export function TypingIndicator({ userNames, className }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  const displayText = (() => {
    if (userNames.length === 1) {
      return `${userNames[0]} is typing`;
    } else if (userNames.length === 2) {
      return `${userNames[0]} and ${userNames[1]} are typing`;
    } else if (userNames.length === 3) {
      return `${userNames[0]}, ${userNames[1]}, and ${userNames[2]} are typing`;
    } else {
      return `${userNames[0]}, ${userNames[1]}, and ${userNames.length - 2} others are typing`;
    }
  })();

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground px-4 py-2", className)}>
      <span>{displayText}</span>
      <div className="flex gap-1">
        <span className="animate-bounce animation-delay-0 inline-block w-1 h-1 bg-muted-foreground rounded-full" />
        <span className="animate-bounce animation-delay-150 inline-block w-1 h-1 bg-muted-foreground rounded-full" />
        <span className="animate-bounce animation-delay-300 inline-block w-1 h-1 bg-muted-foreground rounded-full" />
      </div>
    </div>
  );
}
