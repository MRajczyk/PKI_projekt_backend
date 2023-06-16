const pool = require('./../util/db')

const getCurrentDatabase = async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT current_database()')
        client.release()
        res.status(200).json(result.rows[0]);
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while getting database name",
        });
    }
}
module.exports.getCurrentDatabase = getCurrentDatabase


const getAllTables = async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\' AND table_type=\'BASE TABLE\'')
        client.release()
        res.status(200).json({tables: result.rows});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while getting database tables",
        });
    }
}
module.exports.getAllTables = getAllTables

const getTable = async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query(`SELECT * FROM ${req.params.tableName}`)
        client.release()
        res.status(200).json({rows: result.rows});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while getting database tables",
        });
    }
}
module.exports.getTable = getTable

const getInfoAboutTable = async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = $1', [req.params.tableName])
        client.release()
        res.status(200).json({columns: result.rows});
    } catch (e) {
        console.log(e)
        res.status(409).json({
            message: "Error occured while getting database tables",
        });
    }
}
module.exports.getInfoAboutTable = getInfoAboutTable