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

function parsePostData(ctx) {
  // 利用ES6的语法new一个Promise对象，其中传递两个值，resolve是成功的，而reject是失败的
  return new Promise((resolve, reject) => {
    try {
      // 对获取到的值进行处理
      let postdata = "";
      ctx.req.on('data', (data) => {
        postdata += data
      })
      ctx.req.addListener("end", function () {
        // 把我们在全局定义的postdata传递给parseQueryStr，进行格式的转化
        let parseData = parseQueryStr(postdata)
        // 把成功后的parseData传出去
        resolve(parseData);
      })
    } catch (error) {
      // 把错误的信息返回出去
      reject(error);
    }
  });
}

/*POST字符串解析JSON对象*/
function parseQueryStr(queryStr) {
  let queryData = {};
  let queryStrList = queryStr.split('&');
  // 利用了ES6提供的forOf，可以找找相关的看看
  for (let [index, queryStr] of queryStrList.entries()) {
    // 进行切割
    let itemList = queryStr.split('=');
    queryData[itemList[0]] = decodeURIComponent(itemList[1]);
  }
  return queryData
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
  .post('/login', async (ctx) => {
    let pastData = await parsePostData(ctx)
    const email = pastData.userName
    const pwd = pastData.password
    const data = await query(`SELECT * FROM hc_user where userName = '${email}'`)
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
  .post('/reg', async (ctx) => {
    let pastData = await parsePostData(ctx)
    const email = pastData.userName
    const pwd = pastData.password
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
      try {
        payload = await verify(token, secert)
        ctx.body = {
          data: payload
        }
      } catch (error) {
        ctx.body = {
          message: error.message,
          code: -1
        }
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
    const data = await query(`SELECT * FROM hc_artical o order by postDate desc limit ${page} , ${limit}`)
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
  .get('/api/getlist', async (ctx) => {
    const id = ctx.query.id
    const data = await query(`SELECT * FROM hc_artical where article_id = "${id}" order by postDate desc limit 6`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data
    }
  })
  .post('/api/publish', async (ctx) => {
    let pastData = await parsePostData(ctx)
    const data = await query(`INSERT INTO hc_artical (title, postDate, tips, category, content, article_id) VALUES ('${pastData.title}', '${pastData.postDate}', '${pastData.tips}', '${pastData.category}', '${pastData.val}', '${pastData.artical_id}');`, '')
    if(data.affectedRows > 0) {
      ctx.body = {
        data: {
          msg: "成功",
          code: 100
        }
      }
    }else {
      ctx.body = {
        data: {
          msg: "失败",
          code: 101
        }
      }
    }
    
  })

module.exports = router