import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../drizzle/schema";
import { eq, isNull, or } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

async function setUsernames() {
  console.log("Setting usernames for users without usernames...");
  
  // Get all users without usernames
  const usersWithoutUsernames = await db
    .select()
    .from(users)
    .where(or(isNull(users.username), eq(users.username, '')));
  
  console.log(`Found ${usersWithoutUsernames.length} users without usernames`);
  
  for (const user of usersWithoutUsernames) {
    let generatedUsername = '';
    
    if (user.name) {
      // Generate from name: "John Doe" -> "johndoe"
      generatedUsername = user.name.toLowerCase().replace(/\s+/g, '');
    } else if (user.email) {
      // Generate from email: "john@example.com" -> "john"
      generatedUsername = user.email.split('@')[0].toLowerCase();
    } else {
      // Fallback: use part of openId
      generatedUsername = `user_${user.openId.substring(0, 8)}`;
    }
    
    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.floor(Math.random() * 10000);
    generatedUsername = `${generatedUsername}${randomSuffix}`;
    
    console.log(`Setting username for user ${user.id}: ${generatedUsername}`);
    
    await db
      .update(users)
      .set({ username: generatedUsername })
      .where(eq(users.id, user.id));
  }
  
  console.log("Done!");
  process.exit(0);
}

setUsernames().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
