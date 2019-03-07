const Koa = require('koa')
const Router = require('koa-router')
const jwt = require('jsonwebtoken')
const bodyParser = require('koa-bodyparser')
const jwtKoa = require('koa-jwt')
const secert = 'my_token'
const util = require('util')
const verify = util.promisify(jwt.verify)
const router = new Router()
const db = require('./mysql.js')
const app = new Koa()
app.use(bodyParser)

app
  .use(jwtKoa({
    secert
  }).unless({
    path: [/^\/login/, /^\/reg/] //数组中的路径不需要通过jwt验证
  }))

const query = function (sql, arg) {
  return new Promise((resolve, reject) => {
    db.query(sql, arg, function (results) {
      resolve(results)
    });
  })
}

router
  .all('*', async (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "http://localhost:8080")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set("Access-Control-Allow-Headers", "*")
    ctx.set("Content-Type", "text/html; charset=utf-8")
    await next()
  })
  .get('/login', async (ctx) => {
    const email = ctx.query.userName
    const pwd = ctx.query.password
    const data = await query(`SELECT * FROM hc_user where userName = '${email}'`)
    console.log(data)
    if (data.length > 0) {
      if (pwd == data[0].passWord) {
        const token = jwt.sign({
          userName: email,
          id: data[0].id,
          nickName: data[0].nickName,
          image: data[0].image,
          introduction: data[0].introduction,
          github: data[0].github,
          wechat: data[0].wechat
        }, 'my_token', {
          expiresIn: '2h'
        });
        ctx.body = {
          msg: "登录成功",
          code: 100,
          data: token
        }
      } else {
        ctx.body = {
          msg: "用户名或密码错误",
          code: 101
        }
      }
    } else {
      ctx.body = {
        msg: "用户名或密码错误",
        code: 101
      }
    }
  })
  .get('/reg', async (ctx) => {
    const email = ctx.query.userName
    const pwd = ctx.query.password
    if (email && pwd) {
      const exit = await query(`SELECT * FROM hc_user where userName = '${email}'`, '')
      if (exit.length === 0) {
        const data = await query(`INSERT INTO hc_user (userName, passWord) VALUES ('${email}', '${pwd}');`, '')
        if (data.affectedRows > 0) {
          ctx.body = {
            msg: "注册成功",
            code: 100
          }
        } else {
          ctx.body = {
            msg: "注册失败",
            code: 102
          }
        }
      } else {
        ctx.body = {
          msg: "用户名已存在！",
          code: 101
        }
      }
    }
  })
  .get('/api/userInfo', async (ctx) => {
    const token = ctx.header.token // 获取jwt
    let payload
    if (token) {
      payload = await verify(token, secert)
      ctx.body = {
        data: payload
      }
    } else {
      ctx.body = {
        message: 'token 错误',
        code: -1
      }
    }
  })
  .get('/api/getArtical', async (ctx) => {
    const limit = ctx.query.limit
    const page = (ctx.query.page - 1) * limit
    const data = await query(`SELECT * FROM hc_artical o limit ${page}, ${limit}`)
    const all = await query(`SELECT * FROM hc_artical`)
    ctx.body = {
      msg: "succ",
      code: 100,
      count: all.length,
      data: data
    }
  })
  .get('/api/getDetail', async (ctx) => {
    const artical_id = ctx.query.id
    const detail = await query(`SELECT * FROM hc_artical where id = ${artical_id}`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: detail[0]
    }
  })
  .get('/api/searchValue', async (ctx) => {
    const title = ctx.query.title
    const str = ''.concat("%", title, "%")
    const data = await query(`SELECT * FROM hc_artical where title like "${str}"`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data
    }
  })

module.exports = router