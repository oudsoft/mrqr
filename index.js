//index.js
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const request = require('request-promise');
const express = require('express');
const app = express();

const myConfig = require("../lib/const/config.js");
const scbapi = require("../lib/scb-api.js");
const qrcreator = require("../lib/createppqr.js");
const appConst = myConfig.appConst;

 /**
 * setting up pool of postgresql connection
 */ 
const db = require('../lib/pgpool.js');
const logger = require('../lib/logger');
const pool = db.getPool();

 
/* Start http protocal Interface section */
app.get('/', function(req, res) {
    res.status(200).render('web/ejs/index.ejs', {title: appConst.appTitle, appname: appConst.appName});
})

app.post('/getqrcode', function(req, res, next) {
	console.log(colors.blue('body OB => ') + colors.yellow(JSON.stringify(req.body)));
	var amount = req.body.amount;
	var ref1 = req.body.ref1;
	var ref2 = req.body.ref2;
	const ref3 = 'SCB';
	scbapi.doGetAccessToken().then((data) => {
		let dataOB = JSON.parse(data);
		console.log(colors.blue('accessToken OB => ') + colors.yellow(JSON.stringify(dataOB)));
		var accessToken = dataOB.data.accessToken;
		scbapi.doGetPPQRCode(accessToken, amount, ref1, ref2, ref3).then((qrcode) => {
			let qrcodeOB = JSON.parse(qrcode);
			console.log(colors.blue('qrcode OB => ') + colors.yellow(qrcodeOB.data.qrRawData));
			logger().info(new Date()  + " /getqrcode >> " + JSON.stringify(qrcodeOB.data.qrRawData));
			let renderData = {qrRawData: qrcodeOB.data.qrRawData, amount: amount, ref1: ref1, ref2: ref2, ref3: ref3};
			qrcreator.createPPQR(renderData).then((link) => {
				res.status(200).send(link);
			});
		});
	});
});

/************************************************/
function doLoadToken(uid) {
	return new Promise(function(resolve, reject) {
		pool.connect().then(client => {
			client.query('BEGIN');
			var sqlCmd = "select u.noti_token from \"user\" u where (u.id=$1)";
			client.query(sqlCmd, [uid]).then(res => {
				client.query('COMMIT');
				resolve(res.rows);
			}).catch(err => {
				client.query('ROLLBACK');
				reject(err.stack)
			});
			client.release();
		});
	});
}



//* Export App Module */

module.exports = app;
