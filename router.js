const Router = require('koa-router')
const router = new Router()
const db = require('./mysql.js')

const query = function (sql, arg) {
  return new Promise((resolve, reject) => {
    db.query(sql, arg, function (results, resulfieldsts) {
      resolve(results)
    });
  })
}

router
  .all('*', async(ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "http://localhost:8080")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set("Access-Control-Allow-Headers", "Origin, No-Cache, X-Requested-With, If-Modified-Since, Pragma, Last-Modified, Cache-Control, Expires, Content-Type, X-E4M-With")
    ctx.set("Content-Type", "text/html; charset=utf-8")
    await next()
  })
  .get('/list', async (ctx) => {
    db.query('SELECT * FROM NewTable', '', function (results) {
      ctx.body = 'results';
    })
  })
  .get('/detail', async (ctx) => {
    const data = await query('select * from NewTable', '')
    console.log(data) // 查询到数据
    ctx.body = {
      data: data
    }
  })

module.exports = router