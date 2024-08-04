const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;

const config = {
    imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: process.env.IMAP_PORT,
        tls: true,
        authTimeout: 3000
    }
};

async function getOtpFromEmail() {
    try {
        const connection = await imaps.connect({ imap: config.imap });
        await connection.openBox('INBOX');

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

        const messages = await connection.search(searchCriteria, fetchOptions);
        for (const item of messages) {
            const all = item.parts.find(part => part.which === 'TEXT');
            const id = item.attributes.uid;
            const idHeader = "Imap-Id: " + id + "\r\n";

            const mail = await simpleParser(idHeader + all.body);
            const otpMatch = mail.text.match(/\b\d{6}\b/); // Assuming OTP is a 6-digit number

            if (otpMatch) {
                connection.end();
                return otpMatch[0];
            }
        }

        connection.end();
        return null;
    } catch (error) {
        console.error('Failed to get OTP from email:', error);
        return null;
    }
}

module.exports = getOtpFromEmail;
