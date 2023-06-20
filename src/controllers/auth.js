const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('./../util/db')
const nodemailer = require('./../util/confirmationMailSender')
require('dotenv').config();

const { TOKEN_SECRET_JWT, OAUTH_SIG_PASSWORD } = process.env;
const SALT_ROUNDS = 10

const generateTokens = (req, user) => {
    console.log(user)
    const ACCESS_TOKEN = jwt.sign(
        {
            uid: user.id,
            rol: user.role,
            type: "ACCESS_TOKEN",
        },
        TOKEN_SECRET_JWT,
        {
            expiresIn: "1h",
        }
    );

    const REFRESH_TOKEN = jwt.sign(
        {
            uid: user.id,
            rol: user.role,
            type: "REFRESH_TOKEN",
        },
        TOKEN_SECRET_JWT,
        {
            expiresIn: "1d",
        }
    );

    return {
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
    };
};

async function validateEmailAccessibility(email) {
    if(!email) {
        throw new Error("Invalid param!")
    }
    const client = await pool.connect();
    const res = await client.query('select COUNT(email) from "users" where email=$1', [email])
    const isEmailAccessible = res.rows[0].count === '0';
    client.release()
    return isEmailAccessible
}

async function createUser(req, res) {
    try {
        const {email, username, password} = req.body;
        if(email === "" || username === "" || password === "") {
            console.log('REQUEST createUser: params are missing!')
            return res.status(422).json({message: "Missing request parameters!"});
        }
        if(!await validateEmailAccessibility(email)) {
            console.log('REQUEST createUser: email is taken!', email)
            return res.status(409).json({
                message: "Register failed. Email is taken.",
            });
        }
        try {
            const client = await pool.connect();
            const token = jwt.sign({email: email}, TOKEN_SECRET_JWT)
            await client.query('insert into users(username, password, email, role, accepted, activation_token) values ($1, $2, $3, \'user\', false, $4)', [username, bcrypt.hashSync(password, SALT_ROUNDS), email, token])
            client.release()
            nodemailer.sendConfirmationEmail(username, email, token)
            return res.status(200).json({
                message: "The user was created. Check your email to activate an account!",
            });
        } catch (e) {
            console.log(e)
            return res.status(409).json({
                message: "Register failed. Error occured while creating user.",
            });
        }
    } catch (e) {
        console.log('REQUEST createUser: params are missing!')
        return res.status(422).json({message: "Register failed. Missing request parameters!"});
    }
}
module.exports.createUser = createUser

async function verifyUser(req, res) {
    const client = await pool.connect();
    try {
        const confirmationCode = req.params.confirmationCode;
        if(!confirmationCode) {
            return res.status(404).send({ message: "Token not present" });
        }
        const result = await client.query('select id, email, username, password, accepted, role, activation_token from "users" where activation_token=$1', [confirmationCode]);
        console.log(result)
        if(result.rowCount > 0) {
            console.log(result)
            await client.query('update users set accepted = \'true\' where id=$1', [result.rows[0].id]);
            client.release()

            return res.status(200).json({message: "Verification successful!"});
        } else {
            return res.status(404).json({message: 'User not found'});
        }
    } catch (e) {
        client.release()
        return res.status(500).json({message: 'Error occured'});
    }
}
module.exports.verifyUser = verifyUser

const loginUser = async (req, res, next) => {
    try {
        const client = await pool.connect();
        const {email, username, password} = req.body;
        const result = await client.query('select id, email, username, password, accepted, role from "users" where email=$1', [email]);
        client.release()
        if(result.rowCount > 0) {
            if(password === OAUTH_SIG_PASSWORD) {
                if(password === result.rows[0].password) {
                    return res.status(200).json(Object.assign(generateTokens(req, {id: result.rows[0].id, role: result.rows[0].role}), { 'role': result.rows[0].role, 'username': result.rows[0].username }));
                } else {
                    return res.status(403).json('Wrong login option. Use GITHUB OAuth provider!');
                }
            }
            const passwOk = bcrypt.compareSync(password, result.rows[0].password);
            if(passwOk) {
                if(!result.rows[0].accepted) {
                    return res.status(403).json('Account is not verified!');
                }
                return res.status(200).json(Object.assign(generateTokens(req, {id: result.rows[0].id, role: result.rows[0].role}), { 'role': result.rows[0].role, 'username': result.rows[0].username }));
            } else {
                return res.status(401).json('Wrong credentials!');
            }
        } else {
            if(password === OAUTH_SIG_PASSWORD) {
                //create account for oauth
                if(!await validateEmailAccessibility(req.body.email)) {
                    return res.status(409).json({
                        message: "This email is used with password authentication. Don't use OAuth authentication.",
                    });
                }
                try {
                    const client = await pool.connect();
                    await client.query('insert into Users(username, password, email, role, accepted, activation_token) values ($1, $2, $3, \'user\', true, $4)', [username, OAUTH_SIG_PASSWORD, email, 'oauth_no_token'])
                    const result = await client.query('select id, email, username, password, accepted, role from "users" where email=$1', [email]);
                    client.release()
                    if(result.rowCount > 0) {
                        return res.status(200).json(Object.assign(generateTokens(req, {id: result.rows[0].id, role: result.rows[0].role}), { 'role': result.rows[0].role, 'username': result.rows[0].username }));
                    } else {
                        return res.status(418).json('I\'m a teapot!');
                    }
                } catch (e) {
                    return res.status(409).json({
                        message: "Error occured while creating user.",
                    });
                }

            }
            return res.status(401).json('Wrong credentials!');
        }
    } catch (e) {
        return res.status(422).json({message: "Missing request parameters!"});
    }
};
module.exports.loginUser = loginUser

const accessTokenVerify = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({
            error: "Token is missing",
        });
    }
    const BEARER = "Bearer";
    const AUTHORIZATION_TOKEN = req.headers.authorization.split(" ");
    if (AUTHORIZATION_TOKEN[0] !== BEARER) {
        return res.status(401).send({
            error: "Token is not complete",
        });
    }
    jwt.verify(AUTHORIZATION_TOKEN[1], TOKEN_SECRET_JWT, function (err) {
        if (err) {
            return res.status(401).send({
                error: "Token is invalid",
            });
        }
        next();
    });
};
module.exports.accessTokenVerify = accessTokenVerify

const refreshTokenVerify = (req, res, next) => {
    if (!req.headers.authorization) {
        res.status(403).send({
            message: "Token refresh is missing",
        });
    }

    const BEARER = "Bearer";
    const REFRESH_TOKEN = req.headers.authorization.split(" ");
    if (REFRESH_TOKEN[0] !== BEARER) {
        return res.status(403).send({
            error: "Token is not complete",
        });
    }
    jwt.verify(REFRESH_TOKEN[1], TOKEN_SECRET_JWT, async function (err, payload) {
        if (err) {
            return res.status(403).send({
                error: "Token refresh is invalid",
            });
        }
        try {
            const client = await pool.connect();
            const result = await client.query('select id, email, password, accepted, role from "users" where id=$1', [payload.uid]);
            client.release()
            if(result.rowCount === 0) {
                return res.status(403).send({
                    error: "User no longer exists in the database.",
                });
            }
            return res.status(200).json(Object.assign(generateTokens(req, {id: result.rows[0].id, role: result.rows[0].role}), { 'role': result.rows[0].role,  'username': result.rows[0].username }));
        } catch (e) {
            console.log(e)
            return res.status(401).json({
                message: "Wrong credentials!",
            });
        }
    });
};
module.exports.refreshTokenVerify = refreshTokenVerify
