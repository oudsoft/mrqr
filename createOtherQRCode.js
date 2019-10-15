//createOtherQRCode.js
const colors = require('colors/safe');
const logger = require('./logger');
const constlib = require('./constlib');
const nextSeqNo = require('./lib/nextSeqNo.js');

const createPromptpayQRCode = (qrtype, qrdata, apiSubLink, filename, id, callback = null) => {
	const creatorName = (apiSubLink === "line")? "Mr.QR" : "Mr.QR";
	const creatorLink = (apiSubLink === "line")? "เพิ่ม Mr.QR เป็นเพื่อน" : "myshopman.com/api/line/home";

	const qrcodetextgen = require('./qrcodetextgen');
	const {registerFont, createCanvas, createImageData} = require('canvas');
	registerFont('./lib/font/THSarabunNew.ttf', { family: 'THSarabunNew' });
	registerFont('./lib/font/EkkamaiStandard-Light.ttf', { family: 'EkkamaiStandard-Light' });
	const imageHeigth = 580;
	const imageCanvas = createCanvas(400, imageHeigth);
	const qrcodeCanvas = createCanvas(400, 400);
	const ctx = imageCanvas.getContext('2d');
	/***********************/
	//for filling color background
	ctx.globalAlpha = 0.8;
	ctx.fillStyle = "yellow";
    ctx.fillRect(0,0,400,imageHeigth);
	ctx.fill();
	
	ctx.font = 'bold 30px "THSarabunNew"'
	ctx.fillStyle = 'black';
/*
	ctx.textAlign = 'left';
	ctx.fillText("หมายเลขพร้อมเพย์ : " + accountNo, 10, 430);
	ctx.fillText("ชื่อบัญชี : " + accountName, 10, 460);
	if (totalCharge > 0){
		ctx.fillText("มูลค่าการโอน : " + Number(totalCharge).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,') + " บาท", 10, 490);
	} else {
		ctx.fillText("มูลค่าการโอน : ผู้โอนระบุเอง", 10, 490);
	}
*/
	ctx.textAlign = 'center';
	ctx.fillText("ขอบคุณที่ใช้บริการ " + creatorName, 200, 430);

	ctx.font = 'bold 20px "THSarabunNew"'
	ctx.fillStyle = 'black';
	ctx.textAlign = 'center';
	ctx.fillText("คนไทยทุกคนสร้างคิวอาร์โค้ดได้ฟรี ", 200, 457); 

	ctx.font = 'bold 20px "EkkamaiStandard-Light"'
	ctx.fillStyle = 'black';
	ctx.textAlign = 'center';
	if (apiSubLink == 'line'){
		ctx.fillText(creatorLink, 200, 507);
		ctx.fillText('สแกนเพิ่มเพื่อน >>', 200, 542); 
	} else {
		ctx.fillText('สแกนเข้าใช้งาน >>', 200, 542); 
		ctx.fillText(creatorLink, 200, 560);
	}

	const mrqrCanvas = require('canvas');
	var mrqrLogoPath =  __dirname + '/imgs/mrqrlogo.png';
	var mrqrLogoImage = new mrqrCanvas.Image; 
	mrqrLogoImage.src = mrqrLogoPath;
	ctx.drawImage(mrqrLogoImage, 10, 467, 100, 100);

	var mrqrPath = '';
	if (apiSubLink == 'line'){
		mrqrPath =  __dirname + '/imgs/769gkhoz.png';
	} else {
		mrqrPath =  __dirname + '/imgs/mrqr-web-qr.png';
	}
	var mrqrImage = new mrqrCanvas.Image; 
	mrqrImage.src = mrqrPath;
	ctx.drawImage(mrqrImage, 290, 467, 100, 100);

	var QRText = qrdata; 
		
	logger().info(qrtype  + " >> " + qrdata + " >> " + new Date());
	//console.log(colors.blue("QRText : ") + colors.yellow(QRText));
	const QRCode = require('qrcode');
	QRCode.toCanvas(qrcodeCanvas, QRText, function (error) {
		//console.log(error);
		ctx.drawImage(qrcodeCanvas, 0, 0, 400, 400);
		
		ctx.fillStyle = "yellow";
		ctx.fillRect(210,4,150,20);
		ctx.fill();

		ctx.font = 'bold 15px "EkkamaiStandard-Light"'
		ctx.fillStyle = 'black';
		ctx.textAlign = 'right';
		ctx.fillText(nextSeqNo(id-1), 360, 20);

		var fs = require('fs');
		var imagePath =  __dirname + "/"  + constlib.QRDOWNLOAD_FOLDER + '/' + filename;
		const out = fs.createWriteStream(imagePath);
		const stream = imageCanvas.createPNGStream();
		stream.pipe(out);
		out.on('finish', () =>  {
			logger().info("The PNG file was created at: " + imagePath + " >> " + new Date());
			var imageLink = "https://www.myshopman.com/api/line/download?imagename=" + filename;
			callback(imageLink);
		});
	});
}
/* see rotate text manner at */
//https://stackoverflow.com/questions/3167928/drawing-rotated-text-on-a-html5-canvas
//Ex.QR-Data=00020101021129370016A000000677010111021338008005827115802TH5406825.00530376463040DA5
module.exports = createPromptpayQRCode;
