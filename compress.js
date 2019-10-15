//compress.js
const util = require("util");
const path = require("path");
const fs = require('fs');
const colors = require('colors/safe');
const parentDir = path.normalize(__dirname + "/..");

const encodeOption = {inputEncoding: "Base64", outputEncoding: "StorageBinaryString"};
const encodeFileOption = {inputEncoding: "ByteArray", outputEncoding: "StorageBinaryString"};
const encodeMiddleOption = {inputEncoding: "Base64", outputEncoding: "ByteArray"};
const encodeBase64Option = {outputEncoding: "ByteArray"};
const encodeBufferOption = {outputEncoding: "Buffer"};


const decodeOption = {inputEncoding: "StorageBinaryString", outputEncoding: "String"};

const LZUTF8 = require('lzutf8');
/*
const myString ="This is the original uncompressed string.\r\n";
const yourString ="การทดสอบบีบอัดข้อความเพื่อประโยชน์สุขของมวลมนุษยชาติ\r\n";

var inputString = '';
for (let i = 1; i <= 100; i++) {
    inputString = inputString.concat(myString);
}

for (let i = 1; i <= 100; i++) {
    inputString = inputString.concat(yourString);
}
console.log('input=> ' + inputString);
*/
const WorkingParth = '/home/blueseas/Documents/edoc/txt';
//const WorkingParth = '/home/blueseas/Pictures';
//const WorkingParth = '/home/oudsoft/temp/nik114SRS/nik114SRS_299677_3000_all';
//const WorkingParth = '/home/blueseas/workshop/edoc-api/public/user_manuals/NRRU';

const FileName = 'grep-cmd.txt';
//const FileName = 'pdf.png';
//const FileName = 'nik114SRS_299677001.jpg';
//const FileName = 'test.pdf';

let FilePath = WorkingParth + '/' + FileName;

console.log('File Path=> ' + colors.yellow(FilePath));
try {
	fs.readFile(FilePath, (err, data) => {
		if (err) throw {ErrorName:"File Exception", ErrorCode: 404};
		let dataObject = data.toString();
		let fileSize = dataObject.length;
		let compressLevel = 1;
		console.log('File Object Data=> ' + colors.green(dataObject));
		//console.log('File Data Type=> ' + colors.green(JSON.parse(dataObject).type));
		console.log('File Size=> ' + colors.green(fileSize));

		let output1 = LZUTF8.compress(dataObject, encodeBufferOption);
		let output1Len = output1.length;
		console.log('First Output Data=> ' + colors.blue(output1));
		console.log('First Output Size=> ' + colors.blue(output1Len));

		var output2 = LZUTF8.compress(output1, encodeBufferOption);
		console.log('Second Output Data=> ' + colors.blue(output2));
		console.log('Second Output length=> ' + colors.blue(output2.length));

		output1 = output2;
		output2 = LZUTF8.compress(output1, encodeBufferOption);
		console.log('Third Output Data=> ' + colors.blue(output2));		
		console.log('Third Output length=> ' + colors.blue(output2.length));

		output1 = output2;
		output2 = LZUTF8.compress(output1, encodeBufferOption);
		console.log('Forth Output Data=> ' + colors.blue(output2));		
		console.log('Forth Output length=> ' + colors.blue(output2.length));

		output1 = output2;
		output2 = LZUTF8.compress(output1, encodeBufferOption);
		console.log('Fifth Output Data=> ' + colors.blue(output2));		
		console.log('Fifth Output length=> ' + colors.blue(output2.length));

		output1 = output2;
		output2 = LZUTF8.compress(output1, encodeBufferOption);
		console.log('Sixth Output Data=> ' + colors.blue(output2));		
		console.log('Sixth Output length=> ' + colors.blue(output2.length));

		let dataInputLoop = output1;
		let outputLoop;
		//while (output1Len > 2500) {
		/*
		var promiseList = new Promise(function(resolve,reject){		
			while (compressLevel < 2) {
				let tempFile = WorkingParth + '/' + FileName + '_' + compressLevel + '.tmp';
				console.log('File Temp Path=> ' + colors.yellow(tempFile));
				writeFile(tempFile, dataInputLoop).then((stscode) => {
					console.log('Write File Status=> ' + colors.yellow(stscode));
					setTimeout(()=>{
						fs.readFile(tempFile, (err, tempdata) => {
							dataInputLoop = tempdata;
							outputLoop = LZUTF8.compress(dataInputLoop, encodeOption);
							outputLen = outputLoop.length;
							console.log('Output Size=> ' + colors.blue(outputLen));
							console.log('compressLevel=> ' + colors.blue(compressLevel));
							compressLevel++;					
							dataInputLoop = outputLoop;
						});
					}, 500);				
				}).catch ((err)=>{
					console.log('Write File Error=> ' + colors.red(JSON.stringify(err)));
				});
			}	
			setTimeout(()=>{
				resolve(outputLoop);
			},1200);
		});
		Promise.all([promiseList]).then((ob)=>{
			res.status(200).send(ob[0]);
			console.log('All Promise Resolve=> ' + colors.green(JSON.stringify()ob[0]);
		});

		*/

		/*
		let tempFile = WorkingParth + '/' + FileName + '_' + compressLevel + '.tmp';
		console.log('File Temp Path=> ' + colors.yellow(tempFile));
		writeFile(tempFile, dataInputLoop).then((stscode) => {
			console.log('Write File Status=> ' + colors.yellow(stscode));
			setTimeout(()=>{
				fs.readFile(tempFile, (err, tempdata) => {
					dataInputLoop = tempdata;
					outputLoop = LZUTF8.compress(dataInputLoop, encodeBufferOption);
					outputLen = outputLoop.length;
					console.log('Output Size=> ' + colors.blue(outputLen));
					console.log('compressLevel=> ' + colors.blue(compressLevel));
					compressLevel++;					
					dataInputLoop = outputLoop;
				});
			}, 500);				
		}).catch ((err)=>{
			console.log('Write File Error=> ' + colors.red(JSON.stringify(err)));
		});

		console.log('Output Data=> ' + colors.blue(output1));
		console.log('Output Size=> ' + colors.blue(output1Len));
		console.log('compressLevel=> ' + colors.blue(compressLevel));
		*/
		
	});
}
catch (e){
	console.log('Error=> ' + colors.red(JSON.stringify(e)));
}

function writeFile(file, data){
	return new Promise((resolve, reject)=>{
		fs.writeFile(file, data, function (err) { 
			if (err) {
				console.log('Error=> ' + colors.red(JSON.stringify(err)));
				reject(err);
			} else {
				resolve({code: 200, status: 'ok'});
			}
		});		
	});
}