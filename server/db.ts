import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, conversations, conversationMembers, messages, contacts } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Chat feature queries
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const { sql } = await import("drizzle-orm");
  
  const result = await db
    .select({
      conversation: conversations,
      lastMessage: messages,
      otherUserId: sql<number>`(
        SELECT cm2.userId 
        FROM conversationMembers cm2 
        WHERE cm2.conversationId = ${conversations.id} 
        AND cm2.userId != ${userId} 
        LIMIT 1
      )`,
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversationMembers.userId, userId))
    .orderBy(conversations.updatedAt);
  
  // Fetch other user details for each conversation
  const enriched = await Promise.all(
    result.map(async (conv) => {
      if (conv.otherUserId) {
        const otherUser = await db
          .select()
          .from(users)
          .where(eq(users.id, conv.otherUserId))
          .limit(1);
        return {
          ...conv,
          otherUser: otherUser[0] || null,
        };
      }
      return { ...conv, otherUser: null };
    })
  );
    
  return enriched;
}

export async function getConversationMessages(conversationId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

export async function createMessage(data: { 
  conversationId: number; 
  senderId: number; 
  content?: string; 
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  audioDuration?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(messages).values({
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content || null,
    fileUrl: data.fileUrl || null,
    fileName: data.fileName || null,
    fileType: data.fileType || null,
    fileSize: data.fileSize || null,
    thumbnailUrl: data.thumbnailUrl || null,
    audioDuration: data.audioDuration || null,
  });
  
  return result;
}

export async function getUserContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      contact: contacts,
      user: users,
    })
    .from(contacts)
    .innerJoin(users, eq(contacts.contactUserId, users.id))
    .where(eq(contacts.userId, userId));
}


// Admin functions
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  const allUsers = await db.select().from(users);
  return allUsers.map(user => ({
    ...user,
    isOnline: false, // TODO: implement real-time online status
    messageCount: 0, // TODO: implement message counting
    storageUsed: 0, // TODO: implement storage calculation
  }));
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return {
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    messagesToday: 0,
    totalStorage: 0,
    avgResponseTime: "N/A",
  };
  
  const allUsers = await db.select().from(users);
  
  return {
    totalUsers: allUsers.length,
    activeUsers: 0, // TODO: implement active users count
    totalMessages: 0, // TODO: implement message counting
    messagesToday: 0, // TODO: implement today's messages
    totalStorage: 0, // TODO: implement storage calculation
    avgResponseTime: "N/A", // TODO: implement response time tracking
  };
}

export async function createUser(data: { name: string; email: string; password: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // TODO: Hash password before storing
  // For now, this is a placeholder - implement proper password hashing
  await db.insert(users).values({
    name: data.name,
    email: data.email,
    openId: `local_${Date.now()}`, // Generate unique ID
    loginMethod: "local",
  });
  
  return { success: true };
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(users).where(eq(users.id, userId));
  return { success: true };
}


// User profile functions
export async function updateUserProfile(
  userId: number,
  data: { username?: string; name?: string; bio?: string; avatar?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if username is being updated and if it's already taken
  if (data.username) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .limit(1);
    
    if (existing.length > 0 && existing[0].id !== userId) {
      throw new Error("Username already taken");
    }
  }

  await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId));

  return { success: true };
}

export async function updateUserNotifications(
  userId: number,
  preferences: Record<string, boolean>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ notificationPreferences: JSON.stringify(preferences) })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function checkUsernameAvailable(username: string) {
  const db = await getDb();
  if (!db) return { available: false };

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return { available: existing.length === 0 };
}

export async function searchUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      avatar: users.avatar,
      bio: users.bio,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(10);

  return results;
}


export async function addUserContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if contact already exists
  const { and } = await import("drizzle-orm");
  const existing = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.userId, userId), eq(contacts.contactUserId, contactId)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Contact already added");
  }

  // Add contact
  await db.insert(contacts).values({
    userId,
    contactUserId: contactId,
  });

  return { success: true };
}


export async function registerUser(data: { email: string; password: string; name?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("Email already registered");
  }

  // Hash password
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Create user with a temporary openId (email-based)
  const openId = `local_${data.email}`;
  
  await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash,
    name: data.name || null,
    loginMethod: "local",
  });

  return { success: true, message: "Account created successfully" };
}


export async function createGroupConversation(data: {
  name: string;
  createdBy: number;
  memberIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create the conversation
  const conversationResult: any = await db.insert(conversations).values({
    type: "group",
    name: data.name,
    createdBy: data.createdBy,
  });

  const conversationId = Number(conversationResult.insertId);

  // Add all members to the conversation
  const memberValues = data.memberIds.map(userId => ({
    conversationId,
    userId,
  }));

  await db.insert(conversationMembers).values(memberValues);

  return { conversationId };
}

export async function addGroupMember(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(conversationMembers).values({
    conversationId,
    userId,
  });

  return { success: true };
}

export async function removeGroupMember(conversationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    );

  return { success: true };
}

export async function getGroupMembers(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const members = await db
    .select({
      user: users,
      joinedAt: conversationMembers.joinedAt,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(eq(conversationMembers.conversationId, conversationId));

  return members;
}


export async function markMessageAsRead(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current message
  const message = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (message.length === 0) {
    throw new Error("Message not found");
  }

  // Parse existing readBy array
  let readBy: number[] = [];
  if (message[0].readBy) {
    try {
      readBy = JSON.parse(message[0].readBy);
    } catch (e) {
      readBy = [];
    }
  }

  // Add userId if not already in the array
  if (!readBy.includes(userId)) {
    readBy.push(userId);
    
    // Update message with new readBy array
    await db
      .update(messages)
      .set({ readBy: JSON.stringify(readBy) })
      .where(eq(messages.id, messageId));
  }

  return { success: true };
}

export async function deleteMessage(messageId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify user owns the message
  const message = await db
    .select()
    .from(messages)
    .where(and(eq(messages.id, messageId), eq(messages.senderId, userId)))
    .limit(1);

  if (message.length === 0) {
    throw new Error("Message not found or unauthorized");
  }

  await db.delete(messages).where(eq(messages.id, messageId));

  return { success: true };
}


export async function addMessageReaction(messageId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current reactions
  const message = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (message.length === 0) throw new Error("Message not found");

  const currentReactions = message[0].reactions ? JSON.parse(message[0].reactions) : {};
  
  // Add user to emoji reactions
  if (!currentReactions[emoji]) {
    currentReactions[emoji] = [];
  }
  if (!currentReactions[emoji].includes(userId)) {
    currentReactions[emoji].push(userId);
  }

  // Update message
  await db.update(messages)
    .set({ reactions: JSON.stringify(currentReactions) })
    .where(eq(messages.id, messageId));

  return { success: true, reactions: currentReactions };
}

export async function removeMessageReaction(messageId: number, userId: number, emoji: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current reactions
  const message = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (message.length === 0) throw new Error("Message not found");

  const currentReactions = message[0].reactions ? JSON.parse(message[0].reactions) : {};
  
  // Remove user from emoji reactions
  if (currentReactions[emoji]) {
    currentReactions[emoji] = currentReactions[emoji].filter((id: number) => id !== userId);
    if (currentReactions[emoji].length === 0) {
      delete currentReactions[emoji];
    }
  }

  // Update message
  await db.update(messages)
    .set({ reactions: JSON.stringify(currentReactions) })
    .where(eq(messages.id, messageId));

  return { success: true, reactions: currentReactions };
}
