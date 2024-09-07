require('dotenv').config();
const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;

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
    // Remove unwanted characters like '<' and extra spaces
    cleanedText = cleanedText.replace(/[<>]/g, '');
    // Normalize spaces and line breaks
    cleanedText = cleanedText.replace(/\s*\n\s*/g, '\n').replace(/\n\s*\n/g, '\n\n');
    // Trim leading and trailing whitespace
    cleanedText = cleanedText.trim();
    return cleanedText;
};

(() => {
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
                        stream.once('end', () => {
                            simpleParser(buffer, (err, parsed) => {
                                if (err) {
                                    console.error('Error parsing email:', err);
                                } else {
                                    // Destructure the email parts
                                    const { subject, date, from, text } = parsed;
                                    const cleanedTextBody = cleanText(text);

                                    // Log the destructured parts
                                    console.log('Subject:', subject);
                                    console.log('Date:', date);
                                    console.log('From:', from.text); // from is an address object, use .text for a readable format
                                    console.log('Cleaned Text Body:', cleanedTextBody);
                                }
                            });
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