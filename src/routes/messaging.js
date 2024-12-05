import { smtp, SmtpTemplates } from '../smtp.js';


export default class MessagingHandler {
    "use strict";
    constructor() {}

    emailPage = async (req, res, next) => {
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
    };
    
    sendEmail = async (req, res, next) => {
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
}