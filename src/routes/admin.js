import fs from 'fs';
import path from 'path';
import { smtp, SmtpTemplates } from '../smtp.js';
import runPythonScript from '../runpip.js';
import { encryptData, generateShortKey, decryptJSONFile } from '../crypto.js';

export default class AdminHandler {
    "use strict";
    constructor() {}


    setupMessagingCode = async (req, res, next) => {
        const key = req.query.key;
        if (!key || key !== process.env.DRAW_LAUNCHING_SECRET) {
            return res.status(403).json({ error: "Key is missing" });
        }
        try {
            const results = await decryptJSONFile('./encrypted_assignments.bin');

            if (!results || !Array.isArray(results)) {
                throw new Error("Invalid results from Python script");
            }    

            const users = [];
            const nameToEmailMap = new Map();
            for (const result of results) {
                nameToEmailMap.set(result.name, result.email);
            }

            for (const result of results) {
                const { email, name, assigned_name } = result;
            
                const key = await generateShortKey();
            
                const targetEmail = nameToEmailMap.get(assigned_name);
            
                const user = { 
                    key: key,
                    target_name: assigned_name,
                    target_email: targetEmail,
                };
                users.push(user);
                  
                await smtp.sendMail({
                    template: SmtpTemplates.MessagingCode,
                    subjectLine: "Code d'accès Secret Santa 2024",
                    recipients: [email],
                    substitutions: {
                        name: name,
                        code: key
                    }
                });
            }

            const encryptionKey = process.env.ENCRYPTION_KEY;
            if (!encryptionKey || encryptionKey.length !== 64) {
                throw new Error("Invalid ENCRYPTION_KEY in .env");
            }
            const { iv, encryptedData } = await encryptData(users, encryptionKey);
            await fs.writeFileSync(path.resolve('./artifacts/db.txt'), JSON.stringify({ iv, encryptedData }));
            
            console.log('The encrypted data has been saved!');

            return res.status(200).send('Codes envoyés par email');
        } catch(e) {
            console.log("An error has occured" + e);
            return res.status(400).send("An error has occured" + e);
        }        
    };

    startDraw = async (req, res, next) => {
        const key = req.query.key;
        if (!key || key !== process.env.DRAW_LAUNCHING_SECRET) {
            return res.status(403).json({ error: "Key is missing" });
        }
        try {
            const results = await runPythonScript("");
            // const data = await fs.readFileSync(path.resolve("./assignments.json"), 'utf-8');
            // const results = JSON.parse(data);

            if (!results || !Array.isArray(results)) {
                throw new Error("Invalid results from Python script");
            }    
            for (const result of results) {
                const { email, name, img, nbr, assigned_name } = result;
                await smtp.sendMail({
                    template: SmtpTemplates.SecretSanta,
                    subjectLine: "Tirage Secret Santa 2024",
                    recipients: [email],
                    substitutions: {
                        name: name,
                        recipient_name: assigned_name,
                        recipient_image: img || "unknown",
                        nbr: nbr || 1,
                    }
                });
            }
            return res.status(200).send('Tirage SS 2024 effectué');
        } catch(e) {
            console.log("An error has occured" + e);
            return res.status(400).send("An error has occured" + e);
        }        
    };
    
}
