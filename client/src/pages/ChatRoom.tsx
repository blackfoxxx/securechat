import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/contexts/SocketContext";
import { trpc } from "@/lib/trpc";
import { Send, Paperclip, X, Image as ImageIcon, File, Mic, Check, CheckCheck, Shield, Video, History, Lock as LockIcon, ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { AudioPlayer } from "@/components/AudioPlayer";
import { MessageReactions } from "@/components/MessageReactions";
import { MessageContextMenu } from "@/components/MessageContextMenu";
import { ForwardMessageDialog } from "@/components/ForwardMessageDialog";
import { MessageReply } from "@/components/MessageReply";
import { useE2EE } from "@/contexts/E2EEContext";
import KeyVerificationDialog from "@/components/KeyVerificationDialog";
import { CallHistory } from "@/components/CallHistory";
import { E2EEUnlockDialog } from "@/components/E2EEUnlockDialog";
import { DecryptedMessage } from "@/components/DecryptedMessage";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { ReadReceipts } from "@/components/ReadReceipts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateSymmetricKey,
  encryptMessage,
  encryptSymmetricKey,
  importPublicKey,
  generateKeyFingerprint,
  exportPublicKey,
} from "@/lib/crypto";

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { privateKey, isE2EEEnabled } = useE2EE();
  const { socket, connected } = useSocket();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<{ id: number; content: string } | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: number; content: string; senderName: string } | null>(null);
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [callHistoryDialogOpen, setCallHistoryDialogOpen] = useState(false);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const [otherUser, setOtherUser] = useState<{ id: number; name: string; avatar?: string; publicKey?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Typing indicator hook
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(
    conversationId,
    user?.id || 0,
    user?.name || "User"
  );

  const { data: messages, refetch } = trpc.chat.messages.useQuery(
    { conversationId },
    { enabled: isAuthenticated && conversationId > 0 }
  );
  
  const { data: conversations } = trpc.chat.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  
  // Get current conversation details
  const currentConversation = conversations?.find(c => c.conversation.id === conversationId);
  
  useEffect(() => {
    if (currentConversation && 'otherUser' in currentConversation && currentConversation.otherUser) {
      setOtherUser({
        id: currentConversation.otherUser.id,
        name: currentConversation.otherUser.name || 'Unknown',
        avatar: currentConversation.otherUser.avatar || undefined,
        publicKey: currentConversation.otherUser.publicKey || undefined,
      });
    }
  }, [currentConversation]);

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



      // Listen for read receipt updates
      socket.on("message:read:update", ({ messageId, userId, readBy }: { messageId: number; userId: number; readBy: any }) => {
        refetch(); // Refresh messages to get updated read status
      });

      return () => {
        socket.off("new-message");
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
        let readBy: any[] = [];
        try {
          if (msg.readBy) {
            const parsed = JSON.parse(msg.readBy);
            readBy = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          readBy = [];
        }
        
        // Check if user has already read this message
        const hasRead = readBy.some((r: any) => 
          typeof r === 'number' ? r === user.id : r.userId === user.id
        );
        
        if (!hasRead) {
          socket.emit("message:read", { messageId: msg.id, userId: user.id });
        }
      }
    });
  }, [messages, socket, user]);



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
    stopTyping();

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
      // Check if E2EE is enabled and we have the necessary keys
      if (e2eeEnabled && privateKey && otherUser?.publicKey) {
        try {
          // Generate a symmetric key for this message
          const symmetricKey = await generateSymmetricKey();
          
          // Encrypt the message content
          const { encryptedContent, iv } = await encryptMessage(message, symmetricKey);
          
          // Encrypt the symmetric key with recipient's public key
          const recipientPublicKey = await importPublicKey(otherUser.publicKey);
          const encryptedKey = await encryptSymmetricKey(symmetricKey, recipientPublicKey);
          
          // Generate sender key fingerprint for verification
          const senderPublicKey = await importPublicKey(user!.publicKey!);
          const senderKeyFingerprint = await generateKeyFingerprint(senderPublicKey);
          
          // Send encrypted message
          sendMessageMutation.mutate({
            conversationId,
            encryptedContent,
            iv,
            encryptedKey,
            senderKeyFingerprint,
            replyToId: replyTo?.id,
          });
          setReplyTo(null);
        } catch (error) {
          console.error("Failed to encrypt message:", error);
          toast.error("Failed to encrypt message. Sending unencrypted.");
          // Fallback to unencrypted
          sendMessageMutation.mutate({
            conversationId,
            content: message,
            replyToId: replyTo?.id,
          });
          setReplyTo(null);
        }
      } else {
        // Send unencrypted message
        sendMessageMutation.mutate({
          conversationId,
          content: message,
          replyToId: replyTo?.id,
        });
        setReplyTo(null);
      }
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
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/chats')}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">
            {currentConversation && 'otherUser' in currentConversation && currentConversation.otherUser
              ? currentConversation.otherUser.name || 'Unknown'
              : 'Chat Room'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {otherUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!socket || !connected) {
                    toast.error("Not connected to server");
                    return;
                  }
                  if (!currentConversation) {
                    toast.error("Conversation not found");
                    return;
                  }

                  const roomName = `chat-${conversationId}-${Date.now()}`;
                  
                  // Determine if this is a group call or 1-on-1
                  const isGroupCall = currentConversation.conversation.type === 'group';
                  let recipientIds: number[] = [];
                  
                  if (isGroupCall) {
                    // For group calls, get all members except current user
                    if ('members' in currentConversation && Array.isArray(currentConversation.members)) {
                      recipientIds = currentConversation.members
                        .filter((m: any) => m.id !== user?.id)
                        .map((m: any) => m.id);
                    }
                  } else {
                    // For 1-on-1 calls, just the other user
                    if (!otherUser) {
                      toast.error("Recipient not found");
                      return;
                    }
                    recipientIds = [otherUser.id];
                  }
                  
                  if (recipientIds.length === 0) {
                    toast.error("No recipients found");
                    return;
                  }
                  
                  // Send call initiation request via Socket.IO
                  socket.emit("call:initiate", {
                    callerId: user?.id,
                    callerName: user?.name || user?.username || "User",
                    callerAvatar: user?.avatar,
                    recipientIds, // Now an array
                    conversationId,
                    roomName,
                    callType: "video",
                    isGroupCall,
                  });

                  // Show toast that call is being initiated
                  if (isGroupCall) {
                    toast.info(`Starting group call with ${recipientIds.length} participant(s)...`);
                  } else {
                    toast.info(`Calling ${otherUser?.name}...`);
                  }

                  // For group calls, navigate immediately (participants can join)
                  if (isGroupCall) {
                    const displayName = user?.name || user?.username || 'User';
                    setLocation(`/call/${conversationId}?room=${roomName}&name=${displayName}&isGroup=true`);
                  } else {
                    // For 1-on-1 calls, wait for acceptance
                    socket.once("call:accepted", ({ roomName: acceptedRoomName }) => {
                      toast.success("Call accepted!");
                      const displayName = user?.name || user?.username || 'User';
                      setLocation(`/call/${conversationId}?room=${acceptedRoomName}&name=${displayName}`);
                    });

                    socket.once("call:declined", ({ recipientName }) => {
                      toast.error(`${recipientName} declined the call`);
                    });

                    socket.once("call:recipient-offline", () => {
                      toast.error(`${otherUser?.name} is offline`);
                    });

                    // Set timeout to cancel call after 30 seconds
                    setTimeout(() => {
                      socket.emit("call:cancel", {
                        callerId: user?.id,
                        recipientId: otherUser?.id,
                      });
                    }, 30000);
                  }
                  
                  // Listen for offline recipients notification
                  socket.once("call:some-recipients-offline", ({ offlineRecipients }) => {
                    toast.warning(`${offlineRecipients.length} participant(s) are offline`);
                  });
                }}
                className="text-sm"
              >
                <Video className="h-4 w-4 mr-2" />
                {currentConversation?.conversation.type === 'group' ? "Start Group Call" : "Video Call"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCallHistoryDialogOpen(true)}
                className="text-sm"
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVerificationDialogOpen(true)}
                className="text-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Verify
              </Button>
              {isE2EEEnabled && otherUser?.publicKey && (
                <Button
                  variant={e2eeEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (!e2eeEnabled && !privateKey) {
                      setUnlockDialogOpen(true);
                    } else {
                      setE2eeEnabled(!e2eeEnabled);
                      toast.success(e2eeEnabled ? "E2EE disabled" : "E2EE enabled");
                    }
                  }}
                  className="text-sm"
                >
                  <LockIcon className="h-4 w-4 mr-2" />
                  {e2eeEnabled ? "E2EE On" : "E2EE Off"}
                </Button>
              )}
            </>
          )}
        </div>
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
                
                {/* Display message content (encrypted or plain) */}
                {msg.encryptedContent && msg.iv && msg.encryptedKey ? (
                  <DecryptedMessage
                    encryptedContent={msg.encryptedContent}
                    iv={msg.iv}
                    encryptedKey={msg.encryptedKey}
                    senderKeyFingerprint={msg.senderKeyFingerprint || undefined}
                    onUnlockRequest={() => setUnlockDialogOpen(true)}
                  />
                ) : (
                  msg.content && <p className="text-sm">{msg.content}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                  <ReadReceipts
                    readBy={msg.readBy || undefined}
                    senderId={msg.senderId}
                    currentUserId={user?.id || 0}
                    users={currentConversation && 'members' in currentConversation ? currentConversation.members as any : []}
                    isGroupChat={currentConversation?.conversation.type === 'group'}
                  />
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
        <TypingIndicator userNames={typingUsers} />
        
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
                startTyping();
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
      
      {/* Key Verification Dialog */}
      {otherUser && (
        <KeyVerificationDialog
          open={verificationDialogOpen}
          onOpenChange={setVerificationDialogOpen}
          contactId={otherUser.id}
          contactName={otherUser.name}
          contactAvatar={otherUser.avatar}
          contactPublicKey={otherUser.publicKey}
        />
      )}

      {/* Call History Dialog */}
      <Dialog open={callHistoryDialogOpen} onOpenChange={setCallHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call History</DialogTitle>
          </DialogHeader>
          <CallHistory conversationId={conversationId} />
        </DialogContent>
      </Dialog>

      {/* E2EE Unlock Dialog */}
      <E2EEUnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        onUnlock={() => {
          setE2eeEnabled(true);
          toast.success("E2EE unlocked and enabled");
        }}
      />
    </div>
  );
}
