//home.js
const colors = require('colors/safe');
const util = require("util");
const fs = require('fs');
const url = require('url');
const request = require('request-promise');
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const app = express();
const constlib = require('../lib/constlib');
/**
 * setting up pool of postgresql connection
 */
const {
    Pool
} = require('pg');
const dbconfig = require('../lib/dbconfig');
const pool = new Pool(dbconfig);

app.get('/', function(req, res) {
    //console.log(colors.green('HTML Req Header=> ') + colors.yellow(JSON.stringify(req.headers)));
    res.status(200).render('web/home.ejs', {
        title: 'Mr.QR Back End.',
        appname: 'api/line',
    });
});
app.get('/browsqr', function(req, res) {
    res.status(200).render('web/allqr.ejs', {
        title: 'Mr.QR Back End.',
        appname: 'api/line'
    });
});
app.get('/createimagepdf', (req, res) => {
    const parentDir = path.normalize(__dirname + "/..");
    //fs.readFile(path.resolve(`${__dirname}/views/template.ejs`), 'utf-8', (error, content) => {
    fs.readFile(path.resolve(parentDir + '/views/web/template.ejs'), 'utf-8', (error, content) => {
        if (error) {
            console.log(error);
        } else {
            const images = ['https://www.myshopman.com/api/line/img/Bills/BBl-Screenshot-1541558902657.jpeg', 'https://www.myshopman.com/api/line/img/Bills/TMN_22102018_145706721.jpg', 'https://www.myshopman.com/api/line/img/Bills/TXN_11854J3643e051.jpg', 'https://www.myshopman.com/api/line/img/Bills/TXN_1189IV35221e6f_1539959724609.jpg'];            
            var promiseList = new Promise(function(resolve,reject){     
                const html = ejs.render(content, {
                    images,
                });
                resolve(html);
            });
            Promise.all([promiseList]).then((ob)=>{
                //res.status(200).send(ob[0]);
                //console.log('All Promise Resolve=> ' + colors.green(JSON.stringify(ob[0]);
                console.log(colors.green('HTML => ') + colors.yellow(ob[0]));
                const htmlPdf = require('html-pdf');
                htmlPdf.create(ob[0]).toStream(function(err, stream) {
                    stream.pipe(res);
                });
            });
        }
    });
});
app.post('/allprmptpay', function(req, res) {
    return new Promise(function(resolve, reject) {
        const myshell = require("../lib/runshell.js");
        const path = require("path");
        const parentDir = path.normalize(__dirname + "/..");
        const qrPath = parentDir + "/" + constlib.QRDOWNLOAD_FOLDER;
        fs.readdir(qrPath, function(err, files) {
            //handling error
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            res.status(200).send(files);
        });
    });
});
app.post('/getpromptpayqrcode', function(req, res) {
    var accountNo = req.body.promptpayNo;
    var accountName = req.body.promptpayName;
    var totalCharge = req.body.payAmount;
    var userId = req.body.userId;
    const createPromptpayQRCode = require('../createPromptpayQRCode');
    const apiSublink = "web";
    const userqrType = req.body.qrType;
    var imageFileName = accountNo + "_" + totalCharge + new Date().getTime();
    var imageFileExName = '.png';
    var filename = imageFileName + imageFileExName;
    const newsavedata = require('../lib/newsavedata.js');
    newsavedata.doSaveData(apiSublink, userId, userqrType, accountNo, accountName, Number(totalCharge), filename, 'Y', 'N').then(function(newid) {
        console.log(colors.blue("newid : ") + colors.yellow(newid));
        createPromptpayQRCode(userqrType, accountNo, accountName, totalCharge, apiSublink, filename, newid, function(imageLink) {
            res.status(200).send(imageLink);
        });
    });
});
app.post('/getotherqrcode', function(req, res) {
    var accountNo = '';
    var userId = req.body.userId;
    var accountName = req.body.promptpayNo;
    var totalCharge = 0;
    var filename = '';    
    const createOtherQRCode = require('../createOtherQRCode');
    const apiSublink = "web";
    const userqrType = '99';
    const imageFileExName = '.png';    
    const newsavedata = require('../lib/newsavedata.js');
    newsavedata.doSaveData(apiSublink, userId, userqrType, accountNo, accountName, Number(totalCharge), filename, 'Y', 'N').then(function(newid) {
        console.log(colors.blue("newid : ") + colors.yellow(newid));
        var imageFileName = newid + '_' + new Date().getTime();
        filename = imageFileName + imageFileExName;
        createOtherQRCode(userqrType, accountName, apiSublink, filename, newid, function(imageLink) {
            res.status(200).send(imageLink);
        });
    });
});
//* Export App Module */
module.exports = app;