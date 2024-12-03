import crypto from 'node:crypto';

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