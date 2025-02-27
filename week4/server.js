require("dotenv").config()
const http = require("http")
const AppDataSource = require("./db")
//
function isUndefined (value) {
  return value === undefined
}

function isNotValidSting (value) {
  return typeof value !== "string" || value.trim().length === 0 || value === ""
}

function isNotValidInteger (value) {
  return typeof value !== "number" || value < 0 || value % 1 !== 0
}

const requestListener = async (req, res) => {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "PATCH, POST, GET,OPTIONS,DELETE",
    "Content-Type": "application/json"
  }
  //
  const sendRespone = (res, statusCode, data) => {
    res.writeHead(statusCode, headers)
    res.write(JSON.stringify(data))
    res.end()
  }

  let body = ""
  req.on("data", (chunk) => {
    body += chunk
  })

  if (req.url === "/api/credit-package" && req.method === "GET") {
    try {
      const allCreditPackage = await AppDataSource.getRepository("CreditPackage").find({
        select: ['id', 'name', 'credit_amount', 'price']
      })
      sendRespone(res, 200, {
        status: "success",
        data: allCreditPackage,
      })
    } catch (error) {
      sendRespone(res, 500, {
        status: "error",
        message: "伺服器錯誤",
      })
    }
    
  } else if (req.url === "/api/credit-package" && req.method === "POST") {
    req.on('end', async() =>{
      try {
        const data = JSON.parse(body);
        //檢查欄位
        if(isUndefined(data.name) || isNotValidSting(data.name) ||
          isUndefined(data.credit_amount) || isNotValidInteger(data.credit_amount) ||
          isUndefined(data.price) || isNotValidInteger(data.price)){
            sendRespone(res, 400, {
              status: "failed",
              message: "欄位未填寫正確",
            })
            return
        }
        //檢查方案名稱是否重複
        const creditPackageRepo = AppDataSource.getRepository("CreditPackage")
        const existCreditPackage = await creditPackageRepo.find({
          where: {
            name: data.name
          }
        })
        if(existCreditPackage.length > 0){
          sendRespone(res, 409, {
            status: "failed",
            message: "資料重複",
          })
          return
        }
        //寫入資料表
        const newCreditPackage = creditPackageRepo.create({
          name: data.name,
          credit_amount: data.credit_amount,
          price: data.price
        })
        const result = await creditPackageRepo.save(newCreditPackage)
        sendRespone(res, 201, {
          status: "success",
          data: result,
        })
      } catch (error) {
        sendRespone(res, 500, {
          status: "error",
          message: "伺服器錯誤",
        })
      }
    })

  } else if (req.url.startsWith("/api/credit-package/") && req.method === "DELETE") {
    try {
      const creditPackageId = req.url.split('/').pop();
      // 檢查ID
      if(isUndefined(creditPackageId) || isNotValidSting(creditPackageId)){
        sendRespone(res, 400, {
          status: "error",
          message: "ID錯誤",
        })
        return
      }
      const result = await AppDataSource.getRepository("CreditPackage").delete(creditPackageId)
      if(result.affected === 0){
        sendRespone(res, 400, {
          status: "error",
          message: "ID錯誤",
        })
        return
      }
      sendRespone(res, 200, {
        status: "success",
      })
    } catch (error) {
      sendRespone(res, 500, {
        status: "error",
        message: "伺服器錯誤",
      })
    }
  } else if (req.method === "OPTIONS") {
    res.writeHead(200, headers)
    res.end()
  } else {
    res.writeHead(404, headers)
    res.write(JSON.stringify({
      status: "failed",
      message: "無此網站路由",
    }))
    res.end()
  }
}

const server = http.createServer(requestListener)

async function startServer() {
  await AppDataSource.initialize()
  console.log("資料庫連接成功")
  server.listen(process.env.PORT)
  console.log(`伺服器啟動成功, port: ${process.env.PORT}`)
  return server;
}

module.exports = startServer();
