const Koa = require('koa')
const router = require('./router.js')
const app = new Koa()

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000)
console.log("启动")