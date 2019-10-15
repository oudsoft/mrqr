//createBill.js

const logger = require('./logger');
const constlib = require('./constlib');
const myModule = require("./myModule.js");
const util = require("util");
const path = require("path");
const colors = require('colors/safe');
const parentDir = path.normalize(__dirname+"/..");

exports.createBill = function(billData) {
	return new Promise(function(resolve, reject) {
		var textFormater;
		var totalCharge = 0;
		var totalServiceCharge  = 0;

		const startBreakLine = "***********************************************";
		const billNo = myModule.fullSeqNo(billData.billid);
		const qrcodetextgen = require('./qrcodetextgen');
		const {registerFont, createCanvas, createImageData} = require('canvas');
		registerFont('./resource/font/THSarabunNew.ttf', { family: 'THSarabunNew' });
		//ต้องมีการคำนวณความสูงของ imageCanvas ไปจากจุดนี้
		const maxH = 1700;
		const imageCanvas = createCanvas(400, maxH);
		const qrcodeCanvas = createCanvas(200, 200);
		const ctx = imageCanvas.getContext('2d');

		/***********************/
		//for filling color background
		ctx.globalAlpha = 0.8;
		ctx.fillStyle = "yellow";
		ctx.fillRect(0,0,400,maxH);
		ctx.fill();
		//for filling creatorName logo
		//ctx.font = 'bold 100px "THSarabunNew"'
		//ctx.fillStyle = 'green';
		//ctx.textAlign = 'center';
		//ctx.strokeText(creatorName, 200, 520);
		//ctx.globalAlpha = 1.0;
		const logoCanvas = require('canvas');
		//var logoPath =  parentDir + '/resource/img/vanOS01.png'; 
		var logoPath =  parentDir + '/resource/img/vanOS01.svg';
		var logoImage = new logoCanvas.Image; 
		logoImage.src = logoPath;
		ctx.drawImage(logoImage, 120, 10, 160, 160);

		/***********************/
		/*label กำกับ ว่าเป็น บิล/ตั๋ว  */
		/* ใช้โลโก้ vanbot ไปก่อน*/
		/* บิลชำระค่าโดยสารรถตู้*/
		ctx.font = 'bold 30px "THSarabunNew"'
		ctx.fillStyle = 'black';
		ctx.textAlign = 'center';
		ctx.fillText("บิลชำระค่าโดยสารรถตู้", 200, 200);

		ctx.font = 'bold 28px "THSarabunNew"'
		ctx.fillStyle = 'black';
		ctx.textAlign = 'left';
		textFormater = util.format("ผู้ให้บริการ : %s " , billData.winname);
		ctx.fillText(textFormater, 10, 230);
		textFormater = util.format("เบอร์โทรคิวรถ : %s " , billData.wintel);
		ctx.fillText(textFormater, 10, 260);
		textFormater = util.format("เส้นทาง : %s " , billData.terminalfname + " - " + billData.terminaltname);
		ctx.fillText(textFormater, 10, 290);
		textFormater = util.format("เที่ยววันที่ : %s" , myModule.formatCustomerDate(billData.datetime));
		ctx.fillText(textFormater, 10, 320);
		textFormater = util.format("เที่ยวเวลา : %s น." , myModule.formatCustomerTime(billData.datetime));
		ctx.fillText(textFormater, 10, 350);
		textFormater = util.format("จุดขึ้นรถ : %s " , billData.pointfname);
		ctx.fillText(textFormater, 10, 380);
		textFormater = util.format("จุดลงรถ : %s " , billData.pointtname);
		ctx.fillText(textFormater, 10, 410);
		textFormater = util.format("ชื่อผู้จอง : %s ", billData.ldisplayname);
		ctx.fillText(textFormater, 10, 440);
		textFormater = util.format("เบอร์โทรผู้จอง : %s ", billData.customertelno);
		ctx.fillText(textFormater, 10, 470);
		ctx.fillText(startBreakLine, 10, 500);
		ctx.fillText("หมายเลขที่นั่ง			ราคา	", 10, 530);
		ctx.fillText(startBreakLine, 10, 560);
		
		var lineMarker = 0;
		var startMarkAt = 590;
		var lineH = 30;
		billData.sno.forEach(function(item, ind){
			lineMarker =startMarkAt + (ind*lineH);
			textFormater = util.format("     %s					%s บาท ", item, Number(billData.price).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,'));
			ctx.fillText(textFormater, 10, lineMarker);
		});
		
		totalServiceCharge = billData.sno.length * Number(billData.servicecharge);
		textFormater = util.format("ค่าดำเนินการ			%s บาท", Number(totalServiceCharge).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,'));
		lineMarker = lineMarker + lineH;
		ctx.fillText(textFormater, 10, lineMarker);

		if(billData.discount > 0) {
			textFormater = util.format("ส่วนลด				%s บาท", Number(billData.sno.length * Number(billData.discount)).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,'));
			lineMarker = lineMarker + lineH;
			ctx.fillText(textFormater, 10, lineMarker);
			totalCharge = (billData.sno.length * Number(billData.price)) + totalServiceCharge - (billData.sno.length * Number(billData.discount));
		} else {
			totalCharge = (billData.sno.length * Number(billData.price)) + totalServiceCharge;
		}

		lineMarker = lineMarker + lineH;
		ctx.fillText(startBreakLine, 10, lineMarker);
		textFormater = util.format("รวม					%s บาท",Number( totalCharge).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,'));
		lineMarker = lineMarker + lineH;
		ctx.fillText(textFormater, 10, lineMarker);
		lineMarker = lineMarker + lineH;
		ctx.fillText(startBreakLine, 10, lineMarker);

		ctx.font = 'bold 30px "THSarabunNew"'
		ctx.fillStyle = 'black';
		ctx.textAlign = 'center';
		lineMarker = lineMarker + lineH;
		ctx.fillText("วิธีชำระค่าโดยสาร", 200, lineMarker);

		ctx.font = 'bold 28px "THSarabunNew"'
		ctx.fillStyle = 'black';
		ctx.textAlign = 'left';
		lineMarker = lineMarker + lineH;

		const shellrunner = require("./runshell.js");
		const howtopay = parentDir + "/resource/doc/txt/howtopay.txt";
		shellrunner.readfile(howtopay).then(function(data) {
			var bufArr = data.split("\r\n");
			var ys = lineMarker;
			bufArr.forEach(function(item, inx){
				ys = myModule.printAtWordWrap(ctx, (inx+1) + ". " + item, 10, ys, 30, 380);
			});
			lineMarker = ys;

			var QRText =  qrcodetextgen.generateQRCodeText(billData.promptpaytype, billData.promptpayno, totalCharge); 
			//logger().info(qrtype  + " >> " + QRText + " >> " + new Date());
			const QRCode = require('qrcode');
			QRCode.toCanvas(qrcodeCanvas, QRText, function (error) {
				//console.log("lineMarker: " + lineMarker);

				lineMarker = lineMarker + lineH;
				var qrH = 200;
				ctx.drawImage(qrcodeCanvas, 100, lineMarker, qrH, qrH);

				ctx.font = 'bold 28px "THSarabunNew"'
				ctx.fillStyle = 'black';
				ctx.textAlign = 'left';

				lineMarker = lineMarker + lineH + qrH;
				textFormater = util.format("หมายเลขพร้อมเพย์ %s ", billData.promptpayno);
				ctx.fillText(textFormater, 10, lineMarker);

				lineMarker = lineMarker + lineH;
				textFormater = util.format("ชื่อบัญชี  %s ", billData.promptpayname);
				ctx.fillText(textFormater, 10, lineMarker);

				lineMarker = lineMarker + lineH;
				textFormater = util.format("หมายเลขบิล  %s ", billNo);
				ctx.fillText(textFormater, 10, lineMarker);

				/* customerInstruction point */
				lineMarker = lineMarker + lineH;
				ctx.font = 'bold 30px "THSarabunNew"'
				ctx.textAlign = 'center';
				ctx.fillText("ขอบคุณที่ใช้บริการ ", 200, lineMarker);

				lineMarker = lineMarker + lineH;
				//console.log("lineMarker: " + lineMarker);
				//imageCanvas.height = lineMarker;

				ctx.textAlign = 'left';
				var today = new Date();
				textFormater = util.format("ออก ณ วันที่ : %s เวลา : %s น." ,  myModule.formatCustomerDate(today), myModule.formatCustomerTime(today));
				ctx.fillText(textFormater, 10, (maxH-30));

				var fs = require('fs');
				var imageFileName = "BLL" + billNo;

				var imageFileExName = '.png';


				var imagePath =  parentDir + '/resource/img/' + constlib.QRDOWNLOAD_FOLDER + '/' + imageFileName + imageFileExName;
				const out = fs.createWriteStream(imagePath);
				const stream = imageCanvas.createPNGStream();
				stream.pipe(out);
				out.on('finish', () =>  {
					//logger().info("The PNG file was created at: " + imagePath + " >> " + new Date());
					var imageLink = "https://www.myshopman.com/win/webhook/downloadbill?imagename=" + imageFileName + imageFileExName;
					resolve(imageLink);
				});
			});
		});
	});
}
/* see rotate text manner at */
//https://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas

//module.exports = createBill;
