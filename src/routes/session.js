import fs from 'fs';
import path from 'path';
import { decryptData } from '../crypto.js';


export default class SessionHandler {
    "use strict";
    constructor() {}

    login = async (req, res, next) => {
        const redirect = req.query?.continue || '/forum';        
        if (req.session['signed-in'] === true) {
            return res.redirect(302, redirect);
        }
        req.session.redirect = redirect

        return res.render('./login.html');
    };

    loginHandler = async (req, res, next) => {
        try {
            const { key } = req.body;
    
            if (!key) {
                return res.status(400).json({ error: "Key is required" });
            }
    
            const encryptedOutput = JSON.parse(await fs.readFileSync(path.resolve('./artifacts/db.txt'), 'utf-8'));
            const { iv, encryptedData } = encryptedOutput;
            const encryptionKey = process.env.ENCRYPTION_KEY;
    
            if (!encryptionKey || encryptionKey.length !== 64) {
                return res.status(500).json({ error: "Server misconfiguration: ENCRYPTION_KEY is invalid" });
            }
    
            const users = await decryptData(encryptedData, encryptionKey, iv);
    
    
            const user = users.find(u => u.key === key);
    
            if (!user) {
                return res.status(401).json({ error: "Invalid login key" });
            }
    
            req.session['signed-in'] = true;
            req.session['user'] = user;

            const redirect =  req.session.redirect || '/forum';
        
            delete req.session.redirect;
            
            return res.status(200).json({ message: "Login successful", redirect: redirect });
            // return res.redirect(302, '/email');
        } catch (error) {
            console.error("Error during login:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    };



    signout = (req, res, next) => {
        req.session.destroy();
        return res.redirect(307, '/');
    };
}