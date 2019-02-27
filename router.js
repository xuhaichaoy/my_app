const Router = require('koa-router')
const router = new Router()
router
  .all('*', (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "http://localhost:8080")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set("Access-Control-Allow-Headers", "Origin, No-Cache, X-Requested-With, If-Modified-Since, Pragma, Last-Modified, Cache-Control, Expires, Content-Type, X-E4M-With")
    ctx.set("Content-Type", "text/html; charset=utf-8")
    next()
  })
  .get('/', async (ctx) => {
    ctx.body = "首页"
  })
module.exports = router