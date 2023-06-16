const pool = require('./../util/db')

const handleQuery = async (req, res, next) => {
    const userQuery = req.body.query
    if(!userQuery) {
        res.status(422).json({message: "Missing request parameters!"});
        console.log('REQUEST handleQuery: params are missing!')
        return;
    }
    try {
        const client = await pool.connect();
        const result = await client.query(userQuery)
        client.release()
        return res.status(200).json({result: result});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            error_message: e.message,
            error: e,
        });
    }
}
module.exports.handleQuery = handleQuery