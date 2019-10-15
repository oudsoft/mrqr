//scb-api.js
const request = require('request-promise');
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url'); 
const path = require("path");
const constlib = require('./constlib');
const myModule = require("./myModule.js");
const logger = require('./logger');

const SCB_KEY_API = 'l70e8431d469b44e61acadc7b1bd5255b5';
const SCB_API_SECRET = 'c1e66db47b094c169bb22cfe9afe33b8';
const SCB_Merchant_ID = '818449641944674';
const SCB_Merchant_Name = 'QRPAY';
const SCB_Terminal_ID = '060684584102877';
const SCB_Biller_ID = '483240392157153';
const SCB_Biller_Name = 'QRPAY';

const doGetAccessToken = () => {
	return new Promise(function(resolve, reject) {
		var apiHeader = {
		  'Content-Type': 'application/json',
		  'accept-language': 'EN',
		  'requestUId': '85230887-e643-4fa4-84b2-4e56709c4ac4',
		  'resourceOwnerId': SCB_KEY_API
		};
		request({
			method: 'POST',
			uri: 'https://api.partners.scb/partners/sandbox/v1/oauth/token',
			headers: apiHeader,
			body: JSON.stringify({
			      'applicationKey' : SCB_KEY_API,
			      'applicationSecret' : SCB_API_SECRET
			})
		}, (err, res, body) => {
			if (!err) {			
				resolve(body);					
			} else {
				reject(err);
			}
		});
	});
}

const doGetPPQRCode = (accessToken, amount, ref1, ref2, ref3) => {
	return new Promise(function(resolve, reject) {
		var apiHeader = {
		  'Content-Type': 'application/json',
		  'accept-language': 'EN',
  		  'authorization': 'Bearer ' + accessToken,
		  'requestUId': '1b01dff2-b3a3-4567-adde-cd9dd73c8b6d',
		  'resourceOwnerId': SCB_KEY_API
		};
		request({
			method: 'POST',
			uri: 'https://api.partners.scb/partners/sandbox/v1/payment/qrcode/create',
			headers: apiHeader,
			body: JSON.stringify({
			      'qrType': 'PP',
			      'ppType': 'BILLERID',
			      'ppId': SCB_Biller_ID,
			      'amount': amount,
			      'ref1': ref1,
			      'ref2': ref2,
			      'ref3': ref3
			})
		}, (err, res, body) => {
			if (!err) {			
				resolve(body);					
			} else {
				reject(err);
			}
		});
	});
}

/*modules export declare */
module.exports = {
	doGetAccessToken,
	doGetPPQRCode
}


