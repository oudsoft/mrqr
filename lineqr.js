const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const logger = require('./logger');
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const path = require("path");
const constlib = require('./constlib');
const lineqrconstlib = require('./lib/lineqrconstlib.js');
const loaduserqrdata = require('./lib/loaduserqrdata');
const myModule = require("./lib/myModule.js");
const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use("/style", express.static(__dirname + "/style"));
app.use("/font", express.static(__dirname + "/lib/font"));
app.use("/img", express.static(__dirname + "/imgs"));
app.use("/script", express.static(__dirname + "/script"));
app.use("/resource", express.static(__dirname + "/script"));

const home = require('./app/home.js');
app.use('/home', home);
const redis = require('redis');
const sessionHolders = redis.createClient();
sessionHolders.on('connect', function(data) {
    console.log(colors.green('Redis client connected'));
});
sessionHolders.on('error', function(err) {
    console.log(colors.red('Something went wrong ' + err));
});

function updateSession(key, field, value) {
    sessionHolders.hset("\"" + key + "\"", field, value);
}

function getSession(key, field) {
    return new Promise(function(resolve, reject) {
        sessionHolders.hget("\"" + key + "\"", field, function(error, value) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                //console.log('GET result ->' + colors.yellow(value));
                resolve(value);
            }
        });
    });
}

function deleteSession(key) {
    sessionHolders.del("\"" + key + "\"");
}

function deleteSessionField(key, field) {
    sessionHolders.del("\"" + key + "\"", field);
}
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.listen(7979, () => console.log(colors.green('Promptpay QR-Code bot listening on port 7979!')));
app.get('/', (req, res) => res.send('Hello World!'));
// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {
    res.status(200).send("OK");
});
app.get('/', (req, res) => {
    res.status(200).send("OK");
});
app.get('/download', function(request, response) {
    //console.log(colors.green('OK'));
    var fileName = request.query.imagename;
    if (fileName) {
        var file = __dirname + '/' + constlib.QRDOWNLOAD_FOLDER + '/' + fileName;
        response.download(file);
    } else {
        response.redirect('/api/line/home/browsqr');
    }
});
app.get('/printfile', function(request, response) {
    var fileName = request.query.filename;
    var file = __dirname + '/' + constlib.PDFDOWNLOAD_FOLDER + '/' + fileName;
    response.download(file);
});
// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
    console.log(colors.blue("request body : ") + colors.yellow(JSON.stringify(req.body)));
    let replyToken = req.body.events[0].replyToken;
    console.log(colors.blue("replyToken : ") + colors.yellow(replyToken));    
    let userId = req.body.events[0].source.userId;
    console.log(colors.blue("userId : ") + colors.yellow(userId));        
    let replyMessage;
    if (req.body.events[0].type === 'message') {
        //Message
        if (req.body.events[0].message.type === 'text') {
            var userText = req.body.events[0].message.text;
            console.log(colors.blue("userText : ") + colors.yellow(userText));
            if (userText.toUpperCase() === "QR") {
                replyPostBack(replyToken, postBackSelectQRType());
            } else if ((userText.trim().toUpperCase() === "SCAN") || (userText.trim() === "สแกน")) {
                replyPostBack(replyToken, postBackSelectScanType());
            } else {
                getSession(userId, "userMode").then(function(userMode) {
                    console.log(colors.blue("userMode : ") + colors.yellow(userMode));
                    if (userMode === "payAmount") {
                        if ((userText.length > 0) && (Number(userText) >= 0)) {
                            updateSession(userId, "payAmount", userText);
                            replyMessage = "ขอบคุณมากครับ สำหรับข้อมูลทั้งหมดที่จะนำไปสร้างพร้อมเพย์คิวอาร์โค้ด ขอสรุปดังนี้นะครับ\n";
                            getSession(userId, "promptpayType").then(function(promptpayType) {
                                getSession(userId, "promptpayNo").then(function(promptpayNo) {
                                    getSession(userId, "promptpayFName").then(function(promptpayFName) {
                                        getSession(userId, "promptpayLName").then(function(promptpayLName) {
                                            getSession(userId, "payAmount").then(function(payAmount) {
                                                replyMessage = replyMessage.concat("เป็นพร้อมเพย์ประเภท: " + promptpayType + "\n");
                                                replyMessage = replyMessage.concat("หมายเลขพร้อมเพย์: " + promptpayNo + "\n");
                                                replyMessage = replyMessage.concat("ชื่อ นามสกุล เจ้าของพร้อมเพย์: " + promptpayFName + " " + promptpayLName + "\n");
                                                if (payAmount > 0) {
                                                    replyMessage = replyMessage.concat("ยอดโอนจำนวน: " + Number(payAmount).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,') + " บาท" + "\n");
                                                } else {
                                                    replyMessage = replyMessage.concat("ยอดโอนจำนวน: ผู้โอนระบุเอง" + "\n");
                                                }
                                                replyMessage = replyMessage.concat("\nข้อมูลถูกต้องไหมครับ?\nโปรดยืนยันความถูกต้องด้วยการเลือก ถูกต้อง หรือ ขอแก้ไข หากไม่ถูกต้อง");
                                                replyPostBack(replyToken, postBackConfirmYesNo(replyMessage));
                                            });
                                        });
                                    });
                                });
                            });
                        } else {
                            replyMessage = "ยอดจำนวนเงินที่ต้องการโอนไม่ถูกต้องครับ\nขอความกรุณาพิมพ์แต่ตัวเลขจำนวนเงิน(บาท) เช่น 100, 250.50, 1000 หรือ 2525.75 แบบนี้เป็นต้น อีกครั้งครับ";
                            replyText(replyToken, replyMessage);
                        }
                    } else if (userMode === "promptpayNo") {
                        getSession(userId, "qrType").then(function(qrType) {
                            if (qrType === "01") {
                                if ((userText.length === 10) && (Number(userText) > 0)) {
                                    updateSession(userId, "promptpayNo", userText);
                                    replyMessage = "โอเค ขอบคุณมากครับ สำหรับหมายเลขโทรศัพท์\n ต่อไปผมขอทราบ ชื่อ นามสกุล เจ้าของหมายเลขพร้อมเพย์ " + userText + " ด้วยครับ\n(พิมพ์ชื่อ เว้นวรรค แล้วตามด้วยนามสกุลครับ)\nเข่น สมพร พร้อมมูล เป็นต้น";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNames");
                                } else {
                                    replyMessage = "หมายเลขโทรศัพท์ไม่ถูกต้องครับ\nขอความกรุณาพิมพ์แต่ตัวเลข เช่น 0801254466 อีกครั้งครับ";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNo");
                                }
                            } else if (qrType === "02") {
                                if ((userText.length === 13) && (Number(userText) > 0)) {
                                    updateSession(userId, "promptpayNo", userText);
                                    replyMessage = "โอเค ขอบคุณมากครับ สำหรับหมายเลขประจำตัวประชาชน\n ต่อไปผมขอทราบ ชื่อ นามสกุล เจ้าของหมายเลขพร้อมเพย์ " + userText + " ด้วยครับ\n(พิมพ์ชื่อ เว้นวรรค แล้วตามด้วยนามสกุลครับ)\nเข่น สมพร พร้อมมูล เป็นต้น";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNames");
                                } else {
                                    replyMessage = "หมายเลขประจำตัวประชาชนไม่ถูกต้องครับ\nขอความกรุณาพิมพ์แต่ตัวเลข เช่น 1900900999900 อีกครั้งครับ";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNo");
                                }
                            } else if (qrType === "03") {
                                if ((userText.length === 15) && (Number(userText) > 0)) {
                                    updateSession(userId, "promptpayNo", userText);
                                    replyMessage = "โอเค ขอบคุณมากครับ สำหรับหมายเลข e-Wallet\n ต่อไปผมขอทราบ ชื่อ นามสกุล เจ้าของหมายเลขพร้อมเพย์ " + userText + " ด้วยครับ\n(พิมพ์ชื่อ เว้นวรรค แล้วตามด้วยนามสกุลครับ)\nเข่น สมพร พร้อมมูล เป็นต้น";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNames");
                                } else {
                                    replyMessage = "หมายเลข e-Wallet ไม่ถูกต้องครับ\nขอความกรุณาพิมพ์แต่ตัวเลข เช่น 180000862221213 อีกครั้งครับ";
                                    replyText(replyToken, replyMessage);
                                    updateSession(userId, "userMode", "promptpayNo");
                                }
                            } else if (qrType === "09") { 
                                updateSession(userId, "promptpayNo", userText);
                                replyMessage = "โอเค ขอบคุณมากครับ สำหรับข้อมูลที่จะนำไปสร้างคิวอาร์โค้ด\n" + userText + "\nลำดับต่อไปขอรบกวนช่วยบอกว่าคิวอาร์โค้ดที่จะสร้างมันเกี่ยวกับอะไร สั้นๆ 10-30 ตัวอักษรเพื่อให้ผู้ใช้คิวอาร์โค้ดปลายทางได้เข้าใจครับ";
                                updateSession(userId, "userMode", "promptpayNames");
                    			replyText(replyToken, replyMessage);
                            }
                        });
                    } else if (userMode === "promptpayNames") {
                        var promptpayNames = userText.trim();
                        getSession(userId, "qrType").then(function(qrType) { 
                        	if (qrType !== "09") {                      
	                        	getSession(userId, "promptpayNo").then(function(promptpayNo) {
		                            if (promptpayNames.length === 2) {
		                                updateSession(userId, "promptpayFName", promptpayNames[0]);
		                                updateSession(userId, "promptpayLName", promptpayNames[1]);
		                                replyMessage = "ขอบคุณมากครับ สำหรับ ชื่อ นามสกุล เจ้าของหมายเลขพร้อมเพย์ " + promptpayNo + "\nสุดท้ายแล้วครับ ผมขอทราบยอดจำนวนเงิน(บาท) ที่ต้องการโอนครับ\nพิมพ์แต่ตัวเลขจำนวนเงิน(บาท) เช่น 100, 250.50, 1000 หรือ 2525.75 แบบนี้เป็นต้น ครับ\nในกรณีที่ต้องการให้ผู้โอนเงินระบุจำนวนเงินเอง ให้พิมพ์เลข 0 เข้ามาครับ";
		                                replyText(replyToken, replyMessage);
		                                updateSession(userId, "userMode", "payAmount");
		                            } else {
		                                replyMessage = "ชื่อ นามสกุล เจ้าของหมายเลขพร้อมเพย์ " + promptpayNo + "ไม่ถูกต้องครับ\nขอความกรุณาพิมพ์ชื่อ เว้นวรรค แล้วตามด้วยนามสกุล\nเข่น สมพร พร้อมมูล อีกครั้งครับ";
		                                replyText(replyToken, replyMessage);
		                                updateSession(userId, "userMode", "promptpayNames");
		                            }
		                        });
	                        } else {
                                updateSession(userId, "promptpayNo", promptpayNames);
                                replyMessage = "โอเค ขอบคุณมากครับ สำหรับข้อมูลที่จะนำไปสร้างคิวอาร์โค้ด\nผมจะดำเนินการสร้างคิวอาร์โค้ดให้ครับ โปรดรอสักครู่...";
                    			replyText(replyToken, replyMessage);                                
        			            getSession(userId, "promptpayNo").then(function(promptpayNo) {
                                    var accountNo = promptpayNo;
                                    const createOtherQRCode = require('./createOtherQRCode');
                                    const apiSublink = "line";
                                    var imageFileExName = '.png';
                                    var filename = '';
                                    var totalCharge = 0;
                                    var accountName = promptpayNames;
                                    const newsavedata = require('./lib/newsavedata.js');
                                    newsavedata.doSaveData(apiSublink, userId, qrType, accountNo, accountName, Number(totalCharge), filename, 'Y', 'N').then(function(newid) {
                                        console.log(colors.blue("newid : ") + colors.yellow(newid));
                                        const nextSeqNo = require('./lib/nextSeqNo.js');
                                        filename = 'OTH-' + nextSeqNo(newid) + imageFileExName;
                                        createOtherQRCode(qrType, accountNo, accountName, apiSublink, filename, newid, function(imageLink) {
                                            pushImage(userId, imageLink, imageLink).then(function(code) {
                                                var question = 'หากยังต้องการสร้างพร้อมเพย์คิวอาร์โค้ด(รวมทั้งคิวอาร์โค้ดที่ไม่ใช่พร้อมเพย์)อีก เชิญเลือกประเภทพร้อมเพย์ได้เลย';
                                                question = question.concat('\nหากไม่มีประเภทพร้อมเพย์ขึ้นให้เลือก พิมพ์ qr หรือ QR ส่งเข้ามาใหม่ได้เลยครับ\nหากต้องการสแกนคิวอาร์โค้ด พิมพ์ scan เข้ามาครับ');
                                                question = question.concat('\nหรือหากมีปัญหาการใช้งานใดๆ พิมพ์เครื่องหมายดอกจันทร์(*)แล้วตามด้วยข้อความที่ต้องการแจ้งปัญหาครับ');
                                                pushPostBack(userId, postBackSelectQRType(question));
                                                deleteSession(userId);
                                            });
                                        });
                                    });
                                });
			                }
                        });
                    } else { 
                        if ((userText.search("ขอบคุณ") >= 0) | (userText.search("สุดยอด") >= 0)) {
                            logger().info("* " + " >> " + userId + " >> " + userText + " >> " + new Date());
                            replyMessage = "ด้วยความยินดีครับ\nหากเห็นว่า Mr.QR มีประโยชน์ ก็รบกวนช่วยแชร์ต่อๆ กันไปก็พอครับ คนอื่นจะได้มาใช้ด้วย\n";
                            replyMessage = replyMessage.concat('\nหากยังต้องการสร้างพร้อมเพย์คิวอาร์โค้ดอีก เชิญเลือกประเภทพร้อมเพย์ได้เลย');
                            replyMessage = replyMessage.concat('\nหากไม่มีประเภทพร้อมเพย์ขึ้นให้เลือก พิมพ์ qr หรือ QR ส่งเข้ามาใหม่ได้เลยครับ');
                            replyMessage = replyMessage.concat('\nหรือหากมีปัญหาการใช้งานใดๆ พิมพ์เครื่องหมายดอกจันทร์(*)แล้วตามด้วยข้อความที่ต้องการแจ้งปัญหาครับ');
                            replyPostBack(replyToken, postBackSelectQRType(replyMessage));
                        } else if (userText.charAt(0) === "*") {
                            logger().info("* " + " >> " + userId + " >> " + userText + " >> " + new Date());
                            replyMessage = "ขอบคุณมากเลยครับ\nแล้วผมจะแจ้งให้เจ้านายของผมติดต่อกลับไปโดยเร็วที่สุดครับ";
                            replyMessage = replyMessage.concat('\nหากยังต้องการสร้างพร้อมเพย์คิวอาร์โค้ดอีก เชิญเลือกประเภทพร้อมเพย์ได้เลย');
                            replyMessage = replyMessage.concat('\nหากไม่มีประเภทพร้อมเพย์ขึ้นให้เลือก พิมพ์ qr หรือ QR ส่งเข้ามาใหม่ได้เลยครับ');
                            replyMessage = replyMessage.concat('\nหรือหากมีปัญหาการใช้งานใดๆ พิมพ์เครื่องหมายดอกจันทร์(*)แล้วตามด้วยข้อความที่ต้องการแจ้งปัญหาครับ');
                            replyPostBack(replyToken, postBackSelectQRType(replyMessage));
                        } else {
                            logger().info("* " + " >> " + userId + " >> " + userText + " >> " + new Date());
                            replyMessage = "ผมไม่เข้าใจคำสั่งครับ\nหากต้องการสร้างพร้อมเพย์คิวอาร์โค้ดเชิญเลือกประเภทพร้อมเพย์ที่ต้องการสร้างได้เลย\nผมรับทำให้ด้วยความยินดีครับ";
                            replyPostBack(replyToken, postBackSelectQRType(replyMessage));
                        }
                    }
                });
            }

		} else if (req.body.events[0].message.type == 'image') {
			var imageId = req.body.events[0].message.id;
			//console.log(colors.blue("check: ") + colors.blue(imageId));
			imageMessageHandle(userId, replyToken, imageId);
			updateSession(userId, "userMode", "uploadqr");
        } else {
            logger().info("* " + userId + " >> " + req.body.events[0].message.text + " >> " + new Date());
            replyMessage = "ผมไม่เข้าใจคำสั่งครับ\nหากต้องการสร้างพร้อมเพย์คิวอาร์โค้ดเชิญเลือกประเภทพร้อมเพย์ที่ต้องการสร้างได้เลย\nผมรับทำให้ด้วยความยินดีครับ";
            replyPostBack(replyToken, postBackSelectQRType(replyMessage));
        }
    } else if (req.body.events[0].type == 'postback') {
        //Postback
        if (req.body.events[0].postback) {
            var cmds = req.body.events[0].postback.data.split("&");
            var cmdid = cmds[1].split("=");
            var action = cmds[0].split("=");
            var promptpayType;
            var qrType;
            if (action[1] == 'buy') {
                if (cmdid[1] === "01") {
                    promptpayType = "หมายเลขโทรศัพท์";
                    qrType = "01";
                    updateSession(userId, "qrType", qrType);
                    updateSession(userId, "promptpayType", promptpayType);
                    updateSession(userId, "userMode", "promptpayNo");
                    doShowLastFive(replyToken, userId, qrType);
                } else if (cmdid[1] === "02") {
                    promptpayType = "หมายเลขประจำตัวประชาชน";
                    qrType = "02";
                    updateSession(userId, "qrType", qrType);
                    updateSession(userId, "promptpayType", promptpayType);
                    updateSession(userId, "userMode", "promptpayNo");
                    doShowLastFive(replyToken, userId, qrType);
                } else if (cmdid[1] === "03") {
                    promptpayType = "หมายเลข e-Wallt";
                    qrType = "03";
                    updateSession(userId, "qrType", qrType);
                    updateSession(userId, "promptpayType", promptpayType);
                    updateSession(userId, "userMode", "promptpayNo");
                    doShowLastFive(replyToken, userId, qrType);
                } else if (cmdid[1] === "04") {
                    var question = 'โอเค\n' + 'เชิญเลือกประเภทพร้อมเพย์ใหม่อีกครั้งครับ และป้อนข้อมูลด้วยความระมัดระวังนะครับ';
                    replyPostBack(replyToken, postBackSelectQRType(question));
                } else if (cmdid[1] === "05") {
                    replyMessage = "โปรดรอสักครู่... \nผมจะดำเนินการสร้างพร้อมเพย์คิวอาร์โค้ดให้ครับ";
                    replyText(replyToken, replyMessage);
                    getSession(userId, "qrType").then(function(userqrType) {
                        getSession(userId, "promptpayNo").then(function(promptpayNo) {
                            getSession(userId, "promptpayFName").then(function(promptpayFName) {
                                getSession(userId, "promptpayLName").then(function(promptpayLName) {
                                    getSession(userId, "payAmount").then(function(payAmount) {
                                        var accountNo = promptpayNo;
                                        var accountName = promptpayFName + " " + promptpayLName;
                                        var totalCharge = payAmount;
                                        const createPromptpayQRCode = require('./createPromptpayQRCode');
                                        const apiSublink = "line";
                                        var imageFileName = accountNo + "_" + totalCharge + new Date().getTime();
                                        var imageFileExName = '.png';
                                        var filename = imageFileName + imageFileExName;
                                        const newsavedata = require('./lib/newsavedata.js');
                                        newsavedata.doSaveData(apiSublink, userId, userqrType, accountNo, accountName, Number(totalCharge), filename, 'Y', 'N').then(function(newid) {
                                            console.log(colors.blue("newid : ") + colors.yellow(newid));
                                            createPromptpayQRCode(userqrType, accountNo, accountName, totalCharge, apiSublink, filename, newid, function(imageLink) {
                                                pushImage(userId, imageLink, imageLink).then(function(code) {
                                                    //const createPromptpayQRCodePDF = require('./createPromptpayQRCodePDF');
                                                    //createPromptpayQRCodePDF(qrType, accountNo, accountName, totalCharge, apiSublink, filename, function(pdfLink) {
                                                    // var question = "ดาวน์โหลดพร้อมเพย์คิวอาร์โค้ดของคุณเพื่อพิมพ์ออกทางเครื่องพิมพ์ได้ที่\n" + pdfLink;
                                                    var question = "";
                                                    question = question.concat('\nหากยังต้องการสร้างพร้อมเพย์คิวอาร์โค้ด(รวมทั้งคิวอาร์โค้ดที่ไม่ใช่พร้อมเพย์)อีก เชิญเลือกประเภทพร้อมเพย์ได้เลย');
                                                    question = question.concat('\nหากไม่มีประเภทพร้อมเพย์ขึ้นให้เลือก พิมพ์ qr หรือ QR ส่งเข้ามาใหม่ได้เลย\nหากต้องการสแกนคิวอาร์โค้ด พิมพ์ scan เข้ามาครับ');
                                                    question = question.concat('\nหรือหากมีปัญหาการใช้งานใดๆ พิมพ์เครื่องหมายดอกจันทร์(*)แล้วตามด้วยข้อความที่ต้องการแจ้งปัญหาครับ');
                                                    pushPostBack(userId, postBackSelectQRType(question));
                                                    deleteSession(userId);
                                                    //const savedata = require('./lib/savedata');
                                                    //savedata('line', userId, qrType, accountNo, accountName, Number(totalCharge), filename, 'Y', 'Y');
                                                    //});
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                } else if (cmdid[1] === "09") {
                	/*other type do not show last five time */
                    promptpayType = "คิวอาร์โค้ดที่ไม่ใช่พร้อมเพย์";
                    qrType = "09";
                    updateSession(userId, "qrType", qrType);
                    updateSession(userId, "promptpayType", promptpayType);
                    updateSession(userId, "userMode", "promptpayNo");
					replyMessage = 'โป้อนข้อมูลที่จะนำมาสร้างคิวอาร์โค้ดได้เลยครับ';
                    replyText(replyToken, replyMessage).then(function(dataRes) {					
			            updateSession(userId, "qrType", qrType);
			            updateSession(userId, "promptpayType", promptpayType);
			            updateSession(userId, "userMode", "promptpayNo");
				    });
                } else if (cmdid[1] === "11") {
                    const qrExamleLink = "https://www.myshopman.com/api/line/img/qrExample.png";
                    replyImage(replyToken, qrExamleLink, qrExamleLink).then(function(code) {
                        var question = 'นั่นคือตัวอย่างรูปคิวอาร์โค้ดที่จะนำมาให้ผมสแกน\n';
                        question = question.concat('โปรดอย่าให้มีอย่างอื่นที่ไม่ใช่คิวอร์โค้ดปะปนเข้ามาในรูป ไม่อย่างนั้นจะทำให้อ่านข้อมูลไม่ถูกต้อง\n');
                        question = question.concat('หากเข้าใจรูปแบบคิวอาร์โค้ดสำหรับสแกนแล้ว โปรดเลือกแหล่งที่มาของรูปคิวอาร์โค้ดได้เลยครับ\n');
                        question = question.concat('แกลอรี คือคลังรูปภาพในเครื่องของคุณ ส่วน กล้อง คือการถ่ายรูปคิวอาร์โค้ดด้วยกล้องของโทรศัพท์มือถือครับ\n');
                        pushPostBack(userId, postBackSelectScanType(question));
                    });
                } else if (cmdid[1] === "12") {
                    var introduct = 'เชิญเลือกรูปภาพคิวอาร์โค้ดจากคลังรูปภาพของคุณครับ';
                    replyPostBack(replyToken, postBackSelectCameraRoll(introduct));
                } else if (cmdid[1] === "13") {
                    var introduct = 'เชิญถ่ายรูปคิวอาร์โค้ดจากกล้องของคุณครับ';
                    replyPostBack(replyToken, postBackSelectCamera(introduct));
                }
            } else if (action[1] == 'sel') {
                //"action=sel&itemid=" + currentCmdCode + "&accno=" + item.accountno + "&accname=" + item.accountname,
                var accno = cmds[2].split("=");
                var accname = cmds[3].split("=");
                var accnameLF = accname[1].split(" ");
                updateSession(userId, "promptpayNo", accno[1]);
                updateSession(userId, "promptpayFName", accnameLF[0]);
                updateSession(userId, "promptpayLName", accnameLF[1]);
                replyMessage = "ขอบคุณมากครับ สำหรับข้อมูลพร้อมเพย์ที่คุณเลือกคือ\n" + "หมายเลขพร้อมเพย์ " + accno[1] + "\nชื่อบัญชีพร้อมเพย์ " + accnameLF[0] + " " + accnameLF[1] + "\n สุดท้ายแล้วครับ ผมขอรบกวนช่วยป้อนยอดจำนวนเงิน(บาท) ที่ต้องการโอนครับ\n(พิมพ์แต่ตัวเลขจำนวนเงิน(บาท) เช่น 100, 250.50, 1000 หรือ 2525.75 แบบนี้เป็นต้น ครับ)\nในกรณีที่ต้องการให้ผู้โอนเงินระบุจำนวนเงินเอง ให้พิมพ์เลข 0 เข้ามาครับ";
                updateSession(userId, "userMode", "payAmount");
                replyText(replyToken, replyMessage);
                //pushPostBack(userId, {type: 'text', text: replyMessage});
            }
        }
    } else if (req.body.events[0].type == 'follow') {
        replyPostBack(replyToken, postBackSelectQRType());
    } else {}
});
const doShowLastFive = function(replyToken, userId, type) {
    var replyMessage;
    const loaddata = require('./lib/loaduserqrdata');
    getSession(userId, "promptpayType").then(function(promptpayType) {
        loaddata(userId, type).then(function(resdata) {
            if (myModule.isEmptyObject(resdata)) {
                if (type === "01") {
                    replyMessage = "งั้น ผมขอทราบหมายเลขโทรศัพท์เลยครับ (พิมพ์เฉพาะหมายเลขโทรศัพท์อย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 0801254466 แบบนี้เป็นต้น)";
                } else if (type === "02") {
                    replyMessage = "งั้น ผมขอทราบหมายเลขประจำตัวประชาชนเลยครับ (พิมพ์เฉพาะหมายเลขประจำตัวประชาชนอย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 1900900999900 แบบนี้เป็นต้น)";
                } else if (type === "03") {
                    replyMessage = "งั้น ผมขอทราบหมายเลข e-Wallt เลยครับ (พิมพ์เฉพาะหมายเลข e-Wallt อย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 180000862221213 แบบนี้เป็นต้น)";
                }
                replyText(replyToken, replyMessage);
            } else {
                if (type === "01") {
                    replyMessage = "พิมพ์หมายเลขโทรศัพท์เข้ามาได้เลยครับ (พิมพ์เฉพาะหมายเลขโทรศัพท์อย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 0801254466 แบบนี้เป็นต้น)";
                } else if (type === "02") {
                    replyMessage = "พิมพ์หมายเลขประจำตัวประชาชนเข้ามาได้เลยครับ (พิมพ์เฉพาะหมายเลขประจำตัวประชาชนอย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 1900900999900 แบบนี้เป็นต้น)";
                } else if (type === "03") {
                    replyMessage = "พิมพ์หมายเลข e-Wallt เข้ามาได้เลยครับ (พิมพ์เฉพาะหมายเลข e-Wallt อย่างเดียวนะครับ ไม่ต้องมีตัวอักษร ไม่ต้องมีขีด หรืออื่นๆ ปนเข้ามา เช่น 180000862221213 แบบนี้เป็นต้น)";
                }
                createPromptpayObject(resdata).then(function(ob) {
                    var intro = {
                        type: 'text',
                        text: 'ด้านล่างนั่นคือ ' + ob.length + ' รายการพร้อมเพย์ประเภท ' + promptpayType + ' ล่าสุด ที่คุณเคยสร้างไว้\nหากต้องการหมายเลขใดคลิกที่หมายเลขนั้น\nหากไม่มีหมายเลขพร้อมเพย์ที่ต้องการปรากฎให้เลือก\n' + replyMessage
                    }; //คลิกเลือก พิมพ์ใหม่ (ล่างสุด)ได้เลยครับ
                    pushPostBack(userId, intro).then(function(dataRes) {
                        console.log(colors.blue("create ob : ") + colors.yellow(JSON.stringify(ob)));
                        var bubble = createBubbleSelect(ob, type);
                        //console.log(colors.blue("create Bubble : ") + colors.yellow(JSON.stringify(bubble)));
                        //pushPostBack(userId, bubble);
                        //replyText(replyToken, replyMessage);
                        replyPostBack(replyToken, bubble);
                        updateSession(userId, "qrType", type);
                        updateSession(userId, "promptpayType", promptpayType);
                        updateSession(userId, "userMode", "promptpayNo");
                    });
                });
            }
        });
    });
}
const replyPostBack = (token, postBackObject) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/reply",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                replyToken: token,
                messages: [postBackObject]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
}
const pushMessage = (userid, msg) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/push",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                to: userid,
                messages: [{
                    type: "text",
                    text: msg
                }]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
}
const pushImage = (userid, originURL, previewURL) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/push",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                to: userid,
                messages: [{
                    type: "image",
                    originalContentUrl: originURL,
                    previewImageUrl: previewURL
                }]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
}
const replyImage = (replyToken, originURL, previewURL) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/reply",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                replyToken: replyToken,
                messages: [{
                    type: "image",
                    originalContentUrl: originURL,
                    previewImageUrl: previewURL
                }]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
}
const pushPostBack = (userid, postBackObject) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/push",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                to: userid,
                messages: [postBackObject]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
}
const replyText = (token, message) => {
    return new Promise(function(resolve, reject) {
        request({
            method: 'POST',
            uri: lineqrconstlib.LINE_MESSAGING_API + "/reply",
            headers: lineqrconstlib.LINE_HEADER,
            body: JSON.stringify({
                replyToken: token,
                messages: [{
                    type: 'text',
                    text: message
                }]
            })
        }, (err, res, body) => {
            if (!err) {
                resolve({code: 200});
            } else {
                reject(err);
            }
        });
    });
};
const postBackSelectQRType = (question) => {
    return {
        type: "text",
        text: (question) ? question : "ผม Mr.QR สวัสดีและยินดีให้บริการ\n" + "เชิญเลือกประเภทพร้อมเพย์ก่อนเลยครับ\nคุณต้องการสร้างพร้อมเพย์คิวอาร์โค้ดจากหมายเลขประเภทไหน?",
        quickReply: {
            items: [{
                type: "action",
                action: {
                    type: "postback",
                    label: "เบอร์โทรศัพท์",
                    data: "action=buy&itemid=01",
                    displayText: "TELEPHONENO"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "บัตรประชาชน",
                    data: "action=buy&itemid=02",
                    displayText: "CITIZENTNO"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "e-Wallet",
                    data: "action=buy&itemid=03",
                    displayText: "EWALLETNO"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "คิวอาร์อื่นๆ",
                    data: "action=buy&itemid=09",
                    displayText: "OTHER"
                }
            }]
        }
    }
};
const postBackSelectScanType = (question) => {
    return {
        type: "text",
        text: (question) ? question : "ผม Mr.QR มีความยินดีให้บริการ\n" + "เชิญเลือกวิธีสแกนรูปคิวอาร์โค้ดของคุณเลยครับ\nคุณสามารถดูรูปแบบตัวอย่างคิวอาร์โค้ดที่จะนำมาสแกนได้จากเมนู ดูตัวอย่าง\nแกลอรี คือคลังรูปภาพในเครื่องของคุณ ส่วน กล้อง คือการถ่ายรูปคิวอาร์โค้ดด้วยกล้องของโทรศัพท์มือถือครับ",
        quickReply: {
            items: [{
                type: "action",
                action: {
                    type: "postback",
                    label: "ดูตัวอย่าง",
                    data: "action=buy&itemid=11",
                    displayText: "QR-EXAMPLE"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "แกลอรี่",
                    data: "action=buy&itemid=12",
                    displayText: "GALLORY"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "กล้อง",
                    data: "action=buy&itemid=13",
                    displayText: "CAMERA"
                }
            }]
        }
    }
};
const postBackSelectCamera = (question) => {
    return {
        "type": "text",
        "text": (question) ? question : "ถ่ายรูปคิวอาร์โค้ดด้วยกล้องในโทรศัพท์มือถือของคุณครับ",
        "quickReply": {
            "items": [{
                "type": "action",
                "action": {
                    "type": "camera",
                    "label": "เปิดกล้อง"
                }
            }]
        }
    }
}
const postBackSelectCameraRoll = (question) => {
    return {
        "type": "text",
        "text": (question) ? question : "เลือกรูปคิวอาร์โค้ดในคลังรูปภาพของคุณครับ",
        "quickReply": {
            "items": [{
                "type": "action",
                "action": {
                    "type": "cameraRoll",
                    "label": "เปิดคลังรูปภาพ"
                }
            }]
        }
    }
}
const postBackConfirmYesNo = (question) => {
    return {
        type: "text",
        text: (question) ? question : "ข้อมูลถูกต้องไหมครับ?\nโปรดยืนยันความถูกต้องด้วยการเลือก ถูกต้อง หรือ ขอแก้ไข หากไม่ถูกต้อง",
        quickReply: {
            items: [{
                type: "action",
                action: {
                    type: "postback",
                    label: "ถูกต้อง",
                    data: "action=buy&itemid=05",
                    displayText: "YES"
                }
            }, {
                type: "action",
                action: {
                    type: "postback",
                    label: "ขอแก้ไข",
                    data: "action=buy&itemid=04",
                    displayText: "NO"
                }
            }]
        }
    }
};

function createPromptpayObject(items) {
    var pparr = [];
    //console.log(colors.blue("check buble input object: ") + colors.green(JSON.stringify(items)));
    return new Promise(function(resolve, reject) {
        items.forEach(function(item) {
            var accountNo = item.accountno;
            var found = myModule.searchAccountno(pparr, accountNo);
            if (found.length == 0) {
                const ppob = {};
                ppob.id = item.id;
                ppob.accountno = item.accountno;
                ppob.accountname = item.accountname;
                ppob.totalcharge = item.totalcharge;
                pparr.push(ppob);
            }
        });
        resolve(pparr);
    });
}
const createBubbleSelect = (items, currentCmdCode) => {
    //console.log(colors.blue("buble item: ") + colors.green(JSON.stringify(items)));
    var bubbleItems = []
    items.forEach(function(item) {
        var ob = {
            type: "button",
            style: "primary",
            action: {}
        };
        ob.action.type = "postback";
        ob.action.label = item.accountno + " - " + item.accountname,
        ob.action.data = "action=sel&itemid=" + currentCmdCode + "&accno=" + item.accountno + "&accname=" + item.accountname,
        ob.action.displayText = item.accountno + " - " + item.accountname,
        bubbleItems.push(ob);
    });
    return {
        "type": "flex",
        "altText": "This is a Flex message",
        "contents": {
            "type": "bubble",
            "body": {
                "type": "box",
                "layout": "vertical",
                "spacing": "md",
                "contents": bubbleItems
            }
        }
    };
}
const imageMessageHandle = (userId, replyToken, imageId) => {
	const currentDir = path.normalize(__dirname);
	const userUploadPath = currentDir + '/userupload/';
	const imageFileExName = '.png';
	var imagePath = userUploadPath  + imageId + imageFileExName;
	let tempPath = "/home/sasurean/node/src/imgs/ex2.png";
	saveUserImagePost(imageId, imagePath).then(async function (ResCode) {
		if (ResCode.code == 200) {
			var Jimp = require("jimp");
			var buffer = await fs.readFileSync(imagePath);
			Jimp.read(buffer, async function(err, image) {
			    if (err) {
			        console.error("File Error => " + err);
			    }
				var QrCode = require('qrcode-reader');    
			    var qr = new QrCode();
			    const value = await new Promise((resolve, reject) => {
				    qr.callback = function(err, qrcode) {
				        if (err) {
				            console.error("QR Error => " + err);
				            reject(err);
				            //resolve(qrcode);
				        } else {
		                    resolve(qrcode);
	                    }			        
				    };
				    qr.decode(image.bitmap);
				}).catch((err) => { /*ปััญหาเรื่องการ catch error ต้องแก้ไข ในกรณีเกิด err จะทำให้บล็อคถัดไป if (value.result) { คือ value เป็น null*/
					replyPostBack(replyToken, postBackSelectScanType('ขออภัยด้วยครับ\nผมไม่สามารถอ่านคิวอาร์โค้ดจากรูปได้ โปรดลองใหม่อีกครั้งครับ'));
			    });
				//console.log(value);
				if (value) {
					var scanResult = value.result;
					console.log(colors.blue("scanResult : ") + colors.yellow(scanResult));					
					var parser = require('promptpay-emvco-parser');
					try {
						var info = parser(scanResult);
						if (info) {
							var promptpayType = '';
							if (info.MerchantAccountInformation.merchantInfo.promptpayIdType == 'MobileNumber') {
								promptpayType = 'หมายเลขโทรศัพท์';
							} else if (info.MerchantAccountInformation.merchantInfo.promptpayIdType == 'TaxId') {
								promptpayType = 'หมายเลขประจำตัวประชาชน';
							} else if (info.MerchantAccountInformation.merchantInfo.promptpayIdType == 'EWalletId') {
								promptpayType = 'e-Wallt';
							}							
							scanResult = scanResult.concat('\n');
							scanResult = scanResult.concat('ประเภทพร้อมเพย์ : ' + promptpayType);				
							scanResult = scanResult.concat('\n');
							scanResult = scanResult.concat('หมายเลขพร้อมเพย์ : ' + info.MerchantAccountInformation.merchantInfo.promptpayNumber);				
							if (info.TransactionAmount.data) {
								scanResult = scanResult.concat('\n');
								scanResult = scanResult.concat('ยอดโอน จำนวน : ' + info.TransactionAmount.data + ' บาท');				
							}
							//scanResult = scanResult.concat(info);
			                //console.log(colors.blue("qr-info : ") + colors.yellow(JSON.stringify(info)));	
							var resuleMsg = 'ภาพที่ส่งมาสแกนเป็นคิวอาร์โค้ดและเป็นพร้อมเพย์ซึ่งมีข้อมูลดังนี้ครับ\n';
							resuleMsg = resuleMsg.concat(scanResult);
							resuleMsg = resuleMsg.concat('\n');
							resuleMsg = resuleMsg.concat('หากว่ายังต้องการสแกนคิวอาร์โค้ดอีกเชิญเลือกแหล่งที่มาของภาพจากเมนู\nหากต้องการสร้างคิวอาร์โค้ดใหม่พิมพ์ qr เข้ามาครับ');
							replyPostBack(replyToken, postBackSelectScanType(scanResult));
						} else {
							var resuleMsg = 'ภาพที่ส่งมาสแกนเป็นคิวอาร์โค้ดแต่ไม่ใช่พร้อมเพย์ครับ\n';
							resuleMsg = resuleMsg.concat('ข้อมูลที่บรรจุอยู่ภายในคิวอาร์โค้ดคือ\n')
							resuleMsg = resuleMsg.concat(scanResult);
							resuleMsg = resuleMsg.concat('\n');
							resuleMsg = resuleMsg.concat('หากว่ายังต้องการสแกนคิวอาร์โค้ดอีกเชิญเลือกแหล่งที่มาของภาพจากเมนู\nหากต้องการสร้างคิวอาร์โค้ดใหม่พิมพ์ qr เข้ามาครับ');
							replyPostBack(replyToken, postBackSelectScanType(resuleMsg));
						}
					}
					catch(err) {
					  console.log('Parser Error => ' + err.message);
					}
					finally { /* เกิด error ที่นี่ เพราะ finally ก็จะใช้ replyToken ส่งด้วย*/
						var resuleMsg = 'ภาพที่ส่งมาสแกนเป็นคิวอาร์โค้ดแต่ไม่ใช่พร้อมเพย์ครับ\n';
						resuleMsg = resuleMsg.concat('ข้อมูลที่บรรจุอยู่ภายในคิวอาร์โค้ดคือ\n\n')
						resuleMsg = resuleMsg.concat(scanResult);
						resuleMsg = resuleMsg.concat('\n\n');
						resuleMsg = resuleMsg.concat('หากว่ายังต้องการสแกนคิวอาร์โค้ดอีกเชิญเลือกแหล่งที่มาของภาพจากเมนู\nหากต้องการสร้างคิวอาร์โค้ดใหม่พิมพ์ qr เข้ามาครับ');
						replyPostBack(replyToken, postBackSelectScanType(resuleMsg));
					}						
				} else {
					var errorMsg = 'ภาพที่ส่งมาสแกนไม่ใช่คิวอาร์โค้ดครับ\nถ้าต้องการสแกนอีกครั้งเชิญเลือกแหล่งที่มาของภาพจากเมนู\nหากต้องการสร้างคิวอาร์โค้ดใหม่พิมพ์ qr เข้ามาครับ';
					replyPostBack(replyToken, postBackSelectScanType(errorMsg));
				}			
			});

		}
	});
}
const saveUserImagePost = (imageId, localFileName) => {
	return new Promise(function(resolve, reject) {
		const https = require('https');
		const writeStream = fs.createWriteStream(localFileName);
		const options = {
		  hostname: 'api.line.me',
		  port: 443,
		  path: '/v2/bot/message/' + imageId + '/content',
		  method: 'GET',
		  headers: lineqrconstlib.LINE_HEADER
		};
		const req = https.request(options, (res) => {
			//console.log(colors.blue("statusCode: ") + colors.white(res.statusCode));	
			res.pipe(writeStream);
			setTimeout(() => {
				resolve({code: 200});
			}, 800);
		});

		req.on('error', (error) => {
			reject(error);
		});
		req.end();
	});
}

/* ต
	Thank you author of this blog very mush. For idea that give me a new life.
	https://quantizd.com/building-facebook-messenger-bot-with-nodejs/
	Start node qr.js as service
	pm2 start node lineqr.js
	Stop
	pm2 list
	pm2 stop app_name_or_id
	Restart
	pm2 restart app_name_or_id
	https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-16-04
*/
/*
	kill node process
	ps aux | grep node
	Find the process ID (second from the left):

	kill -9 PROCESS_ID
	This may also work

	killall node
*/
/*
scp /cygdrive/e/nodep/server.js sasurean@202.28.68.6:/home/sasurean/nodejs
scp /cygdrive/e/nodep/hosts sasurean@202.28.68.6:/etc/hosts

curl -X GET -H "Content-Type:application/json" -H "X-MyHeader: 123" http://202.28.68.6/shop/api -d '{"text":"something"}'
curl -X POST -H "Content-Type:application/json" -H "X-MyHeader: 123" http://202.28.68.6/qrimage -d '{"accountNo": "140000835077746", "accountName": "นายประเสริฐ สุดชดา", "totalCharge": "377.12"}'

/etc/init.d/apache2 restart
service apache2 restart


cd nodejs
node server.js

Navigate to folder and
chmod -R 777 .
*/