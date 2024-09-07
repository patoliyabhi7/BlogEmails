require('dotenv').config();
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const storeEmailModel = require('../models/storeEmailModel');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const imapConfig = {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

const cleanText = (text) => {
    // Remove URLs
    let cleanedText = text.replace(/https?:\/\/[^\s]+/g, '');
    // Replace HTML tags with empty strings
    cleanedText = cleanedText.replace(/[<>]/g, '');
    // Replace multiple spaces/newlines with a single one
    cleanedText = cleanedText.replace(/\n{2,}/g, '\n\n').replace(/\s{2,}/g, ' ');
    // Trim leading/trailing spaces
    cleanedText = cleanedText.trim();
    return cleanedText;
};

// geminiAI function
// const geminiAI = async (title, body) => {
//     const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     const prompt = `Title: ${title}\n\nBody: ${body}\n\nPlease summarize the above content in smaller form, also preserve the important content into it. Basically we need this to post the blog regarding this mentioned subject and body content. Remove links and copyright information we only want unique and attractive title and content(body).`;

//     const result = await model.generateContent([prompt]);
//     return result.response.text();
// }

(async () => {
    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error('Error opening inbox:', err);
                imap.end();
                return;
            }

            imap.search(['ALL'], (err, results) => {
                if (err) {
                    console.error('Error searching emails:', err);
                    imap.end();
                    return;
                }

                if (!results || !results.length) {
                    console.log('No emails found.');
                    imap.end();
                    return;
                }

                const lastEmail = results[results.length - 1];
                const f = imap.fetch(lastEmail, { bodies: [''], struct: true });

                f.on('message', (msg) => {
                    msg.on('body', (stream, info) => {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                        stream.once('end', async () => { // Make this function async
                            try {
                                const parsed = await simpleParser(buffer); // Use await here
                                // Destructure the email parts
                                const { subject, date, from, text } = parsed;
                                const cleanedTextBody = cleanText(text);
                                const summary = await geminiAI(subject, cleanedTextBody);
                                console.log('Email summary:', summary);
                                // Store the email in the database
                                const email = await storeEmailModel.create({ // Use await here
                                    subject,
                                    from: from.text,
                                    date,
                                    body: cleanedTextBody,
                                });
                                // console.log('Email stored:', email);
                            } catch (err) {
                                console.error('Error parsing or storing email:', err);
                            }
                        });
                    });
                });

                f.once('error', (ex) => {
                    console.error('Fetch error:', ex);
                });

                f.once('end', () => {
                    console.log('Finished fetching the last email');
                    imap.end();
                });
            });
        });
    });

    imap.once('error', (err) => {
        console.error('IMAP connection error:', err);
    });

    imap.once('end', () => {
        console.log('IMAP connection ended');
    });

    imap.connect();
})();

