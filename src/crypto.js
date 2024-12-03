import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';

export const generateShortKey = () => {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-character key
};

// Helper: Encrypt data using AES-256-CBC
export const encryptData = (data, encryptionKey) => {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
};

export const decryptData = (encryptedData, encryptionKey, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
};

/**
 * Decrypt a JSON file
 */
export async function decryptJSONFile(inputFile) {
    try {
        const data = await fs.readFileSync(path.resolve(inputFile));

        // Extract salt, nonce, and encrypted data
        // const salt = data.slice(0, 16);
        const nonce = data.slice(16, 28);
        const encryptedData = data.slice(28);

        // Derive the master decryption key
        const key = Buffer.from(process.env.MASTER_KEY, 'hex');

        const authTag = encryptedData.slice(-16);
        const ciphertext = encryptedData.slice(0, -16);

        // Decrypt using AES-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
        decipher.setAuthTag(authTag);

        let decryptedData = decipher.update(ciphertext, null, 'utf8');
        decryptedData += decipher.final('utf8');

        return JSON.parse(decryptedData);
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}
