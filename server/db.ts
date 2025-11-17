import { eq } from "drizzle-orm";
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
  
  const result = await db
    .select({
      conversation: conversations,
      lastMessage: messages,
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(eq(conversationMembers.userId, userId))
    .orderBy(conversations.updatedAt);
    
  return result;
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

export async function createMessage(data: { conversationId: number; senderId: number; content: string; type?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(messages).values({
    conversationId: data.conversationId,
    senderId: data.senderId,
    content: data.content,
    type: (data.type as any) || "text",
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
