const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('./../util/db')
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
        if(!await validateEmailAccessibility(req.body.email)) {
            console.log('REQUEST createUser: email is taken!', req.body.email)
            res.status(409).json({
                message: "Email is taken.",
            });
            return;
        }
        try {
            const client = await pool.connect();
            //all users are accepted for now, TODO: implement email-based account activation
            await client.query('insert into Users(username, password, email, role, accepted) values ($1, $2, $3, \'user\', true)', [req.body.username, bcrypt.hashSync(req.body.password, SALT_ROUNDS), req.body.email])
            client.release()
        } catch (e) {
            console.log(e)
            res.status(409).json({
                message: "Error occured while creating user.",
            });
            return;
        }
        res.status(200).json({
            message: "The user was created.",
        });
    } catch (e) {
        res.status(422).json({message: "Missing request parameters!"});
        console.log('REQUEST createUser: params are missing!')
    }
}
module.exports.createUser = createUser

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
                    //all users are accepted for now, TODO: implement email-based account activation (NOT HERE!)
                    await client.query('insert into Users(username, password, email, role, accepted) values ($1, $2, $3, \'user\', true)', [username, OAUTH_SIG_PASSWORD, email])
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
