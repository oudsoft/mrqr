const express = require('express');
const router = express.Router();
const https = require('https');

const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer Z3VLpyR2ig9GIKwFUxUKiZNmO3uAkA4MA3u6eU/NV0Mdc2nGHlfC6iZY7pGd02jdT/+VgEkfjOpNguV7vwmR4u7oUaclNXkOG8jSnhl1H8gHKrcQ0bcPu8GE17Tx9Z16+JVAl1pVkvxljcv3NwCSLgdB04t89/1O/w1cDnyilFU='
};

const saveSlip = function() {
	return new Promise(function(resolve, reject) {
		/*
		request({
			method: 'GET',
			uri: 'https://api.line.me/v2/bot/message/8972225524463/content',
			headers: LINE_HEADER
		}, (err, res, body) => {
			if (!err) {	
				console.log(colors.blue("Response Body: ") + colors.white(body));					
				resolve(body);	
				
				const contentType = res.headers['content-type'];

				console.log(colors.blue(contentType));

				res.setHeader('Content-Type', contentType);

				response.pipe(res);

			} else {
				console.log(colors.red("Catch Error: ") + colors.white(err));
				reject(err);
			}
		}).pipe(fs.createWriteStream('./myfile.png'));
		*/
		const https = require('https');

		const options = {
		  hostname: 'api.line.me',
		  port: 443,
		  path: '/v2/bot/message/8972225524463/content',
		  method: 'GET'
		};

		console.log(colors.blue("Start request"));
		const req = https.request(options, (res) => {
			console.log(colors.blue("statusCode: ") + colors.white(res.statusCode));	
			console.log(colors.blue("headers: ") + colors.white(res.headers));	
			res.on('data', (d) => {
				const out = fs.createWriteStream('./myfile.png');
				const stream = process.stdout.write(d);
				stream.pipe(out);
				out.on('finish', () =>  {
					console.log(colors.blue("Write File Success"));
				});
			});
		});

		req.on('error', (e) => {
			console.error(e);
		});
		console.log(colors.blue("End request"));
		req.end();

	});
}