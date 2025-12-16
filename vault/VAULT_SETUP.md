# 🔐 Vault Transit Engine Setup Guide

## Table of Contents
- [What is the Transit Engine?](#what-is-the-transit-engine)
- [Quick Setup](#quick-setup)
- [Usage Examples](#usage-examples)
- [Security Best Practices](#security-best-practices)
- [Advanced Configuration](#advanced-configuration)
- [Troubleshooting](#troubleshooting)

---

## What is the Transit Engine?

The Transit Engine is Vault's **encryption-as-a-service** feature. It provides:

- 🔒 **Encryption/Decryption** - Encrypt data without Vault storing it
- 🔑 **Key Management** - Encryption keys never leave Vault
- 👤 **Context-Based Encryption** - User-specific encryption using contexts
- 🔄 **Key Rotation** - Rotate keys without re-encrypting data
- 🚀 **High Performance** - Designed for high-throughput operations

### Why Use It?

Instead of managing encryption keys in your application:
- ❌ Keys in environment variables (insecure)
- ❌ Keys in configuration files (insecure)
- ❌ Keys in database (insecure)

Use Vault Transit:
- ✅ Keys stored securely in Vault
- ✅ Centralized key management
- ✅ Audit logging of all encryption operations
- ✅ Easy key rotation

---

## Quick Setup

### Prerequisites

1. **Vault is running** on your VM
2. **Vault is unsealed** (automatic with environment variables)
3. **VAULT_TOKEN is set** in your `.env` file

### Step 1: Configure Environment Variables

```bash
# .env
VAULT_ADDR=http://your-vm-ip:8200
VAULT_TOKEN=s.XXXXXXXXXXXXXXXXXXXX

# Unseal keys (for auto-unseal)
VAULT_UNSEAL_KEY_1=key1_here
VAULT_UNSEAL_KEY_2=key2_here  # if using multiple keys
VAULT_UNSEAL_KEY_3=key3_here  # if using multiple keys
```

### Step 2: Run Setup Script

```bash
npm run setup:transit
```

This will automatically:
1. ✅ Enable Transit engine at `/transit`
2. ✅ Create default encryption key `user-data`
3. ✅ Configure key with `derived: true` for context-based encryption

### Step 3: Verify Setup

You should see output like:
```
🔧 Setting up Transit engine...
✅ Transit engine enabled at transit
✅ Encryption key 'user-data' created at transit
✅ Transit engine setup complete!
   Mount point: transit
   Default key: user-data
```

---

## Usage Examples

### Basic Encryption/Decryption

```typescript
import vaultService from '@services/vault';

// Encrypt sensitive data
const plaintext = "user@example.com";
const ciphertext = await vaultService.encrypt({
    keyName: "user-data",
    plaintext: plaintext
});

console.log(ciphertext);
// Output: "vault:v1:abc123def456..."

// Decrypt data
const decrypted = await vaultService.decrypt(
    "user-data",
    ciphertext
);

console.log(decrypted);
// Output: "user@example.com"
```

### Context-Based Encryption (Recommended)

Use a **user ID** or other unique identifier as context to ensure data can only be decrypted with the same context:

```typescript
const userId = "user_12345";
const sensitiveData = "SSN: 123-45-6789";

// Encrypt with user context
const ciphertext = await vaultService.encrypt({
    keyName: "user-data",
    plaintext: sensitiveData,
    context: userId  // ← User-specific encryption
});

// Decrypt with SAME context - ✅ Works
const decrypted = await vaultService.decrypt(
    "user-data",
    ciphertext,
    userId  // ← Must match encryption context
);

// Decrypt with DIFFERENT context - ❌ Fails
try {
    await vaultService.decrypt(
        "user-data",
        ciphertext,
        "different_user_id"  // ← Wrong context!
    );
} catch (error) {
    console.error("Decryption failed: invalid context");
}
```

### Encrypt Multiple Fields

Encrypt an entire object at once:

```typescript
const userId = "user_12345";
const userData = {
    email: "user@example.com",
    phone: "+1234567890",
    ssn: "123-45-6789",
    creditCard: "4111-1111-1111-1111"
};

// Encrypt all fields
const encryptedData = await vaultService.encryptFields({
    keyName: "user-data",
    data: userData,
    context: userId
});

console.log(encryptedData);
// Output:
// {
//   email: "vault:v1:abc123...",
//   phone: "vault:v1:def456...",
//   ssn: "vault:v1:ghi789...",
//   creditCard: "vault:v1:jkl012..."
// }

// Save encrypted data to database
await User.updateOne({ _id: userId }, encryptedData);
```

### Decrypt Multiple Fields

```typescript
const userId = "user_12345";

// Retrieve encrypted data from database
const encryptedUser = await User.findById(userId);

// Decrypt all fields
const decryptedData = await vaultService.decryptFields({
    keyName: "user-data",
    encryptedData: encryptedUser,
    context: userId
});

console.log(decryptedData);
// Output: Original userData object with decrypted values
```

### Real-World Example: User Registration

```typescript
import vaultService from '@services/vault';
import User from '@models/user';

async function registerUser(userData: {
    username: string;
    email: string;
    phone: string;
    ssn: string;
}) {
    // Create user (to get userId)
    const user = new User({ username: userData.username });
    await user.save();

    // Encrypt sensitive fields with user ID as context
    const encryptedData = await vaultService.encryptFields({
        keyName: "user-data",
        data: {
            email: userData.email,
            phone: userData.phone,
            ssn: userData.ssn
        },
        context: user._id.toString()
    });

    // Update user with encrypted data
    user.email = encryptedData.email;
    user.phone = encryptedData.phone;
    user.ssn = encryptedData.ssn;
    await user.save();

    return user;
}

async function getUserData(userId: string) {
    const user = await User.findById(userId);

    // Decrypt sensitive fields
    const decryptedData = await vaultService.decryptFields({
        keyName: "user-data",
        encryptedData: {
            email: user.email,
            phone: user.phone,
            ssn: user.ssn
        },
        context: userId
    });

    return {
        username: user.username,
        ...decryptedData
    };
}
```

---

## Security Best Practices

### 1. Always Use Context for User-Specific Data

```typescript
// ✅ GOOD - Each user has unique encryption
await vaultService.encrypt({
    keyName: "user-data",
    plaintext: sensitiveData,
    context: userId  // ← Always provide context
});

// ❌ BAD - Same plaintext = same ciphertext (less secure)
await vaultService.encrypt({
    keyName: "user-data",
    plaintext: sensitiveData
    // No context - anyone with key can decrypt
});
```

### 2. Use Different Keys for Different Data Types

```typescript
// Setup multiple keys for different purposes
await vaultService.createEncryptionKey("user-pii", "transit", {
    type: "aes256-gcm96",
    derived: true
});

await vaultService.createEncryptionKey("payment-data", "transit", {
    type: "aes256-gcm96",
    derived: true
});

await vaultService.createEncryptionKey("health-records", "transit", {
    type: "aes256-gcm96",
    derived: true
});

// Use appropriate key for each data type
const encryptedEmail = await vaultService.encrypt({
    keyName: "user-pii",
    plaintext: email,
    context: userId
});

const encryptedCard = await vaultService.encrypt({
    keyName: "payment-data",
    plaintext: creditCard,
    context: userId
});
```

### 3. Never Store Plain Text After Encryption

```typescript
// ✅ GOOD - Encrypt before saving
const encryptedEmail = await vaultService.encrypt({
    keyName: "user-data",
    plaintext: email,
    context: userId
});
user.email = encryptedEmail;
await user.save();

// ❌ BAD - Both encrypted and plain text
user.email = email;  // ← Plain text!
user.encryptedEmail = encryptedEmail;
await user.save();
```

### 4. Never Log Decrypted Sensitive Data

```typescript
// ❌ BAD - Sensitive data in logs
const decrypted = await vaultService.decrypt(...);
console.log("User SSN:", decrypted);  // ← Never do this!
Logger.info(`Decrypted email: ${decrypted}`);  // ← Never do this!

// ✅ GOOD - Log that operation succeeded, not the data
const decrypted = await vaultService.decrypt(...);
Logger.info("Successfully decrypted user data");
// Use decrypted data but don't log it
```

### 5. Handle Null/Undefined Values

```typescript
// The encryptFields method handles null/undefined automatically
const data = {
    email: "user@example.com",
    phone: null,  // ← Will remain null
    ssn: undefined  // ← Will remain undefined
};

const encrypted = await vaultService.encryptFields({
    keyName: "user-data",
    data: data,
    context: userId
});

// Result:
// {
//   email: "vault:v1:...",
//   phone: null,
//   ssn: undefined
// }
```

### 6. Use Context Consistently

```typescript
// ✅ GOOD - Consistent context
const context = user._id.toString();

const encrypted = await vaultService.encrypt({
    keyName: "user-data",
    plaintext: data,
    context: context
});

const decrypted = await vaultService.decrypt(
    "user-data",
    encrypted,
    context  // ← Same context
);

// ❌ BAD - Inconsistent context format
const encrypted = await vaultService.encrypt({
    keyName: "user-data",
    plaintext: data,
    context: user._id.toString()  // ← String
});

const decrypted = await vaultService.decrypt(
    "user-data",
    encrypted,
    user._id  // ← ObjectId (not matching!)
);
```

---

## Advanced Configuration

### Create Custom Encryption Keys

```typescript
// High-security key for payment data
await vaultService.createEncryptionKey(
    "payment-cards",
    "transit",
    {
        type: "aes256-gcm96",  // AES-256 encryption
        derived: true,  // Enable context-based encryption
        exportable: false  // Key cannot be exported from Vault
    }
);

// Fast encryption key for less sensitive data
await vaultService.createEncryptionKey(
    "session-tokens",
    "transit",
    {
        type: "chacha20-poly1305",  // Faster than AES
        derived: false  // No context required
    }
);
```

### Use Custom Mount Points

```typescript
// Setup transit at custom location
await vaultService.setupTransit("encryption-service", "app-key");

// Use custom mount point
const encrypted = await vaultService.encrypt({
    keyName: "app-key",
    plaintext: "data",
    mountPoint: "encryption-service"  // ← Custom path
});

const decrypted = await vaultService.decrypt(
    "app-key",
    encrypted,
    undefined,
    "encryption-service"  // ← Custom path
);
```

### Batch Encryption (Performance)

```typescript
// Encrypt multiple users' data efficiently
async function batchEncryptUsers(users: User[]) {
    const promises = users.map(user => 
        vaultService.encryptFields({
            keyName: "user-data",
            data: {
                email: user.email,
                phone: user.phone
            },
            context: user._id.toString()
        })
    );

    const encryptedData = await Promise.all(promises);
    
    // Update database in batch
    const bulkOps = users.map((user, index) => ({
        updateOne: {
            filter: { _id: user._id },
            update: { $set: encryptedData[index] }
        }
    }));

    await User.bulkWrite(bulkOps);
}
```

---

## Troubleshooting

### Error: "transit is not enabled"

**Problem:** Transit engine hasn't been enabled in Vault.

**Solution:**
```bash
npm run setup:transit
```

Or manually:
```typescript
await vaultService.enableTransitEngine("transit");
```

---

### Error: "encryption key not found"

**Problem:** The encryption key doesn't exist.

**Solution:**
```typescript
await vaultService.createEncryptionKey("user-data", "transit", {
    type: "aes256-gcm96",
    derived: true
});
```

---

### Error: "invalid ciphertext"

**Problem:** The ciphertext is corrupted or was encrypted with a different key/context.

**Possible causes:**
- Using wrong context during decryption
- Ciphertext was truncated or modified
- Using wrong key name

**Solution:**
```typescript
// Verify you're using the same context
const context = userId.toString();  // Consistent format

// Verify ciphertext starts with "vault:v"
if (!ciphertext.startsWith("vault:v")) {
    console.error("Invalid ciphertext format");
}

// Verify key name matches
const keyName = "user-data";  // Must match encryption
```

---

### Error: "derived not set"

**Problem:** Trying to use context with a key that wasn't created with `derived: true`.

**Solution:**
Recreate the key with `derived: true`:
```typescript
// Delete old key (if needed)
// Then create new one with derived enabled
await vaultService.createEncryptionKey("user-data", "transit", {
    type: "aes256-gcm96",
    derived: true  // ← Required for context-based encryption
});
```

---

### Error: "permission denied"

**Problem:** Vault token doesn't have permission to use transit engine.

**Solution:**
1. Check your Vault token has the correct policy
2. If using root token, this shouldn't happen
3. Create a policy that allows transit operations:

```bash
# On your VM
vault policy write app-policy - <<EOF
path "transit/encrypt/*" {
  capabilities = ["update"]
}
path "transit/decrypt/*" {
  capabilities = ["update"]
}
path "transit/keys/*" {
  capabilities = ["read", "list"]
}
EOF
```

---

### Debugging Tips

1. **Check if Vault is unsealed:**
```typescript
const status = await vaultService.getSealStatus();
console.log("Sealed:", status.sealed);
```

2. **Verify key exists:**
```bash
# On your VM
vault list transit/keys
vault read transit/keys/user-data
```

3. **Test encryption manually:**
```bash
# On your VM
echo -n "test data" | base64 | vault write transit/encrypt/user-data plaintext=-
vault write transit/decrypt/user-data ciphertext="vault:v1:..."
```

4. **Enable debug logging:**
```typescript
// In your code
console.log("Encrypting with:", {
    keyName,
    plaintextLength: plaintext.length,
    context
});
```

---

## Key Rotation

Vault Transit supports key rotation without re-encrypting existing data:

```bash
# SSH into your VM
vault write -f transit/keys/user-data/rotate
```

**What happens:**
- ✅ New key version is created
- ✅ New encryptions use the new version
- ✅ Old data remains encrypted with old version
- ✅ Both versions can decrypt their respective data
- ✅ Vault handles version management automatically

**Check key versions:**
```bash
vault read transit/keys/user-data
```

---

## API Reference

### VaultService Methods

#### `encrypt({ keyName, plaintext, context?, mountPoint? })`
Encrypts a single value.

**Parameters:**
- `keyName` (string): Name of the encryption key
- `plaintext` (string): Data to encrypt
- `context` (string, optional): Context for derived keys
- `mountPoint` (string, optional): Transit engine path (default: "transit")

**Returns:** Promise<string> - Encrypted ciphertext starting with "vault:v1:"

---

#### `decrypt(keyName, ciphertext, context?, mountPoint?)`
Decrypts a single value.

**Parameters:**
- `keyName` (string): Name of the encryption key
- `ciphertext` (string): Encrypted data to decrypt
- `context` (string, optional): Context used during encryption
- `mountPoint` (string, optional): Transit engine path (default: "transit")

**Returns:** Promise<string> - Decrypted plaintext

---

#### `encryptFields({ keyName, data, context?, mountPoint? })`
Encrypts all fields in an object.

**Parameters:**
- `keyName` (string): Name of the encryption key
- `data` (Record<string, unknown>): Object with fields to encrypt
- `context` (string, optional): Context for derived keys
- `mountPoint` (string, optional): Transit engine path (default: "transit")

**Returns:** Promise<Record<string, unknown>> - Object with encrypted values

---

#### `decryptFields({ keyName, encryptedData, context?, mountPoint? })`
Decrypts all fields in an object.

**Parameters:**
- `keyName` (string): Name of the encryption key
- `encryptedData` (Record<string, unknown>): Object with encrypted fields
- `context` (string, optional): Context used during encryption
- `mountPoint` (string, optional): Transit engine path (default: "transit")

**Returns:** Promise<T> - Object with decrypted values

---

## Additional Resources

- [HashiCorp Vault Transit Engine](https://www.vaultproject.io/docs/secrets/transit)
- [Encryption as a Service](https://learn.hashicorp.com/tutorials/vault/eaas-transit)
- [Vault API Documentation](https://www.vaultproject.io/api-docs/secret/transit)

---

## Summary

✅ **Setup:** Run `npm run setup:transit`  
✅ **Encrypt:** `vaultService.encrypt({ keyName, plaintext, context })`  
✅ **Decrypt:** `vaultService.decrypt(keyName, ciphertext, context)`  
✅ **Always use context** for user-specific data  
✅ **Never log** decrypted sensitive data  

Happy encrypting! 🔐

