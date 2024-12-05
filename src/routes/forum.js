import fs from 'fs';
import path from 'path';
import { decryptJSONFile } from '../crypto.js';


export default class ForumHandler {
    "use strict";
    constructor() {}

    mainPage = async (req, res, next) => { // GET
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login?continue=/forum');
            }
            
            const userId = req.session.user?.key || '0000';
            if (!userId) {
                return res.redirect(302, '/login');
            }

            let list_of_posts = [];
            try {
                const fileContent = await fs.readFileSync(path.resolve('./artifacts/forum_posts.json'), 'utf-8');
                list_of_posts = JSON.parse(fileContent);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // Add a "liked" property to each post based on whether the user has liked it
            const postsWithLikeStatus = list_of_posts.map(post => ({
                ...post,
                liked: post.likedBy?.includes(userId) || false
            }));
    
            return res.render('./forum.html', {
                posts: postsWithLikeStatus,
            });
        } catch (error) {
            console.error("Error loading forum page:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    };
    

    detailPage = async (req, res, next) => {}; // Not needed?


    createPostPage = async (req, res, next) => { // GET
        if (!req.session['signed-in']) {
            return res.redirect(302, '/login');
        }
        return res.render('./create_post.html');
    };

    addPost = async (req, res, next) => { // POST
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login');
            }

            const { title, description } = req.body;
            const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
    
            if (!title || !description || !imagePaths.length) {
                return res.status(400).json({ message: 'All fields are required!' });
            }
    
            if (!title || title.trim() === '') {
                return res.status(400).json({ message: 'Title is required.' });
            }
    
            if (!description || description.trim() === '') {
                return res.status(400).json({ message: 'Description is required.' });
            }
    
            let posts = [];
            try {
                const fileContent = await fs.readFileSync(path.resolve('./artifacts/forum_posts.json'), 'utf-8');
                posts = JSON.parse(fileContent);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            if (!Array.isArray(posts)) {
                posts = [];
            }

            const victimName = await getUserName(req.session?.user);

            const newPost = {
                id: Date.now().toString(),
                title: title.trim(),
                description: description.trim(),
                victim: victimName, 
                images: imagePaths,
                likes: 0,
                likedBy: [],
                comments: []
            };

            posts.push(newPost);
            await fs.writeFileSync(path.resolve('./artifacts/forum_posts.json'), JSON.stringify(posts, null, 4), 'utf-8');

            console.log('New Post Created:', newPost);
    
            res.status(201).json({ message: 'Post created successfully', post: newPost });
        } catch (error) {
            console.error('Error creating post:', error);
            res.status(500).json({ message: 'Failed to create post' });
        }
    };

    updatePost = async (req, res, next) => { // PUT

    };

    removePost = async (req, res, next) => { // DELETE

    };

    likePost = async (req, res, next) => { // POST
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login');
            }

            const { id } = req.params;
            const { liked } = req.body;
            const userId = req.session?.user?.key || '0000';

            const posts = JSON.parse(await fs.readFileSync(path.resolve('./artifacts/forum_posts.json'), 'utf-8'));
    
            const post = posts.find(post => post.id === id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found.' });
            }
    
            const userHasLiked = post.likedBy && post.likedBy.includes(userId);
            if (liked && userHasLiked) {
                return res.status(400).json({ message: 'User has already liked this post.' });
            }
            if (!liked && !userHasLiked) {
                return res.status(400).json({ message: 'User has not liked this post yet.' });
            }
    
            if (liked) {
                post.likes += 1;
                post.likedBy = post.likedBy || [];
                post.likedBy.push(userId);
            } else {
                post.likes = Math.max(0, post.likes - 1);
                post.likedBy = post.likedBy.filter(user => user !== userId);
            }
    
            await fs.writeFileSync(path.resolve('./artifacts/forum_posts.json'), JSON.stringify(posts, null, 4), 'utf-8');
        
            res.status(200).json({ success: true, likes: post.likes });
        } catch (error) {
            console.error('Error updating post likes:', error);
            res.status(500).json({ message: 'Failed to update likes.' });
        }
    };

    dislikePost = async (req, res, next) => {}; // Not implemented


    addComment = async (req, res, next) => { // POST
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login');
            }

            const { id } = req.params;
            const text = req.body.message;

            if (!text || text.trim() === '') {
                return res.status(400).json({ message: 'Comment text is required.' });
            }

            const posts = JSON.parse(await fs.readFileSync(path.resolve('./artifacts/forum_posts.json'), 'utf-8'));
    
            const post = posts.find(post => post.id === id);
            if (!post) {
                return res.status(404).json({ message: 'Post not found.' });
            }

            const author = await getUserName(req.session?.user);
    
            const newComment = { author: author, message: text.trim() };
            post.comments.push(newComment);
    
            await fs.writeFileSync(path.resolve('./artifacts/forum_posts.json'), JSON.stringify(posts, null, 4), 'utf-8');
    
            console.log('New comment added:', newComment);
    
            return res.status(201).json(newComment);
        } catch (error) {
            console.error('Error adding comment:', error);
            return res.status(500).json({ message: 'Failed to add comment.' });
        }
    };
    

    updateComment = async (req, res, next) => {}; // Not implemented

    removeComment = async (req, res, next) => {}; // Not implemented
}

async function getUserName(user) {
    try {
        if (!user) {
            return 'Nabot inccognito';
        }

        const users = await decryptJSONFile('./encrypted_assignments.bin');

        if (!users || !Array.isArray(users)) {
            throw new Error("Invalid results from Python script");
        }    

        // The user parsed only has his target name. To find the user's name match his target's name with his original assigned name
        const resolvedUser = users.find(entry => entry.assigned_name === user.target_name);

        return resolvedUser ? resolvedUser.name : 'Nabot inccognito';
    } catch (error) {
        console.error('Error fetching user name:', error);
        throw new Error('Failed to retrieve user name');
    }
}