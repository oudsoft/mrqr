//lineapiconnect.js
const request = require('request-promise');
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const path = require("path");
const lineapiconstlib = require("./lineapiconstlib.js");
const constlib = require('./constlib');
const myModule = require("./myModule.js");
const logger = require('./logger');

const LINE_LIMIT_QUICK_REPLY_ITEM = 11; /*ของจริงคือ 13 @ 2019-01-24 */

const getLimitQuickReplyItem = () => {
	return LINE_LIMIT_QUICK_REPLY_ITEM;
}
/*
request.on('error', function(err){
	logger().error(new Date()  + "Request Error >> " + token + " >> " + JSON.stringify(err));
});
*/
/* connection */
const replyPostBack = (token, botToken, postBackObject) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'POST',
			uri: lineapiconstlib.LINE_MESSAGING_API + "/reply",
			headers: lineHeader,
			body: JSON.stringify({
				replyToken: token,
				messages: [postBackObject]
			})
		}, (err, res, body) => {
			if (!err) {			
				logger().info(new Date()  + " >> replyPostBack Body of ReplyToken>> " + token + " >> " + JSON.stringify(body));
				resolve({code: 200});								
			} else {
				logger().error(new Date()  + " >> replyPostBack Error of ReplyToken>> " + token + " >> " + JSON.stringify(err));
				resolve({code: 500});	
			}
		});
	});
}

const replyMessage = (token, botToken, msg) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'POST',
			uri: lineapiconstlib.LINE_MESSAGING_API + "/reply",
			headers: lineHeader,
			body: JSON.stringify({
				replyToken: token,
				messages: [{ type: "text",	text: msg }]
			})
		}, (err, res, body) => {
			if (!err) {			
				logger().info(new Date()  + " >> replyMessage Body of ReplyToken >> " + token + " >> " + JSON.stringify(body));
				resolve({code: 200});								
			} else {
				logger().error(new Date()  + " >> replyMessage Error of ReplyToken >> " + token + " >> " + JSON.stringify(err));
				resolve({code: 500});	
			}
		});
	});
}

const pushMessage = (userid, botToken, msg) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'POST',
			uri: lineapiconstlib.LINE_MESSAGING_API + "/push",
			headers: lineHeader,
			body: JSON.stringify({
				to: userid,
				messages: [{	type: "text",	text: msg }]
			})
		}).then(function(){
			resolve({code: 200});	
		}).catch(function(error){
			logger().error(new Date()  + " >> pushMessage of userId >> " + userid + " >> " + JSON.stringify(error));
			resolve({code: 500, error: error});
		});
	});
}

const pushImage = (userid, botToken, originURL, previewURL) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'POST',
			uri: lineapiconstlib.LINE_MESSAGING_API + "/push",
			headers: lineHeader,
			body: JSON.stringify({
				to: userid,
				messages: [
					{
						type: "image",
						originalContentUrl: originURL,
						previewImageUrl: previewURL
					}
				]
			})
		}).then(function(){
			resolve({code: 200});		
		});
	});
}

const pushPostBack = (userid, botToken, postBackObject) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'POST',
			uri: lineapiconstlib.LINE_MESSAGING_API + "/push",
			headers: lineHeader,
			body: JSON.stringify({
				to: userid,
				messages: [postBackObject]
			})
		}).then(function(){
			resolve({code: 200});	
		});
	});
}

const getUserProfile = (userid, botToken) => {
	return new Promise(function(resolve, reject) {
		var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
		request({
			method: 'GET',
			uri: "https://api.line.me/v2/bot/profile/" + userid,
			headers: lineHeader
		}, (err, res, body) => {
			if (!err) {			
				resolve(body);					
			} else {
				reject(err);
			}
		});
	});
}

const replyText = (token, botToken, message) => {
	var lineHeader = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + botToken};
	return request({
		method: 'POST',
		uri: lineapiconstlib.LINE_MESSAGING_API + "/reply",
		headers: lineHeader,
		body: JSON.stringify({
			replyToken: token,
			messages: [
				{
					type: 'text',
					text: message
				}
			]
		})
	});
};

const saveUserImagePost = function(imageId, localFileName) {
	return new Promise(function(resolve, reject) {
		const https = require('https');
		const writeStream = fs.createWriteStream(localFileName);
		const options = {
		  hostname: 'api.line.me',
		  port: 443,
		  path: '/v2/bot/message/' + imageId + '/content',
		  method: 'GET',
		  headers: lineapiconstlib.LINE_HEADER
		};
		//console.log(colors.blue("Start request"));
		const req = https.request(options, (res) => {
			//console.log(colors.blue("statusCode: ") + colors.white(res.statusCode));	
			//console.log(colors.blue("headers: ") + colors.white(res.headers));
			res.pipe(writeStream);
			//console.log(colors.blue("Write File Success at : " + localFileName));
			resolve(localFileName);
		});

		req.on('error', (error) => {
			//console.error(e);
			reject(error);
		});
		//console.log(colors.blue("End request"));
		req.end();
	});
}

/* json connection interface */

function createBotMenu(question, items) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + item.id,
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
		type: "text",
		text: (question)? question : "เชิญเลือกรายการครับ",
		quickReply: {
			items: quickreplyItems
		} 
	}
}

function createRouteBubbleSelect(items, currentCmdCode) {
	var bubbleItems = [];
	items.forEach(function(item){
		var routename = item.fromname + ' - ' + item.toname;
		var ob = {type: "button", style: "primary", action: {}};
		ob.action.type = "postback";
		ob.action.label = routename;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + currentCmdCode + "&winid=" + item.winid;
		ob.action.displayText = routename;
		bubbleItems.push(ob);
	});
	/*
	var exob = {type: "button", style: "primary", action: {}};
	exob.action.type = "postback";
	exob.action.label = 'พิมพ์ใหม่';
	exob.action.data = "action=buy&itemid=03",
	exob.action.displayText = 'พิมพ์ใหม่';
	bubbleItems.push(exob);
	*/
	return {
		"type": "flex",
		"altText": "This is a Route message selection",
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

function createBubbleFlexUri(label, uri, currentCmdCode) {
	var uriContent = [];
	var ob = {type: "button", style: "primary", action: {}};
	ob.action.type = "uri";
	ob.action.label = label;
	ob.action.uri = uri
	/*
	ob.action.data = "action=sel&itemid=" + item.id + "&data=" + currentCmdCode,
	ob.action.displayText = routename;
	*/
	uriContent.push(ob);
	return {
		"type": "flex",
		"altText": "This is a Route message selection",
		"contents": {
		  "type": "bubble",
		  "body": {
			"type": "box",
			"layout": "vertical",
			"spacing": "md",
			"contents": uriContent
			}
		}
	};
}

function createCalendar(itemid, currentCmdCode, title="เลือกวันที่ต้องการเดินทางจากปฏิทินได้เลยครับ"){
	var currentDATELINE = myModule.datetoLINEAPI(new Date());
	return {
		type: "text",
		text: title,
		quickReply: {
			items: [
				{
				type: "action",
				action: {
					type: "datetimepicker",
					label: "ปฏิทิน",
					data: "action=sel&itemid=" + itemid + "&data=" + currentCmdCode,
					mode: "date",
					initial: currentDATELINE,
					max: "2025-12-31",
					min: "2018-01-01"
				}
				}
			]
		}
	}
}

function createTimePicker(itemid, currentCmdCode, title="เลือกเวลาที่ต้องการมารับออเดอร์จากนาฬิกาได้เลยครับ (คลิก นาฬิกา)"){
	var currentTIMELINE = myModule.timetoLINEAPI(new Date());
	return {
		type: "text",
		text: title,
		quickReply: {
			items: [
				{
				type: "action",
				action: {
					type: "datetimepicker",
					label: "นาฬิกา",
					data: "action=sel&itemid=" + itemid + "&data=" + currentCmdCode,
					mode: "time",
					initial: currentTIMELINE,
					max: "23:59",
					min: "00:01"
				}
				}
			]
		}
	}
}

function createQuickReply(question, items, CmdCode) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + CmdCode,
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
	  type: "text",
	  text: (question)? question : "เชิญเลือกรายการเลยครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createDinTableQuickReply(items, CmdCode, question) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.codeno;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + CmdCode,
		ob.action.displayText = item.codeno;
		quickreplyItems.push(ob);
	});
	return {
	  type: "text",
	  text: (question)? question : "เชิญเลือกโต๊ะที่นั่งในร้าน จากรายการเลยครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createSchnorQuickReply(question, items, CmdCode, cpg) {
	//console.log("items " + colors.yellow(JSON.stringify(items)));
	/*
	[{"id":4,"depart":"05:00"},{"id":5,"depart":"05:40"},{"id":6,"depart":"06:20"},{"id":7,"depart":"07:00"},{"id":8,"depart":"07:40"},{"id":9,"depart":"08:20"},{"id":10,"depart":"09:00"},{"id":1,"depart":"09:40"},{"id":11,"depart":"10:20"},{"id":12,"depart":"11:00"},{"id":13,"depart":"11:40"},{"total":"22","limit":11,"offset":0}]

	*/
	var colpg = items[items.length-1];
	var total = colpg.total;
	var limit = colpg.limit;
	var offset = colpg.offset;
	var ttpg = Math.ceil(total / limit);
	var quickreplyItems = [];
	/* back quick reply */
	if (cpg > 1) {
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = "ก่อนหน้านี้";
		ob.action.data = "action=sel&itemid=" + Number(cpg-1) + "&data=211&value=0",
		ob.action.displayText = "ก่อนหน้านี้";
		quickreplyItems.push(ob);
	}
	//console.log(colors.blue("All Schnor OB : ") + colors.yellow(JSON.stringify(items)));
	items.forEach(function(item, inx){
		if(inx != (items.length-1)) { //last element is control flag object
			var newlabel = item.depart.replace(/:/, ".") + " น.";
			var ob = {type: "action", action: {}};
			ob.action.type = "postback";
			ob.action.label = newlabel;
			ob.action.data = "action=sel&itemid=" + item.id + "&data=" + CmdCode + "&value=" + item.depart,
			ob.action.displayText = newlabel;
			quickreplyItems.push(ob);
		} else {
			//console.log(colors.blue("Last Control Flag OB : ") + colors.yellow(JSON.stringify(item)));
		}
	});
	/* next quick reply */
	if (cpg < ttpg) {
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = "ถัดไป";
		ob.action.data = "action=sel&itemid=" + cpg + "&data=211&value=1",
		ob.action.displayText = "ถัดไป";
		quickreplyItems.push(ob);
	}
	//console.log(colors.blue("quickreplyItems OB : ") + colors.yellow(JSON.stringify(quickreplyItems)));
	return {
	  type: "text",
	  text: (question)? question : "จะเดินทางเที่ยวเวลากี่โมงดีครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createPointQuickReply(question, items, CmdCode) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + CmdCode,
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
	  type: "text",
	  text: (question)? question : "เชิญเลือกรายการเลยครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createPricechartQuickReply(question, items, CmdCode) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item.name;
		ob.action.data = "action=sel&itemid=" + item.id + "&data=" + CmdCode,
		ob.action.displayText = item.name;
		quickreplyItems.push(ob);
	});
	return {
	  type: "text",
	  text: (question)? question : "เชิญเลือกรายการเลยครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createConfirmCurrect(question, itemid, CmdCodeYes, labelYes, displayTextYes, CmdCodeNo, labelNo, displayTextNo)  {
	return {
	  type: "text",
	  text:  (question)? question : "",
	  quickReply: {
		items: [
			  {
				type: "action",
				action: {
				  type: "postback",
				  label: labelYes,
				  data: "action=sel&itemid=" + itemid + "&data=" + CmdCodeYes,
				  displayText: displayTextYes
					}
				},
			  {
				type: "action",
				action: {
				  type: "postback",
				  label: labelNo,
				  data: "action=sel&itemid=" + itemid + "&data=" + CmdCodeNo,
				  displayText: displayTextNo
					}
				}
			]
		} 
	}
}

function createPendingQuickReply(question, items, CmdCode) {
	var quickreplyItems = []
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = myModule.fullSeqNo(item.billid);
		ob.action.data = "action=sel&itemid=" + item.billid + "&data=" + CmdCode,
		ob.action.displayText = myModule.fullSeqNo(item.billid);
		quickreplyItems.push(ob);
	});
	return {
	  type: "text",
	  text: (question)? question : "เชิญเลือกรายการเลยครับ",
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

function createCarouselMainMenuTemplate(rows, shopid){
	//console.log('@createCarouselGeegeeTemplate ->' + colors.yellow(JSON.stringify(gg)));
	const imgLink = "https://www.myshopman.com/food/img/upload/" + shopid + "/group/";
	const cob = [];

	rows.forEach((item)=>{
		var ob = {
			thumbnailImageUrl: imgLink + item.picture,
			imageBackgroundColor: "#000000",
			title: item.name,
			text: item.description,
			defaultAction: {
				type: "uri",
				label: "View detail",
				uri: imgLink + item.picture
			},
			actions: [
				{
					type: "postback",
					label: "เปิดเมนู",
					data: "action=open&itemid=" + item.id + "&data=1&page=1"
				} /*,
				{
					"type": "postback",
					"label": "Add to cart",
					"data": "action=add&itemid=" + item.geegee
				},
				{
					"type": "uri",
					"label": "View detail",
					"uri": ggLink + item.geegee + "/" + item.ggFirst
				}  */
			]
		};
		cob.push(ob);
	});
	return {
	  type: "template",
	  altText: "this is your main menu",
	  template: {
		  type: "carousel",
		  columns: cob,
		  imageAspectRatio: "rectangle",
		  imageSize: "cover"
	  }
	};
}

function createBubbleMenuTemplate(rows, shopid){
	return new Promise(function(resolve, reject) {
		const imgLink = "https://www.myshopman.com/food/img/upload/" + shopid + "/item/";
		const cob = [];

		rows.forEach((item)=>{
			var ob = {
				thumbnailImageUrl: imgLink + item.picture,
				imageBackgroundColor: "#000000",
				title: item.name,
				text: "ราคา " + item.unit + " ล่ะ " + item.price + " บาท",
				defaultAction: {
					type: "uri",
					label: "View Detail",
					uri: imgLink + item.picture
				},
				actions: [
					{
						type: "postback",
						label: "สั่งเลย",
						data: "action=buy&itemid=" + item.id + "&data=1&page=1"
					},
					{
						type: "postback",
						label: "อ่านรีวิว",
						data: "action=view&itemid=" + item.id + "&data=" + shopid
					} 
				]
			};
			cob.push(ob);
		});
		var template =  {
		  type: "template",
		  altText: "this is your menu",
		  template: {
			  type: "carousel",
			  columns: cob,
			  imageAspectRatio: "rectangle",
			  imageSize: "cover"
		  }
		};
		resolve(template);
	});
}

function createGeegeePageQuickReply(modelid, ggName, items, page, mpage){
	//console.log(colors.blue("page : ") + colors.yellow(JSON.stringify(page)));
	//console.log(colors.blue("mpage : ") + colors.yellow(JSON.stringify(mpage)));
	var quickreplyItems = []
	if((page) > 0){
		var obpp = {type: "action", action: {}};
		obpp.action.type = "postback";
		obpp.action.label = "หน้าก่อน";
		obpp.action.data = "action=open&itemid=" + ggName + "&data=1&page=" + (Number(page)-1) + "&model=" + modelid,
		obpp.action.displayText = "หน้าก่อน";
		quickreplyItems.push(obpp);
	}
	items.forEach(function(item){
		var ob = {type: "action", action: {}};
		ob.action.type = "postback";
		ob.action.label = item+1;
		ob.action.data = "action=open&itemid=" + ggName + "&data=" + item + "&page=" + page  + "&model=" + modelid,
		ob.action.displayText = item+1;
		quickreplyItems.push(ob);
	});
	if((page) < mpage){
		var obpp = {type: "action", action: {}};
		obpp.action.type = "postback";
		obpp.action.label = "ถัดไป";
		obpp.action.data = "action=open&itemid=" + ggName + "&data=1&page=" + (Number(page)+1)  + "&model=" + modelid,
		obpp.action.displayText = "ถัดไป";
		quickreplyItems.push(obpp);
	}
	return {
	  type: "text",
	  text: page,
	  quickReply: {
		items: quickreplyItems
		} 
	}
}

/*modules export declare */
/* const lineconnector = require("../lib/lineapiconnect.js"); */
module.exports = {
	/* connection */
	replyPostBack,
	replyMessage,
	pushMessage,
	pushImage,
	pushPostBack,
	getUserProfile,
	replyText,
	/* image upload */
	saveUserImagePost,
	/* json connect interface */
	createRouteBubbleSelect,
	createBubbleFlexUri,
	createCalendar,
	createTimePicker,
	createQuickReply,
	createDinTableQuickReply,
	createPointQuickReply,
	createPricechartQuickReply,
	createConfirmCurrect,
	createPendingQuickReply,
	createBotMenu,
	getLimitQuickReplyItem,
	createSchnorQuickReply,
	createCarouselMainMenuTemplate,
	createBubbleMenuTemplate,
	createGeegeePageQuickReply
}

/*
var http = require('http');

var makeRequest = function(message) {

    //var message = "Here's looking at you, kid.";
    var options = {
        host: 'localhost', port: 8080, path:'/', method: 'POST'
    }

    var request = http.request(options, function(response) {
        response.on('data', function(data) {
            console.log(data);
        });
    });
    request.write(message);
    request.end();
};

module.exports = makeRequest;

*/