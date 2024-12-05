import { decryptJSONFile } from '../crypto.js';
import { smtp, SmtpTemplates } from '../smtp.js';


export default class MessagingHandler {
    "use strict";
    constructor() {}

    emailPage = async (req, res, next) => {
        try {
            if (!req.session['signed-in']) {
                return res.redirect(302, '/login?continue=/email');
            }

            const user = req.session['user'];
            if (!user) {
                return res.status(401).json({ error: "Session invalid. Please log in again." });
            }
    
            return res.render('./email.html');
        } catch (error) {
            console.error("Error loading email page:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    };
    
    sendMessageToTarget = async (req, res, next) => {
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
    };

    sendMessageToSS = async (req, res, next) => {
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

            const ss = await getSSofUser(user);
    
            await smtp.sendMail({
                template: SmtpTemplates.EmailForSS,
                subjectLine: "❗️ Message de ta victime ❗️",
                recipients: [ss.email],
                substitutions: {
                    ss_name: ss.name,
                    message: message,
                    victim_name: 'nabot inccognito'
                },
            });

            return res.status(200).redirect('/success/no-pic');
            //return res.status(200).json({ message: "Email successfully sent to your target!" });
        } catch (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ error: "Internal server error. Please try again later." });
        }
    };

    successPage = async (req, res, next) => {
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
    };

    successPageWithoutPic = async (req, res, next) => {
        try {
            if (!req.session['signed-in']) {
                return res.redirect(401, '/login');
            }

            const user = req.session['user'];
            if (!user) {
                return res.status(401).json({ error: "Session invalid. Please log in again." });
            }
    
            return res.status(200).render('./success.html');
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    };
}

async function getSSofUser(user) {
    try {
        if (!user) {
            // return 'Nabot inccognito';
            throw new Error('user is undefined');
        }

        const users = await decryptJSONFile('./encrypted_assignments.bin');

        if (!users || !Array.isArray(users)) {
            throw new Error("Invalid results from Python script");
        }    

        const resolvedUser = users.find(entry => entry.assigned_name === user.target_name);
        const username = resolvedUser.name;

        if (!username) {
            throw new Error("username not found!");
        }    

        const resolvedSS = users.find(entry => entry.assigned_name === username);

        if (!resolvedSS) {
            throw new Error("SS' email not found!");
        }    

        return resolvedSS;
    } catch (error) {
        throw new Error(`Failed to retrieve user's ss email: ${error}`);
    }
}