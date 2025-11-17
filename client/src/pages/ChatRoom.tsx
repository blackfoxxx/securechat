import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/contexts/SocketContext";
import { trpc } from "@/lib/trpc";
import { Send, Paperclip, X, Image as ImageIcon, File, Mic, Check, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { MessageReactions } from "@/components/MessageReactions";
import { MessageContextMenu } from "@/components/MessageContextMenu";
import { ForwardMessageDialog } from "@/components/ForwardMessageDialog";
import { MessageReply } from "@/components/MessageReply";

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id || "0");
  const { user, isAuthenticated } = useAuth();
  const { socket, connected } = useSocket();
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<{ userId: number; userName: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<{ id: number; content: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: number; content: string; senderName: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, refetch } = trpc.chat.messages.useQuery(
    { conversationId },
    { enabled: isAuthenticated && conversationId > 0 }
  );

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetch();
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
    },
  });

  const uploadFileMutation = trpc.chat.uploadFile.useMutation();
  const deleteMessageMutation = trpc.chat.deleteMessage.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Message deleted");
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  useEffect(() => {
    if (socket && connected) {
      socket.emit("join-conversation", conversationId);

      socket.on("new-message", () => {
        refetch();
      });

      // Listen for typing events
      socket.on("typing:user-started", ({ conversationId: typingConvId, userId, userName }: { conversationId: number; userId: number; userName: string }) => {
        if (typingConvId === conversationId && userId !== user?.id) {
          setTypingUsers((prev) => {
            if (prev.find((u) => u.userId === userId)) return prev;
            return [...prev, { userId, userName }];
          });
        }
      });

      socket.on("typing:user-stopped", ({ conversationId: typingConvId, userId }: { conversationId: number; userId: number }) => {
        if (typingConvId === conversationId) {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
        }
      });

      // Listen for read receipt updates
      socket.on("message:read:update", () => {
        refetch(); // Refresh messages to get updated read status
      });

      return () => {
        socket.off("new-message");
        socket.off("typing:user-started");
        socket.off("typing:user-stopped");
        socket.off("message:read:update");
        socket.emit("leave-conversation", conversationId);
      };
    }
  }, [socket, connected, conversationId, refetch, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!socket || !user || !messages) return;

    // Mark all unread messages from others as read
    messages.forEach((msg: any) => {
      if (msg.senderId !== user.id) {
        const readBy = msg.readBy ? JSON.parse(msg.readBy) : [];
        if (!readBy.includes(user.id)) {
          socket.emit("message:read", { messageId: msg.id, userId: user.id });
        }
      }
    });
  }, [messages, socket, user]);

  const handleTyping = () => {
    if (!socket || !user) return;

    // Emit typing start event
    if (!isTypingRef.current) {
      socket.emit("typing:start", {
        conversationId,
        userId: user.id,
        userName: user.name || "User",
      });
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && user) {
        socket.emit("typing:stop", {
          conversationId,
          userId: user.id,
        });
        isTypingRef.current = false;
      }
    }, 3000);
  };

  const handleFileSelect = (file: File) => {
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    setIsRecording(false);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => { const base64Data = (reader.result as string).split(',')[1];
        
        const uploadResult = await uploadFileMutation.mutateAsync({
          fileName: `voice-${Date.now()}.webm`,
          fileType: 'audio/webm',
          fileSize: audioBlob.size,
          fileData: base64Data,
        });

        // Send message with voice note
        sendMessageMutation.mutate({
          conversationId,
          fileUrl: uploadResult.fileUrl,
          fileName: uploadResult.fileName,
          fileType: uploadResult.fileType,
          fileSize: uploadResult.fileSize,
          audioDuration: duration,
        });
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      toast.error("Failed to send voice message");
    }
  };

  const handleVoiceRecordingCancel = () => {
    setIsRecording(false);
  };

  const handleSendMessage = async () => {
    if (!user) return;

    // Stop typing indicator
    if (socket && isTypingRef.current) {
      socket.emit("typing:stop", {
        conversationId,
        userId: user.id,
      });
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (selectedFile) {
      // Upload file first
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          
          const uploadResult = await uploadFileMutation.mutateAsync({
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            fileData: base64Data,
          });

          // Send message with file attachment
          sendMessageMutation.mutate({
            conversationId,
            content: message || `Sent ${selectedFile.type.startsWith('image/') ? 'an image' : 'a file'}`,
            fileUrl: uploadResult.fileUrl,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            thumbnailUrl: uploadResult.thumbnailUrl || undefined,
            replyToId: replyTo?.id,
          });
          setReplyTo(null);
        };
        reader.readAsDataURL(selectedFile);
      } catch (error) {
        toast.error("Failed to upload file");
      }
    } else if (message.trim()) {
      sendMessageMutation.mutate({
        conversationId,
        content: message,
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b p-4">
        <h2 className="text-xl font-semibold">Chat Room</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages && messages.length > 0 ? (
          messages.map((msg) => {
            const readBy = msg.readBy ? JSON.parse(msg.readBy) : [];
            const isRead = readBy.length > 0;
            const isDelivered = true; // Assume delivered if in DB
            const isSent = msg.senderId === user?.id;

            return (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
            >
              <MessageContextMenu
                onCopy={() => {
                  if (msg.content) {
                    navigator.clipboard.writeText(msg.content);
                    toast.success("Message copied to clipboard");
                  }
                }}
                onForward={() => {
                  setMessageToForward({ id: msg.id, content: msg.content || "" });
                  setForwardDialogOpen(true);
                }}
                onReply={() => {
                  const sender = msg.senderId === user?.id ? "You" : "User";
                  setReplyTo({ id: msg.id, content: msg.content || "File", senderName: sender });
                }}
                onDelete={() => {
                  deleteMessageMutation.mutate({ messageId: msg.id });
                }}
                canDelete={msg.senderId === user?.id}
              >
                <Card
                  className={`group p-3 max-w-[70%] ${
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                {/* Image preview */}
                {msg.fileUrl && msg.fileType?.startsWith('image/') && (
                  <img 
                    src={msg.thumbnailUrl || msg.fileUrl} 
                    alt={msg.fileName || "Image"}
                    className="rounded-lg max-w-full mb-2 cursor-pointer"
                    onClick={() => window.open(msg.fileUrl!, '_blank')}
                  />
                )}
                
                {/* Voice message */}
                {msg.fileUrl && msg.fileType?.startsWith('audio/') && (
                  <div className="mb-2">
                    <AudioPlayer audioUrl={msg.fileUrl} duration={msg.audioDuration || undefined} />
                  </div>
                )}
                
                {/* File attachment */}
                {msg.fileUrl && !msg.fileType?.startsWith('image/') && !msg.fileType?.startsWith('audio/') && (
                  <a 
                    href={msg.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-background/10 rounded mb-2 hover:bg-background/20"
                  >
                    <File className="h-4 w-4" />
                    <span className="text-sm truncate">{msg.fileName}</span>
                  </a>
                )}
                
                {msg.content && <p className="text-sm">{msg.content}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                  {isSent && (
                    <span className="text-xs">
                      {isRead ? (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      ) : isDelivered ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>

                {/* Message Reactions */}
                <MessageReactions
                  messageId={msg.id}
                  reactions={msg.reactions}
                  currentUserId={user!.id}
                  onReactionUpdate={refetch}
                />
              </Card>
              </MessageContextMenu>
            </div>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <Card className="p-3 bg-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].userName} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div 
        className={`border-t p-4 ${isDragging ? 'bg-accent' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File preview */}
        {selectedFile && (
          <div className="mb-3 p-3 border rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              {filePreview ? (
                <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-background rounded">
                  <File className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Reply Preview */}
        <MessageReply 
          replyTo={replyTo}
          onCancel={() => setReplyTo(null)}
        />

        {isRecording ? (
          <VoiceRecorder 
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={handleVoiceRecordingCancel}
          />
        ) : (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={isDragging ? "Drop file here..." : "Type a message..."}
              className="flex-1"
            />
            {!message.trim() && !selectedFile ? (
              <Button 
                variant="outline"
                size="icon"
                onClick={() => setIsRecording(true)}
              >
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSendMessage} 
                disabled={!message.trim() && !selectedFile}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Forward Message Dialog */}
      {messageToForward && (
        <ForwardMessageDialog
          open={forwardDialogOpen}
          onOpenChange={setForwardDialogOpen}
          messageContent={messageToForward.content}
          messageId={messageToForward.id}
        />
      )}
    </div>
  );
}
