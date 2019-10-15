const isVersionThrow = false

class TestClass {
  async testFunction () {
    if (isVersionThrow) {
      console.log('Throw version')
      throw new Error('Fail!')
    } else {
      console.log('Reject version')
      return new Promise((resolve, reject) => {
        reject(new Error('Fail!'))
      })
    }
  }
}

const test = async () => {
  const test = new TestClass()
  try {
    var response = await test.testFunction()
    return response 
  } catch (error) {
    console.log('ERROR RETURNED')
    throw error 
  }  
}

test().then(result => {
  console.log('result: ' + result)
}).catch(error => {
  console.log('error: ' + error)
})

//https://stories.sellsuki.co.th/js-201-%E0%B8%81%E0%B8%B1%E0%B8%9A%E0%B8%94%E0%B8%B1%E0%B8%81%E0%B8%AD%E0%B8%B1%E0%B8%99%E0%B8%95%E0%B8%A3%E0%B8%B2%E0%B8%A2-promise-async-await-%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%99%E0%B9%81%E0%B8%A5%E0%B9%89%E0%B8%A7%E0%B8%9E%E0%B8%B1%E0%B8%87-%E0%B9%81%E0%B8%97%E0%B8%99%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%88%E0%B8%B0%E0%B8%9B%E0%B8%B1%E0%B8%87-6e26a1af1bd1