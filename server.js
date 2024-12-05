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
import index from './src/routes/index.js';
import path from 'path';


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
    app.use('/uploads', express.static(path.resolve('./uploads')));

    app.use(express.urlencoded({ extended: true }));

    hbs.registerHelper('gt', (a, b) => a > b);
    hbs.registerHelper('eq', (a, b) => a === b);

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
        proxy: true, //https
        rolling: false,
        unset: 'keep',
        key: "myacinfo",
        cookie:{
            httpOnly: true, //https
            secure: true, //https
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

    app.get('/robots.txt', function (req, res, next) {
        res.type('text/plain');
        res.send("User-agent: *\nDisallow: /");
    });

    app.get('/', async function (req, res, next) {
        return res.render('./countdown.html');
    });


    /**
     * Setup the app's routes
     */
    index(app);

   
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