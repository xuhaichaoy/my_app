const Router = require('koa-router')
const jwt = require('jsonwebtoken')
const util = require('util')
const secert = 'my_token'
const verify = util.promisify(jwt.verify)
const router = new Router()
const db = require('./mysql.js')

const mysql = db.connectd()

const query = function (sql, arg) {
  return new Promise((resolve, reject) => {
    db.query(sql, arg, function (results) {
      resolve(results)
    });
  })
}
var formatDateTime = function (date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  m = m < 10 ? ('0' + m) : m;
  var d = date.getDate();
  d = d < 10 ? ('0' + d) : d;
  var h = date.getHours();
  h = h < 10 ? ('0' + h) : h;
  var minute = date.getMinutes();
  minute = minute < 10 ? ('0' + minute) : minute;
  var second = date.getSeconds();
  second = second < 10 ? ('0' + second) : second;
  return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
};

router
  .all('*', async (ctx, next) => {
    ctx.set("Access-Control-Allow-Origin", "http://haichao.mobi:8080")
    ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    ctx.set("Access-Control-Allow-Credentials", "true")
    ctx.set("Access-Control-Allow-Headers", "X-Requested-With, token")
    ctx.set("Content-Type", "text/html; charset=utf-8")
    if (ctx.request.header.referer.indexOf('http://haichao.mobi:8080') !== 0) {
      ctx.cookies.set('my_tk', '', {
        signed: false,
        maxAge: 0
      })
      ctx.body = {
        msg: "CSRF",
        code: 101
      }
      return
    }
    if (ctx.cookies.get('my_tk')) {
      try {
        payload = await verify(ctx.cookies.get('my_tk'), secert)
        ctx.cookies.set('my_tk', ctx.cookies.get('my_tk'), {
          domain: 'haichao.mobi',
          path: '/', //cookie写入的路径
          maxAge: 1000 * 60 * 60 * 1,
          // expires:new Date('2019-07-06'),
          httpOnly: true,
          overwrite: false
        });
      } catch (error) {
        console.log(error)
      }
    }
    await next()
  })
  .post('/login', async (ctx) => {
    const email = mysql.escape(ctx.request.body.userName)
    const pwd = ctx.request.body.password
    const data = await query(`SELECT * FROM tb_user where userName = ${email}`)
    if (data.length > 0) {
      if (pwd == data[0].passWord) {
        const token = jwt.sign({
          userName: email,
          uid: data[0].uid,
          nickName: data[0].nickName,
          image: data[0].image,
          Info: data[0].Info,
          Github: data[0].Github,
        }, secert, {
          expiresIn: '24h'
        });
        ctx.cookies.set('my_tk', token, {
          domain: 'haichao.mobi',
          path: '/', //cookie写入的路径
          maxAge: 1000 * 60 * 60 * 1,
          // expires:new Date('2019-07-06'),
          httpOnly: true,
          overwrite: false
        });
        ctx.body = {
          msg: "登录成功",
          code: 100,
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
    const email = mysql.escape(ctx.request.body.userName)
    const pwd = mysql.escape(ctx.request.body.password)
    if (email && pwd) {
      const exit = await query(`SELECT * FROM tb_user where userName = ${email}`, '')
      if (exit.length === 0) {
        const data = await query(`INSERT INTO tb_user (userName, passWord) VALUES (${email}, ${pwd});`, '')
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
  .get('/logout', async (ctx) => {
    ctx.cookies.set('my_tk', '', {
      signed: false,
      maxAge: 0
    })
    ctx.body = {
      message: '退出账号成功！！！',
      code: 1
    }
  })
  .get('/api/userInfo', async (ctx) => {
    const token = ctx.cookies.get('my_tk') // 获取jwt
    if (token) {
      try {
        let payload = await verify(token, secert)
        let resData = {
          image: payload.image,
          introduction: payload.introduction,
          nickName: payload.nickName,
          github: payload.github,
          wechat: payload.wechat,
        }
        ctx.body = {
          data: resData
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
    let data = await query(`SELECT
                              aid,
                              artical_title,
                              category_name,
                              tname,
                              htContent,
                              DATE_FORMAT( createDate, '%Y-%m-%d' ) createDate 
                            FROM
                              ( tb_artical LEFT JOIN tb_category ON tb_artical.category_id = tb_category.cid )
                              LEFT JOIN tb_tag ON tb_artical.tag_id = tb_tag.tid
                              ORDER BY
                              aid DESC 
                            LIMIT ${page},${limit}`)
    const all = await query(`SELECT * FROM tb_artical`)
    // var obj = {};
    // data = data.reduce(function (item, next) {
    //   obj[next.aid] ? '' : obj[next.aid] = true && item.push(next);
    //   return item;
    // }, []);
    ctx.body = {
      msg: "succ",
      code: 100,
      count: all.length,
      data: data
    }
  })
  .get('/api/getDetail', async (ctx) => {
    const artical_id = mysql.escape(ctx.query.id)
    const detail = await query(`SELECT
                                aid,
                                artical_title,
                                category_name,
                                tname,
                                htContent,
                                DATE_FORMAT( createDate, '%Y-%m-%d' ) createDate 
                              FROM
                                ( tb_artical LEFT JOIN tb_category ON tb_artical.category_id = tb_category.cid )
                                LEFT JOIN tb_tag ON tb_artical.tag_id = tb_tag.tid
                              where aid = ${artical_id}
    `)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: detail[0]
    }
  })
  .get('/api/searchValue', async (ctx) => {
    if (ctx.query.title) {
      const title = ctx.query.title
      const str = mysql.escape(''.concat("%", title, "%"))
      let data = await query(`SELECT
            aid,
            artical_title,
            category_name,
            tname,
            htContent,
            DATE_FORMAT( createDate, '%Y-%m-%d' ) createDate 
          FROM
            ( tb_artical LEFT JOIN tb_category ON tb_artical.category_id = tb_category.cid )
            LEFT JOIN tb_tag ON tb_artical.tag_id = tb_tag.tid
          WHERE
            artical_title LIKE ${str}`)
      // var obj = {};
      // data = data.reduce(function (item, next) {
      //   obj[next.aid] ? '' : obj[next.aid] = true && item.push(next);
      //   return item;
      // }, []);
      ctx.body = {
        msg: "succ",
        code: 100,
        data: data
      }
    } else if (ctx.query.date) {
      const date = mysql.escape(ctx.query.date)
      let data = await query(`SELECT
      aid,
      artical_title,
      category_name,
      tname,
      htContent,
      DATE_FORMAT( createDate, '%Y-%m-%d' ) createDate 
    FROM
      ( tb_artical LEFT JOIN tb_category ON tb_artical.category_id = tb_category.cid )
      LEFT JOIN tb_tag ON tb_artical.tag_id = tb_tag.tid
    WHERE DATE_FORMAT(createDate,'%Y-%m-%d') = ${date}`)
      // var obj = {};
      // data = data.reduce(function (item, next) {
      //   obj[next.aid] ? '' : obj[next.aid] = true && item.push(next);
      //   return item;
      // }, []);
      ctx.body = {
        msg: "succ",
        code: 100,
        data: data
      }
    } else if (ctx.query.tag) {
      const tag = mysql.escape(ctx.query.tag)
      let tid = await query(`SELECT * from tb_tag where tname = ${tag}`)
      tid = tid[0].tid
      let data = await query(`SELECT
      aid,
      artical_title,
      category_name,
      tname,
      htContent,
      DATE_FORMAT( createDate, '%Y-%m-%d' ) createDate 
    FROM
      ( tb_artical LEFT JOIN tb_category ON tb_artical.category_id = tb_category.cid )
      LEFT JOIN tb_tag ON tb_artical.tag_id = tb_tag.tid
      where tb_artical.tag_id=${tid}`)
      // var obj = {};
      // data = data.reduce(function (item, next) {
      //   obj[next.aid] ? '' : obj[next.aid] = true && item.push(next);
      //   return item;
      // }, []);
      ctx.body = {
        msg: "succ",
        code: 100,
        data: data
      }
    }
  })
  .get('/api/getlist', async (ctx) => {
    const data = await query(`SELECT aid, artical_title FROM tb_artical where createuser_id = 1 order by createDate desc limit 8`)

    ctx.body = {
      msg: "succ",
      code: 100,
      data: data
    }
  })
  .post('/api/publish', async (ctx) => {
    const token = ctx.cookies.get('my_tk') // 获取jwt
    if (token) {
      try {
        let payload = await verify(token, secert)
        const artical_id = mysql.escape(payload.uid)
        const title = mysql.escape(ctx.request.body.title)
        const postDate = mysql.escape(formatDateTime(new Date()))
        const tips = mysql.escape(ctx.request.body.tips)
        const category = mysql.escape(ctx.request.body.category)
        const val = ctx.request.body.val.replace(/(\')/g, "\\'")
        let tid = 0
        let tipData = await query(`select tid from tb_tag where tname =  (${tips});`, '')
        if (tipData.length > 0) {
          tid = tipData[0].tid
        } else {
          tipData = await query(`INSERT INTO tb_tag (tname) VALUES (${tips});`, '')
          if (tipData.affectedRows > 0) {
            tid = tipData.insertId
          }
        }
        let cid = 0
        let cateData = await query(`select cid from tb_category where category_name =  (${category});`, '')
        if (cateData.length > 0) {
          cid = cateData[0].cid
        } else {
          cateData = await query(`INSERT INTO tb_category (category_name) VALUES (${category});`, '')
          if (cateData.affectedRows > 0) {
            cid = cateData.insertId
          }
        }
        const data = await query(`INSERT INTO tb_artical (artical_title, createDate, tag_id, category_id, htContent, createuser_id) VALUES (${title}, ${postDate}, ${tid}, ${cid}, '${val}', ${artical_id});`, '')
        if (data.affectedRows > 0) {
          ctx.body = {
            data: {
              msg: "成功",
              code: 100
            }
          }
        } else {
          ctx.body = {
            data: {
              msg: "失败",
              code: 101
            }
          }
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
  .get('/api/getComment', async (ctx) => {
    const data = await query(`SELECT nickName,image,likes,dislikes,cid,comment_content,DATE_FORMAT(comment_date,'%Y-%m-%d') date FROM tb_comment,tb_user where tb_comment.commentuser_id = tb_user.uid order by comment_date desc`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data
    }
  })
  .post('/api/comment', async (ctx) => {
    const token = ctx.cookies.get('my_tk')
    if (token) {
      try {
        let payload = await verify(token, secert)
        const artical_id = mysql.escape(payload.uid)
        const comment = mysql.escape(ctx.request.body.comment)
        const date = mysql.escape(formatDateTime(new Date()))
        const data = await query(`INSERT INTO tb_comment (comment_content, comment_date,commentuser_id, likes,dislikes) VALUES (${comment}, ${date},${artical_id}, 0, 0);`, '')
        if (data.affectedRows > 0) {
          ctx.body = {
            data: {
              msg: "成功",
              code: 100
            }
          }
        } else {
          ctx.body = {
            data: {
              msg: "失败",
              code: 101
            }
          }
        }
      } catch (error) {
        ctx.body = {
          message: error.message,
          code: -1
        }
      }
    } else {
      ctx.body = {
        data: {
          msg: "请先登录",
          code: 102
        }
      }
    }
  })
  .get('/api/getCategory', async (ctx) => {
    const data = await query(`SELECT count(aid) as num,tname FROM tb_artical,tb_tag where tb_artical.tag_id = tb_tag.tid group by tag_id`)
    const all = await query(`SELECT * FROM tb_tag`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data,
      count: all.length
    }
  })
  .get('/api/getCvalue', async (ctx) => {
    const category = escape(ctx.query.category)
    const data = await query(`SELECT * FROM tb_artical where category_id = "${category_id}"`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data
    }
  })
  .get('/api/dateData', async (ctx) => {
    const data = await query(`SELECT count(aid) as num, DATE_FORMAT(createDate,'%Y-%m-%d') date FROM tb_artical group by date`)
    const all = await query(`SELECT count(aid) as count FROM tb_artical`)
    ctx.body = {
      msg: "succ",
      code: 100,
      data: data,
      count: all[0].count
    }
  })
  .post('/api/settingInfo', async (ctx) => {
    const token = ctx.cookies.get('my_tk')
    if (token) {
      try {
        let payload = await verify(token, secert)
        const uid = payload.uid
        const nickName = mysql.escape(ctx.request.body.nickname)
        const github = mysql.escape(ctx.request.body.github)
        const introduction = mysql.escape(ctx.request.body.introduction)
        const data = await query(`UPDATE tb_user SET nickName = ${nickName}, Github =  ${github},Info = ${introduction} WHERE uid = '${uid}';`, '')
        if (data.affectedRows > 0) {
          ctx.body = {
            data: {
              msg: "成功",
              code: 100
            }
          }
          const data1 = await query(`SELECT * FROM tb_user where uid = ${uid}`)
          if (data1.length > 0) {
            const token = jwt.sign({
              userName: data1[0].userName,
              uid: data1[0].uid,
              nickName: data1[0].nickName,
              image: data1[0].image,
              Info: data1[0].Info,
              Github: data1[0].Github,
            }, secert, {
              expiresIn: '24h'
            });
            ctx.cookies.set('my_tk', token, {
              domain: 'haichao.mobi',
              path: '/', //cookie写入的路径
              maxAge: 1000 * 60 * 60 * 1,
              // expires:new Date('2019-07-06'),
              httpOnly: true,
              overwrite: false
            });
          }
        } else {
          ctx.body = {
            data: {
              msg: "失败",
              code: 101
            }
          }
        }
      } catch (error) {
        ctx.body = {
          message: error.message,
          code: -1
        }
      }
    } else {
      ctx.body = {
        data: {
          msg: "请先登录",
          code: 102
        }
      }
    }
  })

module.exports = router