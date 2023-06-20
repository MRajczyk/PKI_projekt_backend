const pool = require('./../util/db')
const collect = require('collect.js')
const util = require("./../util/util");

const getUsers = async (req, res, next) => {
    const reqUserRole = util.decodeJwt(req.headers.authorization.split(" ")[1]).rol;
    if(!collect(reqUserRole).contains('admin')) {
        res.status(401).send({message: "Unauthorized"});
        next();
        return;
    }

    try {
        const client = await pool.connect();
        const result = await client.query('select * from "users"')
        client.release()
        return res.status(200).json({users: result.rows});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while getting users",
        });
    }
}
module.exports.getUsers = getUsers