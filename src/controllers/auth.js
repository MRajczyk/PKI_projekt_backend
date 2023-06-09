const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('./../util/db')
const SECRET_JWT = process.env.TOKEN_SECRET_JWT;

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
    const client = await pool.connect();
    const res = await client.query('select COUNT(email) from "users" where email=$1', [email])
    if(res.rowCount > 0) {
        client.end()
        return false
    }
    else {
        client.end()
        return true
    }
}

async function createUser(req, res) {
    try {
        if(!await validateEmailAccessibility(req.body.email)) {
            res.status(409).json({
                message: "Email is taken.",
            });
            return;
        }
        const createdUser = true //todo: userCreation in db
        if(createdUser) {
            res.status(200).json({
                message: "The user was created.",
            });
        }
    } catch (e) {
        res.status(422).json({message: "Missing request parameters!"});
        console.log(e.message);
    }
}

module.exports.createUser = createUser
