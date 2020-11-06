// npm i express express-handlebars node-fetch with-query mysql2
const express = require('express')
const handlebars =require('express-handlebars')
const fetch = require('node-fetch')
const withQuery = require('with-query').default
const mysql = require('mysql2/promise')

const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306, 
    database: process.env.DB_NAME || 'goodreads',
    user: process.env.DB_USER || 'wilma',
    password: process.env.DB_PASSWORD || 'wilma',
    connectionLimit: 4, 
    timezone: '+08:00'
})

const firstCharacters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const apiKey = process.env.API_KEY || ""
const SQL_GET_TITLES_BEGINNING = "select title from book2018 where title like ? order by title asc limit 10 offset ?"
// select title from book2018 where title like 'a%' order by title asc limit 10 offset 0;
const SQL_GET_DETAILS_BY_TITLE = "select title, authors, pages, rating, rating_count, genres, image_url, description from book2018 where title = ?"
// select title, authors, pages, rating, rating_count, genres, image_url, description from book2018 where title = "the outsider";



const app = express()
app.engine('hbs', handlebars({defaultLayout: 'default.hbs'}))
app.set('view engine', 'hbs')

app.get('/', (req, res) => {
    res.status(200)
    res.type('text/html')
    res.render('index', {firstCharacters})
})

app.get('/booklist/:firstCharacter', async (req, res) => {
    const conn = await pool.getConnection()
    // set variables for limit, offset
    const offset = parseInt(req.query['offset']) || 0
    console.log('req.query: ', req.query)
    console.log('req.params: ', req.params)
    console.log('Object.values(req.params)[0]: ', Object.values(req.params)[0])
    
    const firstCharacter = Object.values(req.params)[0] + "%"
    console.log('firstChar: ', firstCharacter)
    const limit = 10
    // const pg1 = 0
    // const pg2 = 10
    // (pgNumber - 1) * limit 
    try {
        const results = await conn.query(SQL_GET_TITLES_BEGINNING, [firstCharacter, offset])
        // console.log('results:', results)
        // const television_shows = results[0].map(v => v.name)
        // console.log('television_shows:', television_shows)
        // console.log('offset: ', offset)
        // console.log('results: ', results)
        const bl = results[0].length
        console.log('result length: ', bl)
        res.status(200)
        res.type('text/html')
        res.render('booklist', {
            books: results[0],
            prevOffset: Math.max(0, offset - limit),
            prevbool: !offset,
            nextOffset: offset + limit,
            nextbool: bl < limit,
            letter: Object.values(req.params)[0].toUpperCase(),
            smallletter: Object.values(req.params)[0]
        })
    } catch(e) {
        res.status(500)
        res.type('text/html')
        res.send(JSON.stringify(e))
    } finally {
        conn.release()
    }
})


app.get('/booklist/details/:title', async (req, res) => {
    console.log('req.params: ', req.params)
    const title = req.params['title']
    console.log('title: ', title)
    const conn = await pool.getConnection()

    try {
        const results = await conn.query(SQL_GET_DETAILS_BY_TITLE, [title])
        const recs = results[0]
        console.log('recs: ', recs )
        console.log('recs[0]: ', recs[0] )
        if (recs.length <= 0) {
            res.status(404)
            res.type('text/html')
            res.send(`Not found: ${title}`)
            return
        }
        res.status(200)
        res.format({
            'text/html': () => {
                res.type('text/html')
                res.render('details', {details: recs[0]})
            },
            'application/json': () => {
                res.type('application/json')
                res.json(recs[0])
            },
            'default': () => {
                res.type('text/plain')
                res.send(JSON.stringify(recs[0]))
            }
        })
    } catch(e) {
        res.status(500)
        res.type('text/html')
        res.send(JSON.stringify(e))
    } finally {
        conn.release()
    }

})



app.use(express.static(__dirname + '/static'))
app.use(express.static(__dirname + '/public'))





// // start the server
// app.listen(PORT, () => {
//     console.log(`Application started on ${PORT} at ${new Date()}.`)
// })

// // start the server
// if (API_KEY)
//     app.listen(PORT, () => {
//         console.info(`Application started on port ${PORT} at ${new Date()}`)
//         console.info(`with key ${API_KEY}`)
//     })
// else
//     console.error('API_KEY is not set')

// start the server
pool.getConnection()
    .then(conn => {
        console.info('Pinging database...')
        const p0 = Promise.resolve(conn)
        const p1 = conn.ping()
        return Promise.all([ p0, p1 ])
    })
    .then(results => {
        const conn = results[0]
        // release the connection
        conn.release()

        // start the server
        app.listen(PORT, () => {
            console.info(`Application started on port ${PORT} at ${new Date()}`)
        })
    })
    .catch(e => {
        console.error('Cannot start server: ', e)
    })