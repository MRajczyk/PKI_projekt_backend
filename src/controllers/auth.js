const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('./../util/db')
const SECRET_JWT = process.env.TOKEN_SECRET_JWT;
const SALT_ROUNDS = 10

const generateTokens = (req, user) => {
    const ACCESS_TOKEN = jwt.sign(
        {
            sub: user.id,
            rol: user.roles,
            type: "ACCESS_TOKEN",
        },
        SECRET_JWT,
        {
            expiresIn: "1h",
        }
    );

    const REFRESH_TOKEN = jwt.sign(
        {
            sub: user.id,
            rol: user.roles,
            type: "REFRESH_TOKEN",
        },
        SECRET_JWT,
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
    client.end()
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
            await client.query('insert into Users(username, password, email, role) values ($1, $2, $3, \'user\')', [req.body.username, bcrypt.hashSync(req.body.password, SALT_ROUNDS), req.body.email])
            client.end()
        } catch (e) {
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
