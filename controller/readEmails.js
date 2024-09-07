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
    let cleanedText = text.replace(/https?:\/\/[^\s]+/g, '');
    cleanedText = cleanedText.replace(/[<>]/g, '');
    cleanedText = cleanedText.replace(/\n{2,}/g, '\n\n').replace(/\s{2,}/g, ' ');
    cleanedText = cleanedText.trim();
    return cleanedText;
};

const geminiAI = async (title, body) => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Title: ${title}\n\nBody: ${body}\n\nPlease summarize the above content in smaller form, also preserve the important content into it. Basically we need this to post the blog regarding this mentioned subject and body content. Remove links and copyright information we only want unique and attractive title and content(body).`;

    const result = await model.generateContent([prompt]);
    return result.response.text();
}

const convertUTCToIST = (utcDate) => {
    const date = new Date(utcDate);
    const utcTime = date.getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(utcTime + istOffset);

    const year = istTime.getFullYear();
    const month = String(istTime.getMonth() + 1).padStart(2, '0');
    const day = String(istTime.getDate()).padStart(2, '0');
    const hours = String(istTime.getHours()).padStart(2, '0');
    const minutes = String(istTime.getMinutes()).padStart(2, '0');
    const seconds = String(istTime.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const fetchEmails = async () => {
    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error('Error opening inbox:', err);
                imap.end();
                return;
            }

            const allowedEmails = ['abhi@movya.com', 'patoliyabhi17@gmail.com'];

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

                const f = imap.fetch(results, { bodies: [''], struct: true });

                f.on('message', (msg) => {
                    msg.on('body', (stream, info) => {
                        let buffer = '';
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                        stream.once('end', async () => {
                            try {
                                const parsed = await simpleParser(buffer);
                                const { subject, date, from, text } = parsed;
                                const cleanedTextBody = cleanText(text);
                                const istDate = convertUTCToIST(date);

                                // Log the email date in both UTC and IST

                                // Check if the email is from the allowed addresses
                                if (!allowedEmails.includes(from.value[0].address)) {
                                    return;
                                }

                                // Calculate the date and time range
                                const now = new Date();
                                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const yesterday = new Date(today);
                                yesterday.setDate(today.getDate() - 1);

                                const startTime = new Date(yesterday);
                                startTime.setHours(19, 30, 0, 0); // 2 PM yesterday
                                // console.log('Start Time:', startTime);

                                const endTime = new Date(today);
                                endTime.setHours(19, 0, 0, 0); // 1 PM today
                                // console.log('End Time:', endTime);

                                // Check if the email was received within the specified range
                                const emailDate = new Date(istDate);
                                // console.log('Email Date:', emailDate);
                                if (emailDate < startTime || emailDate >= endTime) {
                                    return;
                                }

                                // Store the email in the database
                                const email = await storeEmailModel.create({
                                    subject,
                                    from: from.text,
                                    currentDate: new Date().toJSON().slice(0, 10),
                                    receivedDateTime: istDate,
                                    body: cleanedTextBody,
                                });
                                console.log('Email stored:', email.subject);
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
}

// fetch emails from database and store it in array
const fetchFromDB = async () => {
    try {
        const emails = await storeEmailModel.find({currentDate: new Date().toJSON().slice(0, 10)});
        console.log(emails);
    } catch (error) {
        console.log(error);
    }
}






//function call
// fetchEmails();
// fetchFromDB();