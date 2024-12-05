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
import AdminHandler from './admin.js';
import ForumHandler from './forum.js';
import MessagingHandler from './messaging.js';
import SessionHandler from './session.js';
import multer from 'multer';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/'); // Save files to "uploads" directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Generate unique filenames
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

/**
 * 
 * @param {*} app 
 * @param {*} db 
 */
const index = (app) => {
    "use strict";
    /**
     * @ClassImports
     */
    const sessionHandler = new SessionHandler();
    const adminHandler = new AdminHandler();
    const messagingHandler = new MessagingHandler();
    const forumHandler = new ForumHandler();

    /**
     * @Auth
     */
    app.get('/login', sessionHandler.login);
    app.post('/login', sessionHandler.loginHandler);
    
    /**
     * @Messaging
     */
    app.get('/email', messagingHandler.emailPage);
    app.post('/messaging/send/target', messagingHandler.sendMessageToTarget);
    app.post('/messaging/send/ss', messagingHandler.sendMessageToSS);
    app.get('/success', messagingHandler.successPage);
    app.get('/success/no-pic', messagingHandler.successPageWithoutPic);

    /**
     * @Forum
     */
    app.get('/forum', forumHandler.mainPage);
    app.post('/forum/posts/:id/like', forumHandler.likePost);
    app.post('/forum/posts/:id/comment', forumHandler.addComment);
    app.post('/forum/create', upload.array('images', 10), forumHandler.addPost);
    app.get('/forum/create', forumHandler.createPostPage);



    /**
     * @Admin
     */
    app.get('/messaging/setup-code', adminHandler.setupMessagingCode);
    app.get('/tirage', adminHandler.startDraw);



    app.get('/signout', sessionHandler.signout);
    
    /**
     * Error handling middleware
     */
    //app.use(ErrorHandler);
};

// module.exports = index;
// module.exports.indexNamed = index;
export default index;

// http://expressjs.com/en/starter/basic-routing.html