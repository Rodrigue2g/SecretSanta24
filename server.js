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


const { ENABLE_HTTPS } = process.env;

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
    app.set('views', '../client');
    app.use(useragent.express());
    app.use(express.static('dist'));

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
            signed: true,
            overwrite: true,
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

    app.get('/tirage', async function (req, res) {
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
    
    app.get('*', (req, res) => {
        return res.status(404).send('Unknown');
    });

    app.use((req, res, next) => {
        if (!req.secure && ENABLE_HTTPS===true) {
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