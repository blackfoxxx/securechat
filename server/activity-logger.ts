import { getDb } from "./db";
import { activityLogs, InsertActivityLog } from "../drizzle/schema";

/**
 * Activity Logger
 * Centralized logging system for tracking user activities for audit trail
 */

export type ActivityType =
  | "login"
  | "logout"
  | "register"
  | "message_sent"
  | "message_deleted"
  | "file_uploaded"
  | "contact_added"
  | "contact_blocked"
  | "contact_unblocked"
  | "group_created"
  | "group_joined"
  | "group_left"
  | "profile_updated"
  | "password_changed";

export interface LogActivityParams {
  userId: number;
  activityType: ActivityType;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[ActivityLogger] Database not available, skipping log");
      return;
    }

    const logEntry: InsertActivityLog = {
      userId: params.userId,
      activityType: params.activityType,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    };

    await db.insert(activityLogs).values(logEntry);
  } catch (error) {
    console.error("[ActivityLogger] Failed to log activity:", error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Log user login
 */
export async function logLogin(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logActivity({
    userId,
    activityType: "login",
    ipAddress,
    userAgent,
  });
}

/**
 * Log user logout
 */
export async function logLogout(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logActivity({
    userId,
    activityType: "logout",
    ipAddress,
    userAgent,
  });
}

/**
 * Log user registration
 */
export async function logRegister(
  userId: number,
  details?: { method?: string },
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logActivity({
    userId,
    activityType: "register",
    details,
    ipAddress,
    userAgent,
  });
}

/**
 * Log message sent
 */
export async function logMessageSent(
  userId: number,
  details: { conversationId: number; messageType?: string }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "message_sent",
    details,
  });
}

/**
 * Log message deleted
 */
export async function logMessageDeleted(
  userId: number,
  details: { messageId: number; conversationId: number }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "message_deleted",
    details,
  });
}

/**
 * Log file uploaded
 */
export async function logFileUploaded(
  userId: number,
  details: { fileName: string; fileSize: number; fileType: string }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "file_uploaded",
    details,
  });
}

/**
 * Log contact added
 */
export async function logContactAdded(
  userId: number,
  details: { contactId: number; contactName?: string }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "contact_added",
    details,
  });
}

/**
 * Log contact blocked
 */
export async function logContactBlocked(
  userId: number,
  details: { blockedUserId: number }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "contact_blocked",
    details,
  });
}

/**
 * Log contact unblocked
 */
export async function logContactUnblocked(
  userId: number,
  details: { unblockedUserId: number }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "contact_unblocked",
    details,
  });
}

/**
 * Log group created
 */
export async function logGroupCreated(
  userId: number,
  details: { groupId: number; groupName: string; memberCount: number }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "group_created",
    details,
  });
}

/**
 * Log profile updated
 */
export async function logProfileUpdated(
  userId: number,
  details?: { fields?: string[] }
): Promise<void> {
  await logActivity({
    userId,
    activityType: "profile_updated",
    details,
  });
}

/**
 * Log password changed
 */
export async function logPasswordChanged(
  userId: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logActivity({
    userId,
    activityType: "password_changed",
    ipAddress,
    userAgent,
  });
}
