# 🔐 Encryption Flow Documentation

## Overview

This document explains how encrypted health data flows through the TakeCare backend system.

## Data Flow

### 1. Saving Health Data (Encryption)

```typescript
// Client sends plain numbers
POST /api/user/health-quiz
{
  "age": 25,
  "weight": 70,
  "height": 175,
  "stress_level": 3
}

// ↓ Server receives
```

```typescript
// User Model (src/models/user/user.ts)
async healthQuiz(healthData: UserHealthDataQuiz) {
    // Step 1: Encrypt each field individually
    const encryptedHealthData = await VaultService.encryptFields({
        keyName: "health-data",
        data: health_attributions,
        context: this.user_id  // ← User-specific encryption
    });

    // Result: Numbers → Encrypted Strings
    // {
    //   age: "vault:v1:abc123...",
    //   weight: "vault:v1:def456...",
    //   height: "vault:v1:ghi789...",
    //   stress_level: "vault:v1:jkl012..."
    // }

    // Step 2: Save encrypted data to database
    await UserHealthAttributionsDB.create({
        user_id: this.user_id,
        ...encryptedHealthData,  // ← Strings stored in DB
        created_at: new Date()
    });
}
```

```typescript
// Database (MongoDB)
// Stores encrypted strings
{
  "_id": ObjectId("..."),
  "user_id": "user_12345",
  "age": "vault:v1:abc123...",        // ← String (encrypted)
  "weight": "vault:v1:def456...",     // ← String (encrypted)
  "height": "vault:v1:ghi789...",     // ← String (encrypted)
  "stress_level": "vault:v1:jkl012...", // ← String (encrypted)
  "created_at": ISODate("2025-12-16T12:00:00Z")
}
```

### 2. Retrieving Health Data (Decryption)

```typescript
// User Model (src/models/user/user.ts)
async getUserInfo() {
    // Step 1: Fetch encrypted data from database
    const userHealthInfo = await UserHealthAttributionsDB.findOne({
        user_id: this.user_id
    });

    // Database returns:
    // {
    //   age: "vault:v1:abc123...",
    //   weight: "vault:v1:def456...",
    //   ...
    // }

    // Step 2: Decrypt each field
    const decrypted = await VaultService.decryptFields<UserHealthAttributions>({
        keyName: "health-data",
        encryptedData: encryptedFields,
        context: this.user_id  // ← Must match encryption context
    });

    // Result: Strings → Decrypted Numbers
    // {
    //   age: 25,
    //   weight: 70,
    //   height: 175,
    //   stress_level: 3
    // }

    // Step 3: Return decrypted data
    return { user: userPayload };
}
```

```typescript
// Client receives plain numbers
GET /api/user/info
{
  "user": {
    "user_id": "user_12345",
    "health": {
      "age": 25,           // ← Number (decrypted)
      "weight": 70,        // ← Number (decrypted)
      "height": 175,       // ← Number (decrypted)
      "stress_level": 3    // ← Number (decrypted)
    }
  }
}
```

---

## Schema Configuration

### Database Schema (src/database/models/user.ts)

```typescript
const userHealthAttributions = new mongo.Schema({
    // Encrypted numeric fields - stored as Strings
    age: {
        type: String, // ← String to store encrypted number
        required: false,
    },
    weight: {
        type: String, // ← String to store encrypted number
        required: false,
    },
    height: {
        type: String, // ← String to store encrypted number
        required: false,
    },
    stress_level: {
        type: String, // ← String to store encrypted number
        required: false,
    },

    // Encrypted array fields - stored as Strings (encrypted JSON)
    health_goal: {
        type: String, // ← String to store encrypted array
        required: false,
    },
    allergies: {
        type: String, // ← String to store encrypted array
        required: false,
    },
    chronic_illness: {
        type: String, // ← String to store encrypted array
        required: false,
    },
    // ... other array fields

    // Non-encrypted fields remain as-is
    gender: {
        type: String,
        required: false,
    },
    weight_unit: {
        type: String,
        required: false,
    },
});
```

**Key Point:** ALL encrypted fields (numbers, arrays, objects) are stored as `String` in the database because encryption always produces a string (ciphertext).

### TypeScript Types (src/types/user.ts)

```typescript
export interface UserHealthAttributions {
    user_id: string;

    // Application-layer types (decrypted values)
    age?: number; // ← Number (after decryption)
    weight?: number; // ← Number (after decryption)
    height?: number; // ← Number (after decryption)
    stress_level?: number; // ← Number (after decryption)

    // Other fields
    gender?: string;
    weight_unit?: string;
    created_at: Date;
}
```

**Key Point:** The TypeScript types represent **decrypted** data (what your application works with), while the database schema represents **stored** data (encrypted strings).

---

## Security Benefits

### Context-Based Encryption

Each user's data is encrypted with their `user_id` as context:

```typescript
await VaultService.encryptFields({
    keyName: "health-data",
    data: health_attributions,
    context: this.user_id, // ← User-specific encryption
});
```

**Benefits:**

- ✅ Each user has unique ciphertext (even for same values)
- ✅ Data can only be decrypted with correct user context
- ✅ Cross-user data access is prevented at encryption level

**Example:**

```typescript
// User A (age: 25)
// Encrypted: "vault:v1:abc123xyz..."

// User B (age: 25)
// Encrypted: "vault:v1:def456uvw..."  ← Different ciphertext!

// Trying to decrypt User A's data with User B's context → FAILS ❌
```

### What's Encrypted

**Encrypted fields (Numbers):**

- ✅ `age` - Personal health metric
- ✅ `weight` - Personal health metric
- ✅ `height` - Personal health metric
- ✅ `stress_level` - Personal health metric

**Encrypted fields (Arrays):**

- ✅ `health_goal` - Array of health goals
- ✅ `professional_help` - Array of professional help types
- ✅ `medication_treatment` - Array of medications
- ✅ `medical_treatments` - Array of medical treatments
- ✅ `surgery_before` - Array of past surgeries
- ✅ `chronic_illness` - Array of chronic illnesses
- ✅ `allergies` - Array of allergies
- ✅ `practice_sports` - Array of sports practiced

**Not encrypted:**

- `user_id` - Needed for queries
- `created_at` - Timestamp
- Units (`weight_unit`, `height_unit`) - Not sensitive
- `gender`, `alcohol`, `smoking` - Can be encrypted if needed

---

## Code Changes Summary

### What Was Changed

1. **Database Schema** (`src/database/models/user.ts`):

    - Changed `age`, `weight`, `height`, `stress_level` from `Number` to `String`
    - Added comments explaining these store encrypted data

2. **User Model** (`src/models/user/user.ts`):

    - Already using `VaultService.encryptFields()` for encryption ✅
    - Already using `VaultService.decryptFields()` for decryption ✅

3. **TypeScript Types** (`src/types/user.ts`):
    - No changes needed - represents decrypted data ✅

### What Didn't Change

- ✅ API contracts (clients still send/receive numbers)
- ✅ Business logic
- ✅ TypeScript types (still use number)
- ✅ Existing encrypted data remains valid

---

## Important Notes

### 1. Context Must Match

```typescript
// Encryption
await VaultService.encrypt({
    plaintext: "25",
    context: "user_123", // ← User ID
});

// Decryption - MUST use same context
await VaultService.decrypt(
    ciphertext,
    "user_123", // ← Must match!
);
```

### 2. Type Conversion (Automatic Magic ✨)

The `encryptFields` and `decryptFields` methods automatically handle type conversion. This is why your `userPayload` contains numbers and arrays even though the database stores encrypted strings!

**Encryption (encryptFields):**

```typescript
// In VaultService.encryptFields() - line 377
const stringValue = typeof value === "string"
    ? value
    : JSON.stringify(value);  // ← Converts to JSON string

// Examples:
age: 25 → JSON.stringify(25) → "25" → encrypt → "vault:v1:abc..."
allergies: ["peanuts", "shellfish"] → JSON.stringify([...]) → '["peanuts","shellfish"]' → encrypt → "vault:v1:def..."
gender: "male" → "male" (already string) → encrypt → "vault:v1:ghi..."
```

**Decryption (decryptFields):**

```typescript
// In VaultService.decryptFields() - line 421-434
const decrypted = await this.decrypt(keyName, value, context, mountPoint);

// Try to parse JSON to restore original type
try {
    decryptedData[key] = JSON.parse(decrypted); // ← ✨ THE MAGIC!

    // Examples:
    // "25" → 25 (number)
    // "70" → 70 (number)
    // '["peanuts","shellfish"]' → ["peanuts", "shellfish"] (array)
    // "true" → true (boolean)
} catch {
    // If not valid JSON, keep as string
    decryptedData[key] = decrypted;
    // "male" → "male" (string stays string)
}
```

**Complete Flow Example:**

```typescript
// Original data
{ age: 25, allergies: ["peanuts"] }

// ↓ Encryption
{ age: "vault:v1:abc...", allergies: "vault:v1:def..." }

// ↓ Stored in MongoDB as Strings
{ age: String, allergies: String }

// ↓ Retrieved from MongoDB
{ age: "vault:v1:abc...", allergies: "vault:v1:def..." }

// ↓ Decryption step 1: decrypt
{ age: "25", allergies: '["peanuts"]' }

// ↓ Decryption step 2: JSON.parse() ← THE MAGIC!
{ age: 25, allergies: ["peanuts"] }

// ↓ Final result in userPayload
{ age: 25, allergies: ["peanuts"] }  // ✅ Original types restored!
```

**Why This Works:**

1. `JSON.stringify()` preserves type information as JSON
2. `JSON.parse()` automatically converts back to the original type
3. Your database only sees encrypted strings
4. Your application code works with the original types
5. The conversion is completely transparent!

### 3. MongoDB Migration

If you have existing data with numeric values, you'll need to:

1. **Encrypt existing data:**

```typescript
// Migration script
const users = await UserHealthAttributionsDB.find({});
for (const user of users) {
    if (typeof user.age === "number") {
        const encrypted = await VaultService.encrypt({
            keyName: "health-data",
            plaintext: user.age.toString(),
            context: user.user_id,
        });
        user.age = encrypted;
        await user.save();
    }
}
```

2. **Or drop and recreate** (if development):

```bash
# In MongoDB
use takecare_db
db.user_health_attributions.drop()
```

---

## Testing

### Test Encryption Flow

```typescript
// Test script
import VaultService from "@services/vault";

async function testEncryption() {
    const userId = "test_user_123";

    // 1. Encrypt
    const encrypted = await VaultService.encryptFields({
        keyName: "health-data",
        data: {
            age: 25,
            weight: 70,
            height: 175,
        },
        context: userId,
    });

    console.log("Encrypted:", encrypted);
    // {
    //   age: "vault:v1:...",
    //   weight: "vault:v1:...",
    //   height: "vault:v1:..."
    // }

    // 2. Decrypt
    const decrypted = await VaultService.decryptFields({
        keyName: "health-data",
        encryptedData: encrypted,
        context: userId,
    });

    console.log("Decrypted:", decrypted);
    // {
    //   age: 25,
    //   weight: 70,
    //   height: 175
    // }
}
```

---

## Troubleshooting

### "Cast to Number failed"

**Problem:** Schema expects Number but receives String (encrypted data)

**Solution:** ✅ Already fixed - Changed schema to String

### "Invalid ciphertext"

**Problem:** Trying to decrypt with wrong context

**Solution:** Ensure context matches:

```typescript
// Same user ID for both operations
const context = user._id.toString();
await encrypt({ context });
await decrypt({ context }); // ← Must match
```

### "Decrypted value is string, not number"

**Problem:** JSON.parse failed, value remained string

**Solution:** Check that encrypted value was originally a number:

```typescript
// Encrypt numbers as strings
const plaintext = age.toString(); // "25"
await VaultService.encrypt({ plaintext });
```

---

## Summary

| Layer           | Type     | Example                  |
| --------------- | -------- | ------------------------ |
| **Client**      | Number   | `25`                     |
| **API**         | Number   | `{ age: 25 }`            |
| **Application** | Number   | `healthData.age = 25`    |
| **Encryption**  | → String | `"vault:v1:abc..."`      |
| **Database**    | String   | `age: "vault:v1:abc..."` |
| **Decryption**  | → Number | `25`                     |
| **Application** | Number   | `healthData.age = 25`    |
| **API**         | Number   | `{ age: 25 }`            |
| **Client**      | Number   | `25`                     |

**Key Takeaway:** Encryption/decryption is transparent to clients and most of your application code. Only the storage layer knows about encrypted strings.

---

## Next Steps

1. ✅ Ensure Transit engine is set up (`npm run setup:transit`)
2. ✅ Test with real health quiz data
3. ✅ Monitor logs for encryption/decryption operations
4. ✅ Consider adding more encrypted fields as needed

Happy encrypting! 🔐
