const pool = require('./../util/db')

const handleQuery = async (req, res, next) => {
    const userQuery = req.body.query
    if(!userQuery) {
        res.status(422).json({message: "Missing request parameters!"});
        console.log('REQUEST createUser: params are missing!')
        return;
    }
    try {
        const client = await pool.connect();
        const result = await client.query(userQuery)
        client.end()
        res.status(200).json({result: result.rows});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while performing query",
        });
    }
}
module.exports.handleQuery = handleQuery