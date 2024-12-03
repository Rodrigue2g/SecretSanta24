/*
 * @license
 * Copyright 2024 Designø Group ltd. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
"use strict";
import express from 'express';
import session from 'express-session';
import hbs from 'hbs';  // @AUDIT
import useragent from 'express-useragent';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { smtp, SmtpTemplates } from './src/smtp.js';
import runPythonScript from './src/runpip.js';
import { encryptData, decryptData, generateShortKey, decryptJSONFile } from './src/crypto.js';


const  ENABLE_HTTPS = process.env.ENABLE_HTTPS === 'true';

const app = express();

try {   
    app.use(helmet.hidePoweredBy());
    app.use(helmet.frameguard()); //xframe is deprecated
    app.use(helmet.hsts());
    app.use(helmet.xssFilter({ setOnOldIE: true }));
    
    /**
     * Set app view engine + handlebars middleware (to enable server rendered html)
     * + Parse user-agent information from the request headers
     */
    app.set('view engine', 'html');
    app.engine('html', hbs.__express);  // CVE-2021-32822 -- Consider using a new handlebars/templating engine -- or just use react
    app.set('views', './src/views/');
    app.use(useragent.express());
    app.use(express.static('dist'));

    app.use(express.urlencoded({ extended: true }));

    /**
     * Parse incoming JSON data from the request body
     * + Global Middleware to protect from invalid json (i.e: null)  -- mv to global error handler?
     */
    app.use(express.json());
    app.use((err, req, res, next) => {
        if (err instanceof SyntaxError) {
            res.status(400).send('Invalid JSON');
        } else {
            next();
        }
    });
    
    /**
     * Session management
     */
    app.use(session({
        secret: process.env.SESSION_SECRET || 'secret',
        saveUninitialized: true,
        resave: true,
        proxy: true,
        rolling: false,
        unset: 'keep',
        key: "myacinfo",
        cookie:{
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 24 * 60 * 60 * 1000, // - 24h
            //signed: true,
            //overwrite: true,
            path: '/'
        }
    }));

    app.use('/health', (req, res, next) => {
        return res.status(200).send('OK');
    });

    app.get('/robots.txt', function (req, res) {
        res.type('text/plain');
        res.send("User-agent: *\nDisallow: /");
    });


    app.get('/', async function (req, res) {
        return res.render('./countdown.html');
    });

    app.get('/login', async function (req, res) {
        if (req.session['signed-in'] === true) {
            return res.redirect(302, '/email');
        }

        return res.render('./login.html');
    });
    
    app.post('/login', async function (req, res) {
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
    
            console.log('user key:', key);
            console.log('');
            for (const u of users) {
                console.log('key:', u.key);
            }
            const user = users.find(u => u.key === key);
            console.log('user:', user)

            if (!user) {
                return res.status(401).json({ error: "Invalid login key" });
            }

            console.log('user ok')

            req.session['signed-in'] = true;
            req.session['user'] = user;
        
            return res.status(200).json({ message: "Login successful" });
            // return res.redirect(302, '/email');
        } catch (error) {
            console.error("Error during login:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
    
    app.get('/email', async function (req, res) {
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login');
            }

            const user = req.session['user'];
            if (!user) {
                return res.status(401).json({ error: "Session invalid. Please log in again." });
            }
    
            return res.render('./email.html', {
                title: 'Account',
                user: user.target_name,
            });
        } catch (error) {
            console.error("Error loading email page:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    });
    
    app.post('/messaging/send-email', async function (req, res) {
        try {
            if (!req.session['signed-in']) {
                return res.status(401).json({ error: "Unauthorized. Please log in first." });
            }
    
            const user = req.session['user'];
            if (!user) {
                return res.status(401).json({ error: "Session invalid. Please log in again." });
            }
    
            const { message } = req.body;
            if (!message || message.trim() === "") {
                return res.status(400).json({ error: "Message content is required" });
            }
    
            await smtp.sendMail({
                template: SmtpTemplates.EmailForTarget,
                subjectLine: "Message de ton SS 🎅",
                recipients: [user.target_email],
                substitutions: {
                    target_name: user.target_name,
                    message: message,
                },
            });

            return res.status(200).redirect('/success');
            //return res.status(200).json({ message: "Email successfully sent to your target!" });
        } catch (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ error: "Internal server error. Please try again later." });
        }
    });

    app.get('/success', async function (req, res) {
        try {
            if (!req.session['signed-in']) {
                return res.redirect(401, '/login');
            }

            const user = req.session['user'];
            if (!user) {
                return res.status(401).json({ error: "Session invalid. Please log in again." });
            }
    
            return res.status(200).render('./success.html', {
                img: `${user.target_name.toLowerCase()}.png`,
            });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    app.get('/messaging/setup-code', async function (req, res) {
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
    });

    app.get('/tirage', async function (req, res) {
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
    });

    app.get('/signout', (req, res) => {
        req.session.destroy();
        return res.redirect(307, '/');
    });
    
    app.get('*', (req, res) => {
        return res.render('./404.html');
    });

    app.use((req, res, next) => {
        if (!req.secure && ENABLE_HTTPS) {
          return res.redirect('https://' + req.headers.host + req.url);
        }
        next();
    });

    const host = '0.0.0.0'; //'127.0.0.1';
    const port = process.env.PORT ? null : 8080;
    process.env.ORIGIN = `https://${process.env.HOSTNAME}`;

    const server = app.listen(port || process.env.PORT, () => {
        console.log('Server started in HTTP');
        console.log('Your app is listening on host ' + JSON.stringify(server.address()));
        console.log('Your app is listening on port ' + server.address().port);
    });
    
} catch (error) {
    console.log("server.js", `server failed to start and caught error: ${error}`);
    console.log("server.js", error);
    process.exit(1);
} finally {
    process.on('SIGINT' || 'exit', async () => {
        console.log('Server is shutting down...');
        process.exit(0);
    });
    // Uncaught Exception is when you throw an error and did not catch anywhere.
    process.on('uncaughtException', async (error) => {
        console.log("server.js", `UncaughtException: ${error}`);
        process.exit(1);
    });
    // Unhandled promise rejection is similar, when you fail to catch a Promise.reject.
    process.on('unhandledRejection', async (reason, promise) => {
        console.log("server.js", `UhandledRejection: ${reason}`);
        process.exit(1);
    });
}