const nodemailer = require("nodemailer");
require('dotenv').config();

const { GMAIL_MAIL, GMAIL_PASSWORD } = process.env;

const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: GMAIL_MAIL,
        pass: GMAIL_PASSWORD,
    },
});

module.exports.sendConfirmationEmail = (name, email, confirmationCode) => {
    transport.sendMail({
        from: GMAIL_MAIL,
        to: email,
        subject: "Please confirm your account",
        html: `<h1>Email Confirmation</h1>
        <h2>Hello ${name}</h2>
        <p>Thank you for subscribing. Please confirm your email by clicking on the following link</p>
        <a href=http://localhost:3000/confirm/${confirmationCode}> Click here</a>
        </div>`,
    }).catch(err => console.log(err));
};