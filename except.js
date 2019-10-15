const colors = require('colors/safe');
try {
   throw {ErrorName:"myException", ErrorCode: 404}; // ตั้งใจ throw exception ออกมา
}
catch (e) {
   // ส่วนที่ทำการดักจับ Exception ที่เราทำการ throw มันออกมา
   console.log(colors.red(JSON.stringify(e))); // ทำการ log ข้อผิดพลาดที่เกิดขึ้น
}
