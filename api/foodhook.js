//foodhook.js

const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const path = require("path");
const parentDir = path.normalize(__dirname+"/..");

const request = require('request-promise');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const redis = require('redis');
const sessionHolders = redis.createClient(); 
const app = express();

const db = require('../lib/pgpool.js');
const pool = db.getPool();

const lineconnector = require("../lib/lineapiconnect.js");
const dbman = require("../lib/dbmanager.js");
const myModule = require("../lib/myModule.js");
const logger = require('../lib/logger');

const mainmenu = [{id: 'x101', name: 'เมนูอาหาร'}, {id: 'x102', name: 'เช็คบิล'}, {id: 'x103', name: 'รายละเอียดร้าน'}, {id: 'x104', name: 'ขอแผนที่'}, {id: 'x105', name: 'วิธีใช้งาน'}];
const backmenu = [{id: 'x201', name: 'กลับ'}];
const othermenu = [{id: 'x301', name: 'เลือกอย่างอื่นเพิ่ม'}, {id: 'x302', name: 'สั่งออเดอร์'}, {id: 'x303', name: 'กลับ'}];
const ordertypemenu = [{id: 'x401', name: 'รับประทานที่ร้าน'}, {id: 'x402', name: 'สั่งกลับบ้าน'}];
const orderoptionmenu = [{id: 'x501', name: 'สั่งตอนนี้'},	{id: 'x502', name: 'สั่งล่วงหน้า'}];

const liff_bof = "line://app/1559859637-5A6yzxDQ";
const liff_foodreview = "line://app/1559859637-rw42LRxb";
const liff_shopreview = "line://app/1566943098-Raj7dNJ0";


/*********************************************/
/* Manage Session */
sessionHolders.on('connect', function(data) {
    console.log(colors.green('Redis client connected'));
});

sessionHolders.on('error', function (err) {
    console.log(colors.red('Something went wrong on Redis ' + err));
});

function updateSession(key, field, value){
	sessionHolders.hset("\"" + key + "\"", field, value);	
}

function getSession(key, field){
	return new Promise(function(resolve, reject) {
		sessionHolders.hget("\"" + key + "\"", field, function (error, value) {	
			if (error) {	
				console.log(error); reject(error);	
			} else {
				//console.log('GET result ->' + colors.yellow(value));
				resolve(value);
			}
		});
	});
}

function deleteSession(key){
	sessionHolders.del("\"" + key + "\"");	
}

function deleteSessionField(key, field){
	sessionHolders.del("\"" + key + "\"", field);	
}

function getTokenBot(destination) {
	return new Promise(function(resolve, reject) {
		/* shopid=2 */
		//resolve("0XaCrO3l8nq+MoHLAMIUfStt2s0NnuoAjCf5j9DmM3aLfE4MvFOzztRIRgI7F+FmCHknbWbQg2IrJs8DVwrM4a+dfJTMxFr8z293fnQkjUv4FdVbP1QAYyu9qwCO66I5exSPDeiKabiFZF/i61wkPAdB04t89/1O/w1cDnyilFU=");
		/* shopid=3 */
		//resolve("G15G8sB4p5G+Vp7B06c6VD3YqM3oX7FHjKvjfdHzNEvo80aQOatPZ+FB4zaM+Y9djB3+XhqGv77hoiY106sOyMD+UgazUPn5KnqLt6A53sbI+nPEYPJgamLWNCinTptJff65bEULmscUvNpMF1sz9wdB04t89/1O/w1cDnyilFU=");

		getSession(destination, "token").then(function(botToken){
			//console.log("destination :: " + colors.yellow(destination));
			if(botToken) {
				resolve(botToken);
			} else {
				dbman.loadToken(destination).then(function(botToken){
					updateSession(destination, "token", botToken[0].token);
					updateSession(destination, "shopid", botToken[0].shopid);
					resolve(botToken[0].token);
				});
			}
		});

	});
}
/*********************************************/

app.get('/', function(req, res) {
	console.log("req.query " + colors.yellow(JSON.stringify(req.query)));
	logger().info(new Date()  + " >> req.query>> " + JSON.stringify(req.query));
	res.status(200).send("OK");
});

app.post('/', function(req, res) {
	console.log("req.body " + colors.yellow(JSON.stringify(req.body)));
	logger().info(new Date()  + " >> req.body>> " + JSON.stringify(req.body));
	let replyToken = req.body.events[0].replyToken;
	let userId = req.body.events[0].source.userId;
	let destination = req.body.destination;
	let replyMessage;
	var question;
	if (req.body.events[0].type === 'message') {
		if (req.body.events[0].message.type === 'text') {
			var userText = req.body.events[0].message.text;
			textMessageHandle(userId, replyToken, userText, req, res);
		} else if (req.body.events[0].message.type == 'image') {
			//verify Customer Image Slip
			var imageId = req.body.events[0].message.id;
			//console.log(colors.blue("check: ") + colors.blue(imageId));
			imageMessageHandle(userId, replyToken, destination, imageId);
		} else {

		}
	} else if (req.body.events[0].type == 'postback') {
		var cmds = req.body.events[0].postback.data.split("&");
		postbackMessageHandle(userId, replyToken, cmds, req);
	} else if (req.body.events[0].type == 'follow') {
		getTokenBot(destination).then(function(botToken) {
			getSession(destination, "shopid").then(function(shopid){
				dbman.doLoadShopName(shopid).then(function(shopName){
					lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
						var userProfile = JSON.parse(userdata);
						var displayName = userProfile.displayName;
						dbman.doSaveSubscribe(userId, displayName).then(function(code) {
							var intro = "สวัสดีครับคุณ " + displayName + "\n" + shopName[0].name + " เป็นเกียรติอย่างยิ่งที่ได้รับใช้คุณ\nโปรดเลือกทำรายการจากเมนูด้านล่างได้เลยครับ";
							lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(intro, mainmenu));
							sessionHolders.del("\"" + userId + "\"");
							updateSession(userId, "tempMode", "normal");
						});
					});
				});
			});
		});
	} else {

	}
});

app.get('/userprofile/(:userId)/(:destination)', function(req, res) {
	var userId = req.params.userId;
	var destination = req.params.destination;
	//console.log('userId : ', userId);
	getTokenBot(destination).then(function(botToken) {
		lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
			var userProfile = JSON.parse(userdata);
			var displayName = userProfile.displayName;
			var pictureUrl = userProfile.pictureUrl;
			//console.log('userProfile : ', JSON.stringify(userProfile));
			res.status(200).send({displayName: displayName, pictureUrl: pictureUrl});
		});
	});
});

app.get('/orderviews/(:shopid)', function(req, res) {
	var shopid = req.params.shopid;
	sessionHolders.keys("*", function (err, keys) {
		var promiseList = new Promise(function(resolve,reject){
			var orders = [];
			if (err) return console.log(err);
			keys.forEach(function(key){
				sessionHolders.hgetall(key, function (err, result) {
					if(result.tempOrder) {
						var order = result;
						order.userId = key;
						//console.log("order -> " + JSON.stringify(order));
						orders.push(order);
						myModule.delay(450);
					}
				});
			});
			setTimeout(()=>{
				resolve(orders);
			},1200);
		});
		Promise.all([promiseList]).then((ob)=>{
			res.status(200).send(ob[0]);
		});
	});       
});

app.get('/deleteorder/(:lpsid)', function(req, res) {
	var key = req.params.lpsid;
	deleteSessionField(key, "tempOrder");
	res.status(200).send({code: 200});
});

app.get('/deleteorderitem/(:lpsid)/(:itemid)/(:amount)', function(req, res) {
	var userId = req.params.lpsid;
	var itemid = req.params.itemid;
	var amount = req.params.amount;
	getSession(userId, "tempOrder").then(function(result){
		var orders = JSON.parse(result);
		var newOrder = orders.filter(function(item){
			if(item){ return (item.itemid != itemid) && (item.amount != amount); }
		});
		updateSession(userId, "tempOrder", JSON.stringify(newOrder));
		res.status(200).send({code: 200});
	});
});

app.get('/changestatusorderitem/(:lpsid)/(:itemid)/(:amount)/(:itemstatus)', function(req, res) {
	var userId = req.params.lpsid;
	var itemid = req.params.itemid;
	var amount = req.params.amount;
	var itemstatus = req.params.itemstatus;
	getSession(userId, "tempOrder").then(function(result){
		var orders = JSON.parse(result);
		orders.forEach(function(item){
			if((item.itemid == itemid) && (item.amount == amount)) {
				item.itemstatus = 	itemstatus;
			}
		});
		updateSession(userId, "tempOrder", JSON.stringify(orders));
		res.status(200).send({code: 200});
	});
});

app.get('/discountorder/(:lpsid)/(:discount)', function(req, res) {
	var userId = req.params.lpsid;
	var discount = req.params.discount;
	//console.log(colors.blue("discount : ") + colors.yellow(discount));
	updateSession(userId, "tempDiscount", discount);
	res.status(200).send({code: 200});
});

app.post('/additem/(:lpsid)', function(req, res) {
	var userId = req.params.lpsid;
	var newOrder = req.body;
	getSession(userId, "tempOrder").then(function(result){
		var orders;
		if(result){
			orders = JSON.parse(result);
		} else {
			orders = [];
		}
		orders.push(newOrder);
		updateSession(userId, "tempOrder",  JSON.stringify(orders));
		res.status(200).send({code: 200});
	});
});

app.post('/closebill/(:userId)/(:shopid)/(:destination)', function(req, res) {
	var userId = req.params.userId;
	var shopid = req.params.shopid;
	var destination = req.params.destination;
	var paytype = req.body.paytype;
	var netAmount = req.body.netAmount;
	updateSession(userId, "tempPaytype",  paytype);
	//console.log(colors.blue("paytype : ") + colors.yellow(JSON.stringify(paytype)));
	getTokenBot(destination).then(function(botToken) {
		getSession(userId, "tempOrder").then(function(result){
			var sumText = "ทางร้านของเรามีความยินดีที่จะแจ้งยอดค่าใช้จ่ายทั้งหมดของคุณ ดังนี้\n"
			doCheckBillText(userId, function(sText){
				getSession(userId, "tempDiscount").then(function(discount){
					var dText = "";
					if(Number(discount) == 0){
						dText = sText.concat("\n(หมายเหตุ ค่าอาหารจริงๆทั้งหมด อาจน้อยกว่านี้ เนื่องจากขณะนี้ทางร้านยังไม่ได้กำหนดส่วนลดให้แก่คุณ\nคุณสามารถติดต่อขอรับบิลของจริงได้จากทางร้านครับ)");
						dText = dText.concat("\nหากต้องการใช้บริการอื่นๆ ขอเชิญเลือกได้จากเมนูด้านล่างครับ");
					} else {
						dText = sText;
					}
					sumText = sumText.concat(dText);
					/* ของจริงต้องส่ง message ไปให้ adminShop ยืนยันความถูกต้องของค่าใช้จ่ายทั้งหมดอีกที โดยให้ user confirm ว่าของบิลจริงจากร้าน*/
					sumText = sumText.concat("\nทางร้านขอขอบคุณมากครับ");
					if(paytype=="1"){
						sumText = sumText.concat("\nเรายังมีบริการอื่นๆ ซึ่งคุณสามารถเรียกใช้ได้จากเมนูครับ");
						lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(sumText, mainmenu)); 
					}else if(paytype=="2"){
						lineconnector.pushMessage(userId, botToken, sumText).then(function(code){
							doCreatePPQR(netAmount, shopid).then(function(qrLink){
								lineconnector.pushImage(userId, botToken, qrLink, qrLink).then(function(code){
									var qrUseText = "คุณสามารถใช้แอพลิเคชั่นจำพวกโมบายแบงค์กิ้งในโทรศัพท์มือของคุณสแกนคิวอาร์โค้ดด้านบนเพื่อชำระเงินได้ทันที\nหากต้องการใช้บริการอื่นๆ เชิญเลือกได้จากเมนูครับ";
									lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(qrUseText, mainmenu)); 
									res.status(200).send({code: 200});
								});
							});
						});
					}
				});
			});
		});
	});
});

app.post('/billclosed/(:userId)', function(req, res) {
	var userId = req.params.userId;
	getSession(userId, "tempPaytype").then(function(tempPaytype){
		if(tempPaytype){
			res.status(200).send({code: tempPaytype});
		} else {
			res.status(200).send({code: 0});
		}
	});
});

app.post('/saveorder/(:userId)/(:shopid)', function(req, res) {
	var userId = req.params.userId;
	var shopid = req.params.shopid;
	var total = req.body.total;
	var payAmount = req.body.payAmount;
	getSession(userId, "tempPaytype").then(function(tempPaytype){
		dbman.doLoadUserid(userId).then(function(uRow){
			getSession(userId, "tempOrder").then(function(result){
				getSession(userId, "tempDiscount").then(function(discount){
					getSession(userId, "tempTelno").then(function(telno){
						getSession(userId, "tempOrderType").then(function(type){
							getSession(userId, "tempOrderOption").then(function(option){
								var orders = JSON.parse(result);
								var orderData = {shopid: shopid, userid: uRow[0].uid, telno: telno, type: type, option: option, discount: discount, items: orders};
								dbman.doSaveOrder(orderData).then(function(idRow){
									res.status(200).send({id: idRow[0].id});
								});
							});
						});
					});
				});
			});
		});
	});
});

app.post('/createbill/(:userId)/(:shopid)/(:destination)', function(req, res) {
	var userId = req.params.userId;
	var shopid = req.params.shopid;
	var destination = req.params.destination;
	var total = req.body.total;
	var payamount = req.body.payAmount;
	var orderid = req.body.orderid;
	getTokenBot(destination).then(function(botToken) {
		getSession(userId, "tempPaytype").then(function(paytype){
			dbman.doLoadLastOrderNo(shopid).then(function(lonoRow) {
				var lono = Number(lonoRow[0].lono)
				var nextOrderNo;
				if(Number(lono) > 0) {
					nextOrderNo = myModule.fullSeqNo(lono+1);
				} else {
					nextOrderNo = "0000000001";
				}	
				var billData = {orderid: orderid, orderno: nextOrderNo, paytype: paytype, payamount: payamount};
				dbman.doAddNewBill(billData).then(function(newBillRow) {
					var billid = newBillRow[0].id;
					lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
						var userProfile = JSON.parse(userdata);
						var displayName = userProfile.displayName;
						doRenderBill(orderid, billid, total, payamount, displayName).then(function(billLink) {
							lineconnector.pushImage(userId, botToken, billLink, billLink).then(function(code){
								var billUseText = "นั่นคือใบเสร็จรับเงิน\nทางร้านขอกราบขอบพระคุณเป็นอย่างสูง หวังว่าโอกาสหน้าเราจะได้รับใช้คุณอีกนะครับ\nหากต้องการใช้บริการอื่นๆ เชิญเลือกได้จากเมนูครับ";
								lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(billUseText, mainmenu)); 
								res.status(200).send(billLink);
							});
						});
					});
				});
			});
		});
	});
});

app.post('/postfoodreview/(:foodid)', function(req, res) {
	var foodid = req.params.foodid;
	var userId = req.body.userId;
	var destination = req.body.destination;
	//console.log(colors.blue("destination : ") + colors.yellow(destination));
	getTokenBot(destination).then(function(botToken) {
		dbman.doGetMenu(foodid).then(function(foodRow) {
			lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
				var userProfile = JSON.parse(userdata);
				var displayName = userProfile.displayName;
				var pictureUrl = userProfile.pictureUrl;
				var msg  = "มีรีวิวเมนูอาหารรายการ " + foodRow[0].name + " เข้ามา โดยลูกค้าชื่อ " + displayName + "\nและมีรูปโปรไฟล์ดังในรูป\nโปรดพิจารณาอนุมัติด้วยเถอะครับ";
				doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
				doOpenLiffBOF(userId, botToken, liff_bof);
				res.status(200).send({code: 200});
			});
		});
	});
});

app.post('/postshopreview/(:shopid)', function(req, res) {
	var shopid = req.params.shopid;
	var userId = req.body.userId;
	var destination = req.body.destination;
	//console.log(colors.blue("destination : ") + colors.yellow(destination));
	getTokenBot(destination).then(function(botToken) {
		lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
			var userProfile = JSON.parse(userdata);
			var displayName = userProfile.displayName;
			var pictureUrl = userProfile.pictureUrl;
			var msg  = "มีรีวิวร้านเข้ามา โดยลูกค้าชื่อ " + displayName + "\nและมีรูปโปรไฟล์ดังในรูป\nโปรดพิจารณาอนุมัติด้วยเถอะครับ";
			doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
			doOpenLiffBOF(userId, botToken, liff_bof);
			res.status(200).send({code: 200});
		});
	});
});

app.post('/sendmsg/to', (req, res) => {
	var lpsid = req.body.lpsid;
	var msgText = req.body.msg;
	var destination = req.body.destination;
	var isSendMenu = req.body.isSendMenu;
	//console.log(colors.blue("isSendMenu : ") + colors.yellow(isSendMenu));
	getTokenBot(destination).then(function(botToken) {
		lineconnector.pushMessage(lpsid, botToken, msgText).then(function(pushStatus){
			if(isSendMenu == 'true'){
				//lineconnector.pushPostBack(lpsid, lineconnector.createBotMenu(msgText, mainmenu));
				lineconnector.pushPostBack(lpsid, botToken, lineconnector.createBotMenu('ร้านของเรายินดีให้บริการ สามารถใช้บริการต่างๆ ได้ทางเมนูนะครับ', mainmenu));
					/* Clear Session */
				//sessionHolders.del("\"" + lpsid + "\"");
				updateSession(lpsid, "tempMode", "normal");
			}
			res.status(200).send(pushStatus);
		});
	});
});

app.post('/userprofile/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var destination = req.body.destination;
	getTokenBot(destination).then(function(botToken) {
		lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
			var userProfile = JSON.parse(userdata);
			var displayName = userProfile.displayName;
			var pictureUrl = userProfile.pictureUrl;
			//console.log('userProfile : ', JSON.stringify(userProfile));
			res.status(200).send({displayName: displayName, pictureUrl: pictureUrl});
		});
	});
});

app.post('/checkin/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var dinid = req.body.dinid;
	updateSession(userId, "tempOrderOption", "1");
	updateSession(userId, "tempDinid", dinid);
	res.status(200).send({code: 200});
});

app.post('/updateitemamount/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var itemid = req.body.itemid;
	var amount = req.body.amount;
	var newAmount = req.body.newAmount;
	getSession(userId, "tempOrder").then(function(result){
		var orders = JSON.parse(result);
		orders.forEach(function(item){
			if((item.itemid == itemid) && (item.amount == amount)) {
				item.amount = newAmount;
			}
		});
		updateSession(userId, "tempOrder", JSON.stringify(orders));
		res.status(200).send({code: 200});
	});
});

app.post('/updateitemprice/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var itemid = req.body.itemid;
	var amount = req.body.amount;
	var newItemPrice = req.body.newItemPrice;
	getSession(userId, "tempOrder").then(function(result){
		var orders = JSON.parse(result);
		orders.forEach(function(item){
			if((item.itemid == itemid) && (item.amount == amount)) {
				item.itemprice = newItemPrice;
			}
		});
		updateSession(userId, "tempOrder", JSON.stringify(orders));
		res.status(200).send({code: 200});
	});
});

app.post('/orderitemqty/(:userId)', function(req, res) {
	var userId = req.params.userId;
	getSession(userId, "tempOrder").then(function(result){
		var orders = JSON.parse(result);
		res.status(200).send({qty: orders.length});
	});
});

app.post('/additemtrigger/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var destination = req.body.destination;
	var itemText = req.body.itemtext;
	//console.log(colors.blue("destination : ") + colors.yellow(destination));
	getTokenBot(destination).then(function(botToken) {
		lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
			var userProfile = JSON.parse(userdata);
			var displayName = userProfile.displayName;
			var pictureUrl = userProfile.pictureUrl;
			var msg  = "มีออเดอร์ของลูกค้าเพิ่มเข้ามา\n" + itemText +"\nเป็นของลูกค้าชื่อ " + displayName + "\nและมีรูปโปรไฟล์ดังในรูป\nโปรดตรวจเช็คด้วยครับ";
			doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
			doOpenLiffBOF(userId, botToken, liff_bof);
			res.status(200).send({code: 200});
		});
	});
});

app.post('/updatetemptelno/(:userId)', function(req, res) {
	var userId = req.params.userId;
	var telno = req.body.telno;
	updateSession(userId, "tempTelno", telno);
	updateSession(userId, "tempOrderType", 0);
	updateSession(userId, "tempOrderOption", 0);
	res.status(200).send({code: 200});
});

/* Internal Method */

/* handle message type text section */
function textMessageHandle(userId, replyToken, userText, req, res){
	var destination = req.body.destination;
	var question, intro;
	getTokenBot(destination).then(function(botToken) {
		//console.log(colors.blue("botToken : ") + colors.yellow(JSON.stringify(botToken)));
		getSession(userId, "tempMode").then(function(userMode) {
			/* short cut ignore mode */
			console.log(colors.blue("userText : ") + colors.yellow(userText));
			if ((userText.toUpperCase() === "FOOD")  || (userText === "close")){
				var intro = "โปรดเลือกทำรายการจากเมนูได้เลยครับ";
				lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(intro, mainmenu));
				//sessionHolders.del("\"" + userId + "\"");
				updateSession(userId, "tempMode", "normal");
			} else if ((userText.toUpperCase() === "SUNRISE") || (userText.toUpperCase() === "SUN")) {
				//shop admin short cut command
				/* Please Check Role First */
				doOpenLiffBOF(userId, botToken, liff_bof);
				/* Please Check Role First */
			} else if (userText.toUpperCase() === "HELLO, WORLD") {
				//In this case, for webhook verify by LINE API
				res.status(200).send("OK");
			}

			if (userMode=="normal") {
				//doReturnUnkhownCommand(userId, replyToken, botToken, destination, userText);
			} else if (userMode=="amount") {
				if ((!isNaN(userText)) && (Number(userText) > 0)) {
					getSession(userId, "tempItem").then(function(fitemid){
						getSession(userId, "tempName").then(function(itemname){
							getSession(userId, "tempPrice").then(function(itemprice){
								getSession(userId, "tempUnit").then(function(itemunit){
									getSession(userId, "tempGtype").then(function(gtype){
										var newOrder = {itemid: fitemid, amount: userText, itemname: itemname, itemprice: itemprice, itemunit: itemunit, itemstatus: 1, gtype: gtype};
										getSession(userId, "tempOrder").then(function(result){
											//console.log(colors.blue("orders : ") + colors.yellow(JSON.stringify(result)));
											if(result) {
												var orders = JSON.parse(result);
												orders.push(newOrder);
											} else {
												var orders = [newOrder];
											}
											updateSession(userId, "tempOrder", JSON.stringify(orders));
											var intro = "เลือกทำรายการต่อ จากเมนู หากต้องการส่งรายการที่สั่งแล้วทั้งหมดไปให้ทางร้าน เลือก สั่งออร์เดอร์ (ปุ่มกลาง)";
											lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, othermenu)).then(function(code){
												updateSession(userId, "tempMode", "normal");							
											});
										});
									});
								});
							});
						});
					});
				} else {
					getSession(userId, "tempItem").then(function(fitemid){
						dbman.doGetMenu(fitemid).then(function(row){
							var msg = "กรุณาพิมพ์ตัวเลขเพื่อบอกจำนวน " + row[0].unit + " ที่ต้องการสั่งด้วยครับ\n(พิมพ์ 0 ก็ไม่ได้นะครับ)"
							lineconnector.replyMessage(replyToken, botToken, msg).then(function(code) {
								// change input mode for amount item
								updateSession(userId, "tempMode", "amount");
							});
						});
					});
				}
			} else if (userMode=="telno") {
				var telnoMod = userText.trim();
				if((telnoMod.length === 10) && (Number(telnoMod)  > 0) && (telnoMod.charAt(0)==='0')){
					//update telno
					updateSession(userId, "tempTelno", telnoMod);
					//บันทึกออเดอร์ + ขอบคุณลูกค้า + pushMessage ไปแจ้งออร์เดอร์กับ shopAdmin
					doSaveOrder(userId, replyToken, botToken, destination);
				} else {
					lineconnector.pushMessage(userId, botToken, "คุณป้อนเบอร์โทรศัพท์ไม่ถูกต้องครับ โปรดป้อนใหม่อีกครั้งในรูปแบบดังนี้ครับ\n0xxxxxxxxx")
					updateSession(userId, "tempMode", "telno");
				}
			} else if (userMode=="postcode") {
				var postCode = userText.trim();
				if((postCode.length === 5) && (Number(postCode)  > 0)){	
					/* ให้ user ป้อนรหัสไปรษณีย์ เพื่อค้นหา ตำบล อำเภอ จังหวัด ให้ลูกค้าไปเลือกใน liff พร้อมทั้งไปกรอก เลขที่(บ้าน) หมู่ที่ ถนน ตรอก ซอย และ เบอร์โทร
					--select districts.id, districts.name_th, amphures.name_th, provinces.name_th from provinces, amphures, districts 
					--where provinces.id=amphures.province_id and districts.amphure_id = amphures.id and districts.zip_code='80160'
					--select count(districts.id) from provinces, amphures, districts 
					--where provinces.id=amphures.province_id and districts.amphure_id = amphures.id and districts.zip_code='80160'
					--select districts.id, districts.name_th, amphures.name_th, provinces.name_th from provinces, amphures, districts 
					--where provinces.id=amphures.province_id and districts.amphure_id = amphures.id and districts.zip_code='80160' offset 0 limit 10
					--select districts.id, districts.name_th, amphures.name_th, provinces.name_th from provinces, amphures, districts 
					--where provinces.id=amphures.province_id and districts.amphure_id = amphures.id and districts.zip_code='80160' offset 10 limit 10
					*/
				} else {
					lineconnector.pushMessage(userId, botToken, "คุณป้อนรหัสไปรษณีย์ไม่ถูกต้องครับ โปรดป้อนใหม่อีกครั้งในรูปแบบตัวเลข 5 หลัก")
					updateSession(userId, "tempMode", "postcode");
				}
			} else {
				doReturnUnkhownCommand(userId, replyToken, botToken, destination, userText);
			}
		});
	});
}

/* handle message type image section */
function imageMessageHandle(userId, replyToken, destination, imageId){

}

/* handle postback message section */
function postbackMessageHandle(userId, replyToken, cmds, req){
	var action = cmds[0].split("=");
	let itemid = cmds[1].split("=");
	var data = cmds[2].split("=");
	var destination = req.body.destination;
	console.log(colors.blue("cmds[0] : ") + colors.yellow(cmds[0]));
	console.log(colors.blue("cmds[1] : ") + colors.yellow(cmds[1]));
	console.log(colors.blue("data : ") + colors.yellow(data));
	console.log(colors.blue("destination : ") + colors.yellow(destination));
	console.log(colors.blue("itemid[1] : ") + colors.yellow(itemid[1]));
	getTokenBot(destination).then(function(botToken) {
		if (action[1]=='sel') {
			var xx = req.body.events[0].postback.data.split("&");
			var yy = xx[1].split("=");
			var zz = xx[2].split("=");
			var shopid = zz[1];
			var fitemid = yy[1];

			if ((data[1]=='x101') || (data[1]=='x201') || (data[1]=='x303')) {
				//เมนูอาหาร
				getSession(destination, "shopid").then(function(shopid){
					dbman.doLoadGroupMenu(shopid).then(function(menuRows) {
						doCreateMainMenuCarousel(userId, replyToken, botToken, menuRows, shopid).then(function(tt) {
							var intro = "เลือกเมนูอาหารได้จากหมวดเมนูด้านบน หรือหากต้องการใช้บริการอื่นๆ สามารถทำได้โดยคลิกปุ่มต่างๆ ด้านล่าง";
							lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
						});
					});
				});
			} else if (data[1]=='x102') {
				//เช็คบิล
				getSession(userId, "tempOrder").then(function(result){
					//console.log('tempOrder : ', JSON.stringify(result));
					if (result) {
						var sumText = "ยอดรวมค่าอาหารทั้งหมดของคุณ มีดังนี้\n"
						doCheckBillText(userId, function(sText){
							getSession(userId, "tempDiscount").then(function(discount){
								var dText = "";
								if(Number(discount) == 0){
									dText = sText.concat("\n(หมายเหตุ ค่าอาหารจริงๆทั้งหมด อาจน้อยกว่านี้ เนื่องจากขณะนี้ทางร้านยังไม่ได้กำหนดส่วนลดให้แก่คุณ\nคุณสามารถติดต่อขอรับบิลของจริงได้จากทางร้านครับ)");
									dText = dText.concat("\nหากต้องการใช้บริการอื่นๆ ขอเชิญเลือกได้จากเมนูด้านล่างครับ");
								}
								sumText = sumText.concat(dText);
								/* ของจริงต้องส่ง message ไปให้ adminShop ยืนยันความถูกต้องของค่าใช้จ่ายทั้งหมดอีกที โดยให้ user confirm ว่าจะเอาของบิลจริงจากร้านเลยหรือไม่*/
								lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(sumText, mainmenu)); 
							});
						});
					} else {
						getSession(destination, "shopid").then(function(shopid){
							dbman.doLoadGroupMenu(shopid).then(function(menuRows) {
								doCreateMainMenuCarousel(userId, replyToken, botToken, menuRows, shopid).then(function(tt) {
									var intro = "คุณยังไม่มีออเดอร์ให้เช็คบิลในขณะนี้ คุณต้องสร้างออเดอร์ใหม่เสียก่อน โดยเลือกเมนูอาหารได้จากหมวดเมนูด้านบน หรือหากต้องการใช้บริการอื่นๆ สามารถทำได้โดยคลิกปุ่มต่างๆ ด้านล่าง";
									lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
								});
							});
						});
					}
				});
			} else if (data[1]=='x103') {
				//รายละเอียดร้าน
				getSession(destination, "shopid").then(function(shopid){
					var reviewlink = liff_shopreview + "?shopid=" + shopid  + "&userId=" + userId  + "&dest=" + destination;
					var label = "เปิดอ่านรายละเอียดร้าน";
					var flex = lineconnector.createBubbleFlexUri(label, reviewlink, '02');
					//console.log(colors.blue("createBubble : ") + colors.yellow(JSON.stringify(bubble)));
					lineconnector.replyPostBack(replyToken, botToken, flex).then(function(pushStatus1) {
						var intro = "เปิดอ่านรายละเอียดร้านได้จากลิงค์ด้านบน หรือเลือกทำรายการอย่างอิ่นจากเมนูด้านล่างนี้ได้เลยครับ";
						lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
						updateSession(userId, "tempMode", "normal");
					});
				});
			} else if (data[1]=='x104') {
				//ขอแผนที่
				getSession(destination, "shopid").then(function(shopid){
					dbman.doLoadMapLink(shopid).then(function(mapRow){
						var maplink = mapRow[0].maplink;
						var msg = "เปิดดูแผนที่การเดินทางไปที่ร้านจากลิงค์ด้านบนได้เลยครับ\nหากมีอะไรให้ช่วยอีก คุณสั่งมาได้จากเมนูด้านล่างนะครับ"
						lineconnector.replyMessage(replyToken, botToken, maplink).then(function(code) {
						//lineconnector.pushImage(userId, botToken, tempMapLink, tempMapLink).then(function(code) {
							lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(msg, mainmenu));
						});
					});
				});
			} else if (data[1]=='x105') {
				//วิธีใช้งาน
				var hid = "h00";
				var helper = require('../res/doc/json/userhelp.json');
				//console.log("helper[h00] : " + colors.yellow(helper[hid]));
				var userHelpText = helper[hid];
				var msg = "นั่นคือวิธีใช้งานตามที่คุณขอมาครับ\nหากมีอะไรให้ช่วยอีก คุณสั่งมาได้จากเมนูด้านล่างนะครับ"
				lineconnector.replyMessage(replyToken, botToken, userHelpText).then(function(code) {
					lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(msg, mainmenu));
				});
			} else if (data[1]=='x301') {
				//เลือกเมนูเพิ่ม
				getSession(userId, "tempGroup").then(function(groupid){
					doOpenGroupMenu(userId, replyToken, botToken, groupid, destination);
				});
			} else if (data[1]=='x302') {
				//สั่งออเดอร์ -> สรุปออเดอร์ -> คอนเฟิร์มออเดอร์
				var sumText = "รายการที่คุณสั่งมีดังนี้\n"
				doSummaryOrderText(userId, function(sText) {
					var dText = sText.concat("\nยืนยันการสั่งออเดอร์นี้ โดยเลือก ตกลง หรือ ปฏิเสธโดยเลือก ยกเลิก");
					sumText = sumText.concat(dText);
					lineconnector.replyPostBack(replyToken, botToken, lineconnector.createConfirmCurrect(sumText, yy[1], "21", "ตกลง", "ตกลง", "22", "ยกเลิก", "ยกเลิก")); 
				});
			} else if (data[1]=='21') {
				//ตกลง ตามออเดอร์
				/*
					const ordertypemenu = [{id: 'x401', name: 'รับประทานที่ร้าน'}, {id: 'x402', name: 'สั่งกลับบ้าน'}];
					const orderoptionmenu = [{id: 'x501', name: 'สั่งตอนนี้'},	{id: 'x502', name: 'สั่งล่วงหน้า'}];
				*/
				getSession(userId, "tempGtype").then(function(gtype){
					if(gtype == "prod") {
						var intro = "โปรดเลือกว่าจะ รับประทานที่ร้าน หรือ สั่งกลับบ้าน ครับ";
						lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(intro, ordertypemenu));
					} else if (gtype == "onli") {
						var msg = "จะให้เราส่งสินค้าไปให้คุณที่ไหนดี?\nโปรดป้อนรหัสไปรษณีย์มาให้เราหน่อยครับ";
						lineconnector.replyMessage(replyToken, botToken, msg).then(function(code) {
							updateSession(userId, "tempMode", "postcode");
						});
					}
				});
			} else if (data[1]=='22') {
				//ปฏิเสธโดยเลือก ยกเลิก ออเดอร์
				//ลบ tempOrder
				deleteSessionField(userId, "tempOrder");
				deleteSessionField(userId, "tempGroup");
				deleteSessionField(userId, "tempItem");
				var msg = "ขอขอบคุณที่สละเวลามาเลือกชมรายการอาหารของเราครับ โอกาสหน้าเราคงจะได้รับใช้คุณ ขอเชิญเลือกใช้บริการอื่นๆ จากเมนูครับ";
				lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(msg, mainmenu));
			} else if (data[1]=='x401') {
				//'รับประทานที่ร้าน'
				updateSession(userId, "tempOrderType", "1");
				var intro = "โปรดเลือกว่า สั่งรับประทานตอนนี้ หรือ สั่งล่วงหน้า ครับ";
				lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(intro, orderoptionmenu));
			} else if (data[1]=='x402') {
				//'สั่งกลับบ้าน'
				updateSession(userId, "tempOrderType", "2");
				var intro = "โปรดเลือกว่า สั่งรับประทานตอนนี้ หรือ สั่งล่วงหน้า ครับ";
				lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(intro, orderoptionmenu));
			} else if (data[1]=='x501') {
				//'สั่งตอนนี้'
				updateSession(userId, "tempOrderOption", "1");
				getSession(userId, "tempOrderType").then(function(ordertype){
					console.log(colors.blue("tempOrderType : ") + colors.yellow(ordertype));
					var temp;
					if(ordertype == "1") {
						//'รับประทานที่ร้าน' 'ตอนนี้' ->  'เลือกหมายเลขโต๊ะที่นั่ง'
						getSession(destination, "shopid").then(function(shopid){
							dbman.doLoadDinTable(shopid).then(function(dinRows){
								//console.log(colors.blue("dinRows : ") + colors.yellow(JSON.stringify(dinRows)));
								temp = lineconnector.createDinTableQuickReply(dinRows, "61");
								lineconnector.replyPostBack(replyToken, botToken, temp);
							});
						});
					} else if(ordertype == "2") {
						//'สั่งกลับบ้าน' 'ตอนนี้' ->  'ขอเบอร์โทร'
						var msg = "การสั่งออเดอร์ของคุณใกล้เสร็จสิ้นแล้ว\nขอรบกวนช่วยพิมพ์เบอร์โทรศัพท์เพื่อให้ทางร้านติดต่อกลับไปสำหรับคอนเฟิร์มออเดอร์อีกครั้ง";
						lineconnector.replyMessage(replyToken, botToken, msg).then(function(code) {
							// change input mode for amount item
							updateSession(userId, "tempMode", "telno");
						});
					}
				});
			} else if (data[1]=='x502') {
				//'สั่งล่วงหน้า'
				updateSession(userId, "tempOrderOption", "2");
				getSession(userId, "tempOrderType").then(function(ordertype){
					console.log(colors.blue("tempOrderType : ") + colors.yellow(ordertype));
					var temp;
					if(ordertype == "1") {
						//'รับประทานที่ร้าน' 'ล่วงหน้า' ->  'เลือกเวลา'
						temp = lineconnector.createTimePicker("12", "12");
						lineconnector.replyPostBack(replyToken, botToken, temp);
					} else if(ordertype == "2") {
						//'สั่งกลับบ้าน' 'ล่วงหน้า' ->  'เลือกเวลา'
						temp = lineconnector.createTimePicker("12", "12");
						lineconnector.replyPostBack(replyToken, botToken, temp);
					}
				});
			} else if (data[1]=='12') {
				//'รับประทานที่ร้าน' 'ล่วงหน้า'  -> เลือกเวลาแล้ว ->  'ขอเบอร์โทร'
				//'สั่งกลับบ้าน' 'ล่วงหน้า'  -> เลือกเวลาแล้ว -> 'ขอเบอร์โทร'
				var appTime = req.body.events[0].postback.params.time;
				var atime = appTime.split(':');  
				var ad = new Date(); 
				ad.setHours  (+atime[0]);
				ad.setMinutes(atime[1]);
				var dd = new Date(); 
				var timeDiff = ad.getTime() - dd.getTime();
				if(timeDiff >  (1000 * 3600 * 0.5)) {
					updateSession(userId, "tempAppTime", appTime);
					var msg = "การสั่งออเดอร์ของคุณใกล้เสร็จสิ้นแล้ว\nขอรบกวนช่วยพิมพ์เบอร์โทรศัพท์เพื่อให้ทางร้านติดต่อกลับไปสำหรับคอนเฟิร์มออเดอร์อีกครั้ง";
					lineconnector.replyMessage(replyToken, botToken, msg).then(function(code) {
						// change input mode for amount item
						updateSession(userId, "tempMode", "telno");
					});
				} else {
					var errorMsg = "การสั่งล่วงหน้า ควรมีเวลาห่างไปจากขณะนี้อย่างน้อย 30 นาที ครับ\nโปรดเลือกเวลาจากนาฬิการใหม่อีกครั้ง";
					lineconnector.replyMessage(replyToken, botToken, errorMsg).then(function(code) {
						temp = lineconnector.createTimePicker("12", "12");
						lineconnector.pushPostBack(userId, botToken, temp);
					});
				}
			} else if (data[1]=='61') {
				//บันทึกออเดอร์ + ขอบคุณลูกค้า + pushMessage ไปแจ้งออร์เดอร์กับ shopAdmin
				var dinid = yy[1];
				updateSession(userId, "tempDinid", dinid);
				doSaveOrder(userId, replyToken, botToken, destination);
			}
		} else if (action[1]=='open') {
			var xx = req.body.events[0].postback.data.split("&");
			var yy = xx[1].split("=");
			var groupid = yy[1];
			doOpenGroupMenu(userId, replyToken, botToken, groupid, destination);
		} else if (action[1]=='buy') {
			var xx = req.body.events[0].postback.data.split("&");
			var yy = xx[1].split("=");
			var zz = xx[2].split("=");
			var shopid = zz[1];
			var fitemid = yy[1];
			updateSession(userId, "tempItem", fitemid);
			dbman.doGetMenu(fitemid).then(function(row){
				updateSession(userId, "tempName", row[0].name);
				updateSession(userId, "tempUnit", row[0].unit);
				updateSession(userId, "tempPrice", row[0].price);
				updateSession(userId, "tempGtype", row[0].gtype);
				var msg = "พิมพ์ตัวเลขเพื่อบอกจำนวน " + row[0].unit + " ที่ต้องการสั่ง"
				lineconnector.replyMessage(replyToken, botToken, msg).then(function(code) {
					// change input mode for amount item
					updateSession(userId, "tempMode", "amount");
				});
			});
		} else if (action[1]=='view') {
			var xx = req.body.events[0].postback.data.split("&");
			var yy = xx[1].split("=");
			var zz = xx[2].split("=");
			var itemid = yy[1];
			var shopid = zz[1];
			var reviewlink = liff_foodreview + "?foodid=" + itemid + "&userId=" + userId + "&dest=" + destination;
			var label = "เปิดอ่านรีวิว";
			var flex = lineconnector.createBubbleFlexUri(label, reviewlink, '02');
			//console.log(colors.blue("createBubble : ") + colors.yellow(JSON.stringify(bubble)));
			lineconnector.replyPostBack(replyToken, botToken, flex).then(function(pushStatus1) {
				var intro = "เปิดอ่านรีวิวได้จากลิงค์ด้านบน หรือเลือกทำรายการอย่างอิ่นจากเมนูด้านล่างนี้ได้เลยครับ";
				lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
				updateSession(userId, "tempMode", "normal");
			});
		} else if  (action[1]=='close') {
			console.log("All right " + colors.yellow(JSON.stringify("Thank.")));
		}

	});
}

/* Internal Method */

function doCreateMainMenuCarousel(userId, replyToken, botToken, rows, shopid){
	return new Promise(function(resolve, reject) {
		var temp = lineconnector.createCarouselMainMenuTemplate(rows, shopid);
		//console.log(colors.blue("@doCreateMainMenuCarousel : ") + colors.yellow(JSON.stringify(temp)));
		logger().info(new Date()  + " >> doCreateMainMenuCarousel>> " + JSON.stringify(temp));
		lineconnector.pushPostBack(userId, botToken, temp).then(function(code) {
			resolve(temp);
		});
	});
}

function doCreateMenuBubble(userId, replyToken, botToken, rows, shopid){
	return new Promise(function(resolve, reject) {
		lineconnector.createBubbleMenuTemplate(rows, shopid).then(function(temp) {
			//console.log(colors.blue("@doCreateMenuBubble : ") + colors.yellow(JSON.stringify(temp)));
			lineconnector.pushPostBack(userId, botToken, temp).then(function(code) {
				resolve(temp);
			});
		});
	});
}

function doOpenGroupMenu(userId, replyToken, botToken, groupid, destination){
	updateSession(userId, "tempGroup", groupid);
	dbman.doLoadMenu(groupid).then(function(menuRows) {
		getSession(destination, "shopid").then(function(shopid){
			//console.log("menuRows " + colors.yellow(JSON.stringify(menuRows)));
			doCreateMenuBubble(userId, replyToken, botToken, menuRows, shopid).then(function(tt) {
				var intro = "กลับไปหน้าเมนูหลัก โดยคลิกปุ่ม กลับ ครับ";
				lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, backmenu));
			});
		});
	});
}

function doSummaryOrderText(userId, callback){
	getSession(userId, "tempOrder").then(function(result){
		var promiseList = new Promise(function(resolve,reject){
			var sumText = "";
			var orders = JSON.parse(result);
			//orders.sort((a,b) => (a.itemid > b.itemid) ? 1 : ((b.itemid > a.itemid) ? -1 : 0)); 
			var x = 1;
			orders.forEach((item) => {
				if(item.itemstatus == "1"){
					sumText = sumText.concat((x) + ". " + item.itemname + " = " + item.amount + " " + item.itemunit + "\n");
					x++;
				}
			});
			setTimeout(()=>{
				resolve(sumText);
			},950);
		});
		Promise.all([promiseList]).then((ob)=>{
			callback(ob[0]);
		});
	});
}

function doCheckBillText(userId, callback){
	getSession(userId, "tempOrder").then(function(result){
		getSession(userId, "tempDiscount").then(function(discount){
			var promiseList = new Promise(function(resolve,reject){
				var sumText = "";
				var total = 0;
				var orders = JSON.parse(result);
				//orders.sort((a,b) => (a.itemid > b.itemid) ? 1 : ((b.itemid > a.itemid) ? -1 : 0)); 
				var x = 1;
				orders.forEach(function(item, inx){
					if(item.itemstatus != "0") {
						var sumitem = Number(item.itemprice) * Number(item.amount);
						sumText = sumText.concat((x) + ". " + item.itemname + " จำนวน " + item.amount + " " + item.itemunit + " = " + sumitem + " บาท\n");
						total = total + sumitem;
						x++;
					}
				});
				if(Number(discount) > 0) {
					total = total - Number(discount);
					sumText = sumText.concat("ส่วนลด " + discount + " บาท\n");
				}
				sumText = sumText.concat("รวมทั้งหมด " + total + " บาท");
				setTimeout(()=>{
					resolve(sumText);
				},1200);
			});
			Promise.all([promiseList]).then((ob)=>{
				callback(ob[0]);
			});
		});
	});
}

function doSendMessageAdminShop(destination, botToken, msg, pictureUrl){
	getSession(destination, "shopid").then(function(shopid){
		dbman.doLoadAdminShop(shopid).then(function(admRows){
			admRows.forEach(function(item) {
				lineconnector.pushMessage(item.lpsid, botToken, msg).then(function(code) {
					lineconnector.pushImage(item.lpsid, botToken, pictureUrl, pictureUrl);
				});
			});
		});
	});
}

function doSaveOrder(userId, replyToken, botToken, destination) {
	getSession(userId, "tempOrderType").then(function(ordertype){
		getSession(userId, "tempOrderOption").then(function(orderoption){
			var msg;
			if(ordertype == "1") {
				if(orderoption == "1") {
					msg = "ขอขอบพระคุณที่ให้เราได้รับใช้\nออเดอร์ที่คุณสั่งจะถูกส่งไปยังห้องครัวเพื่อปรุงอาหารตามที่คุณสั่ง โปรดรออาหารสักครู่นะครับ\nหรือเชิญใช้บริการอื่นๆ จากเมนู";
					lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(msg, mainmenu)).then(function(code) {
						updateSession(userId, "tempMode", "normal");
						updateSession(userId, "tempDiscount", "0");
						lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
							var userProfile = JSON.parse(userdata);
							var displayName = userProfile.displayName;
							var pictureUrl = userProfile.pictureUrl;
							doSummaryOrderText(userId, function(sText){
								getSession(userId, "tempDinid").then(function(dinid){
									dbman.doLoadDinTableCodeno(dinid).then(function(dinRow){
										msg = "มีออเดอร์ใหม่จากโต๊ะ " + dinRow[0].codeno + " ดังนี้\n";
										doSummaryOrderText(userId, function(sText) {
											msg  = msg.concat(sText);
											msg  = msg.concat("\nโดยลูกค้าชื่อ " + displayName + "\nและรูปโปรไฟล์ลูกค้า ดังในรูป ...");
											doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
										});
									});
								});
							});
						});
					});
				} else if(orderoption == "2") {
					//'รับประทานที่ร้าน' 'ล่วงหน้า' 
					getSession(userId, "tempTelno").then(function(tempTelno){
						msg = "ขอขอบพระคุณเป็นอย่างสูงที่ให้เราได้รับใช้\nออเดอร์ที่คุณสั่งจะถูกส่งไปยังห้องครัวทันที หล้งจากทางร้านได้ติดต่อไปขอคอนเฟิร์มทางโทรศัพท์ที่คุณแจ้งไว้ หมายเลข "+ tempTelno + " ช่วงระหว่างนี้คุณสามารถใช้บริการอื่นๆได้จากเมนูครับ";
						lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(msg, mainmenu)).then(function(code) {
							updateSession(userId, "tempMode", "normal");
							updateSession(userId, "tempDiscount", "0");
							lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
								var userProfile = JSON.parse(userdata);
								var displayName = userProfile.displayName;
								var pictureUrl = userProfile.pictureUrl;
								doSummaryOrderText(userId, function(sText){
									getSession(userId, "tempAppTime").then(function(tempAppTime){
										msg = "มีออเดอร์สั่งล่วงหน้าเข้ามาใหม่จากลูกค้าซึ่งกำลังจะมารับประทานที่ร้านในเวลา " + tempAppTime + " ดังนี้\n";
										doSummaryOrderText(userId, function(sText) {
											msg  = msg.concat(sText);
											msg  = msg.concat("\nโดยลูกค้าชื่อ " + displayName + " เบอร์โทรติดต่อ " + tempTelno);
											msg  = msg.concat("\nและรูปโปรไฟล์ลูกค้า ดังในรูป ...");
											doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
										});
									});
								});
							});
						});
					});
				}
			} else if(ordertype == "2") {
				if(orderoption == "1") {
					//'สั่งกลับบ้าน' 'ตอนนี้' 
					getSession(userId, "tempTelno").then(function(tempTelno){
						msg = "ขอขอบพระคุณเป็นอย่างสูงที่ให้เราได้รับใช้\nออเดอร์ที่คุณสั่งจะถูกส่งไปยังห้องครัวทันที กรุณารออาหารที่สั่งสักครู่นะครับ หากมีความจำเป็นทางร้านจะติดต่อไปทางโทรศัพท์ที่คุณแจ้งไว้ ที่หมายเลข "+ tempTelno + " ช่วงระหว่างนี้คุณสามารถใช้บริการอื่นๆได้จากเมนูครับ";
						lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(msg, mainmenu)).then(function(code) {
							updateSession(userId, "tempMode", "normal");
							updateSession(userId, "tempDiscount", "0");
							lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
								var userProfile = JSON.parse(userdata);
								var displayName = userProfile.displayName;
								var pictureUrl = userProfile.pictureUrl;
								doSummaryOrderText(userId, function(sText){
									msg = "มีออเดอร์สั่งกลับบ้านเข้ามาใหม่จากลูกค้าซึ่งรออยู่ที่ร้านแล้วขณะนี้ ดังนี้\n";
									doSummaryOrderText(userId, function(sText) {
										msg  = msg.concat(sText);
										msg  = msg.concat("\nโดยลูกค้าชื่อ " + displayName + " เบอร์โทรติดต่อ " + tempTelno);
										msg  = msg.concat("\nและรูปโปรไฟล์ลูกค้า ดังในรูป ...");
										doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
									});
								});
							});
						});
					});
				} else if(orderoption == "2") {
					//'สั่งกลับบ้าน' 'ล่วงหน้า' 
					getSession(userId, "tempTelno").then(function(tempTelno){
						msg = "ขอขอบพระคุณเป็นอย่างสูงที่ให้เราได้รับใช้\nออเดอร์ที่คุณสั่งจะถูกส่งไปยังห้องครัวทันที หล้งจากทางร้านได้ติดต่อไปขอคอนเฟิร์มทางโทรศัพท์ที่คุณแจ้งไว้ หมายเลข "+ tempTelno + " ช่วงระหว่างนี้คุณสามารถใช้บริการอื่นๆได้จากเมนูครับ";
						lineconnector.replyPostBack(replyToken, botToken, lineconnector.createBotMenu(msg, mainmenu)).then(function(code) {
							updateSession(userId, "tempMode", "normal");
							updateSession(userId, "tempDiscount", "0");
							lineconnector.getUserProfile(userId, botToken).then(function(userdata) {
								var userProfile = JSON.parse(userdata);
								var displayName = userProfile.displayName;
								var pictureUrl = userProfile.pictureUrl;
								doSummaryOrderText(userId, function(sText){
									getSession(userId, "tempAppTime").then(function(tempAppTime){
										msg = "มีออเดอร์สั่ง ล่วงหน้า-กลับบ้าน เข้ามาใหม่จากลูกค้าซึ่งกำลังจะเข้ามารับออเดอร์ที่ร้านในเวลา " + tempAppTime + " ดังนี้\n";
										doSummaryOrderText(userId, function(sText) {
											msg  = msg.concat(sText);
											msg  = msg.concat("\nโดยลูกค้าชื่อ " + displayName + " เบอร์โทรติดต่อ " + tempTelno);
											msg  = msg.concat("\nและรูปโปรไฟล์ลูกค้า ดังในรูป ...");
											doSendMessageAdminShop(destination, botToken, msg, pictureUrl);
										});
									});
								});
							});
						});
					});
				}
			}
		});
	});
}

function doCreatePPQR(netAmount, shopid){
	return new Promise(function(resolve, reject) {
		dbman.loadPPData(shopid).then(function(row) {
			const PPQRgen = require('../lib/createppqr.js');
			var data = {ppaytype: row[0].ppaytype, ppayno: row[0].ppayno, fname: row[0].fname, lname: row[0].lname};
			PPQRgen.createPPQR(data, netAmount).then(function(qrLink) {
				resolve(qrLink);
			});
		});
	});
}

function doRenderBill(orderid, billid, total, payamount, cutomerName){
	return new Promise(function(resolve, reject) {	
		dbman.loadOrderData(orderid).then(function(orderRow) {	
			dbman.loadBillData(billid).then(function(billRow) {	
				dbman.doLoadShopData(orderRow[0].shopid).then(function(shopRow) {	
					const BillGen = require('../lib/createbill.js');
					BillGen.createBill(orderRow[0], billRow[0], shopRow[0], total, payamount, cutomerName).then(function(billLink) {	
						resolve(billLink);
					});
				});
			});
		});
	});
}

function doOpenLiffBOF(userId, botToken, liff_bof) {
	var label = "เปิดระบบควบคุม";
	var flex = lineconnector.createBubbleFlexUri(label, liff_bof, '02');
	//console.log(colors.blue("createBubble : ") + colors.yellow(JSON.stringify(bubble)));
	lineconnector.pushPostBack(userId, botToken, flex).then(function(pushStatus1) {
		var intro = "เปิดระบบควบคุมได้จากลิงค์ด้านบน หรือเลือกทำรายการอย่างอิ่นจากเมนูด้านล่างนี้ได้เลยครับ";
		lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
		updateSession(userId, "tempMode", "normal");
	});
}

function doReturnUnkhownCommand(userId, replyToken, botToken, destination, userText){
	var intro = "ผมไม่เข้าใจคำสั่งทีส่งเข้ามาครับ โปรดเลือกทำรายการจากเมนูด้านล่างนี้นะครับ";
	lineconnector.pushPostBack(userId, botToken, lineconnector.createBotMenu(intro, mainmenu));
	updateSession(userId, "tempMode", "normal");
	logger().info(new Date()  + " >> Unkhown Command From userId>> " + userId + " >> " + userText);
}

/* Export App Module */
module.exports = app;
