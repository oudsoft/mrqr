//billing.js
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const request = require('request-promise');
const express = require('express');
const app = express();

const myConfig = require("../lib/const/config.js");
const appConst = myConfig.appConst;

 /**
 * setting up pool of postgresql connection
 */ 
const db = require('../lib/pgpool.js');
const logger = require('../lib/logger');
const pool = db.getPool();

const LineNotify = require("../lib/js-line-notify/client");
 
/* Start http protocal Interface section */
app.get('/', function(req, res) {
    //render to views/index.ejs template file
	/*
    res.status(200).render('layout/liff/notifymng.ejs', {
		title: appConst.appTitle, appname: appConst.appName
	});
	*/
	console.log(colors.blue('OK => ') + colors.yellow("get /"));
	logger().info(new Date()  + " / >> " + /*JSON.stringify(req.query)*/ req.query);
	res.status(200).send("OK");
})

app.get('/confirm', function(req, res, next) {
	console.log(colors.blue('OK => ') + colors.yellow("get /confirm"));
	//var uid = req.params.uid;
	//console.log(colors.blue('limit : offset => ') + colors.yellow(limit + " : " + offset));
	/*
	doLoadToken(uid).then(function(rows) {
		res.status(200).send(rows);
	});
	*/
	logger().info(new Date()  + " /confirm >> " + /*JSON.stringify(req.query)*/ req.query);
	res.status(200).send("OK");
});

app.post('/confirm', function(req, res, next) {
	console.log(colors.blue('OK => ') + colors.yellow("post /confirm"));
	logger().info(new Date()  + " >> " + JSON.stringify(req.body));
	res.status(200).send("post /confirm OK");

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
