# Developer Guide: Working with Prisma & PostgreSQL

This guide explains how to continue working with your project, specifically adding new tables and features.

## 🚀 Quick Summary
**No**, you do **NOT** need to repeat the setup process. The installation, connection, and configuration are done.

Going forward, you only follow this **3-Step Cycle**:
1. **Model** (Update `schema.prisma`)
2. **Migrate** (Update Database)
3. **Code** (Use it in your app)

---

## 🟢 How to Add a New Table (Step-by-Step)

Example: Adding a `Client` table.

### Step 1: Define Model
Open `prisma/schema.prisma` and add your new model:

```prisma
model Client {
  id        Int      @id @default(autoincrement())
  name      String
  userId    Int      @unique // Relation to User
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  
  @@map("clients")
}

// Don't forget to update User model to add the reverse relation!
model User {
  // ... existing fields ...
  client    Client?
}
```

### Step 2: Update Database
Since we are using Prisma v7 with specific configuration needs, we use our initialization script or SQL for now, but here is the standard flow:

**Option A: Standard Migration (Recommended if configured)**
```bash
npx prisma migrate dev --name add_client_table
```
*(If this fails due to v7 config, use Option B)*

**Option B: Manual Update (Current Reliable Method)**
1. Create a SQL migration file in `prisma/migrations/` (e.g., `add_client.sql`)
2. Write the SQL:
   ```sql
   CREATE TABLE "clients" ( "id" SERIAL PRIMARY KEY, ... );
   ```
3. Run it against your DB.

### Step 3: Update Prisma Client
This is the **most important step**. Whenever you change `schema.prisma`, you MUST run:

```bash
npm run prisma:generate
```

This updates `node_modules` so TypeScript knows about your new `db.client` table.

---

## 💻 Coding with the New Table

Now checking your code, you will see auto-completion for the new table!

**In `client.service.ts`:**
```typescript
import prisma from './src/utils/prisma.util';

// Create
await prisma.client.create({
  data: {
    name: "New Client",
    userId: 1
  }
});

// Find
await prisma.client.findFirst({
  where: { name: "New Client" },
  include: { user: true } // Join with User table
});
```

---

## 🛠️ Common Commands Cheatsheet

| Command | Description | When to use |
|---------|-------------|-------------|
| `npm run dev` | Starts server | Daily development |
| `npm run prisma:generate` | Updates Prisma Client | After changing schema |
| `npm run prisma:studio` | Opens Database GUI | To view/edit data manually |
| `npm run db:init` | Runs setup script | If setting up fresh DB |

## ⚠️ Important Rules
1. **Always use the Singleton**: Import `prisma` from `src/utils/prisma.util.ts`. Do NOT create new `new PrismaClient()` instances.
2. **Don't touch migrations manually**: unless using the manual SQL workflow.
3. **Restart Server**: After `prisma:generate`, restart your dev server to see changes.








## Simple Guide:

Command	Description	When to use
 **npm run dev**:	Starts server	Daily development
 **npm run prisma:generate**:	Updates Prisma Client	After changing schema
 **npm run prisma:studio**:	Opens Database GUI	To view/edit data manually
 **npm run db:init**:	Runs setup script	If setting up fresh DB
