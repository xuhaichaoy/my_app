const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const jwtKoa = require('koa-jwt')
const secert = 'my_token'
const router = require('./router.js')
const app = new Koa()
app.use(bodyParser())

app
  .use(jwtKoa({
    secert
  }).unless({
    path: [/^\/login/, /^\/reg/, /^\/api/, /^\/logout/] //数组中的路径不需要通过jwt验证
  }))
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000)
console.log("启动")