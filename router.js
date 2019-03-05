const Router = require('koa-router')
const router = new Router()
const db = require('./mysql.js')

const query = function (sql, arg) {
  return new Promise((resolve, reject) => {
    db.query(sql, arg, function (results) {
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
  .get('/login', async (ctx) => {
    const email = ctx.query.userName
    const pwd = ctx.query.password
    const data = await query(`SELECT * FROM hc_user where userName = '${email}'`)
    if(data.length > 0) {
      if(pwd == data[0].passWord) {
        ctx.body = {
          msg: "登录成功",
          code: 100
        }
      }else {
        ctx.body = {
          msg: "用户名或密码错误",
          code: 101
        }
      }
    }else {
      ctx.body = {
        msg: "用户名或密码错误",
        code: 101
      }
    }
  })
  .get('/reg', async (ctx) => {
    const email = ctx.query.userName
    const pwd = ctx.query.password
    if(email && pwd) {
      const exit = await query(`SELECT * FROM hc_user where userName = '${email}'`, '')
      if(exit.length === 0) {
        const data = await query(`INSERT INTO hc_user (userName, passWord) VALUES ('${email}', '${pwd}');`, '')
        if(data.affectedRows > 0) {
          ctx.body = {
            msg: "注册成功",
            code: 100
          }
        }else {
          ctx.body = {
            msg: "注册失败",
            code: 102
          }
        }
      }else {
        ctx.body = {
          msg: "用户名已存在！",
          code: 101
        }
      }
    }
  })

module.exports = router