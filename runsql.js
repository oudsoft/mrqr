const { Pool } = require('pg');
const dbconfig = require('./dbconfig');
const pool = new Pool( dbconfig);
const fs = require('fs');
const colors = require('colors/safe');
const sqlscript = fs.readFileSync( __dirname + "/lib/"  + 'sqlscript.sql').toString();

const runscript = ()  => {
	(async () => {
	  const client = await pool.connect();
	  try {
		await client.query('BEGIN');
		/* create table */
		//await client.query(sqlscript);
		/* select data */
		//var stringQueryShop = "select * from status order by id";
		//const { rows } = await client.query(stringQueryShop);
		//console.log(JSON.stringify(rows));
		var channel = 'line';
		var psid = 'U2ffb97f320994da8fb3593cd506f9c43';
		const sql = {
		  text: 'select id from customer where channel =$1 and psid=$2',
		  values: [channel, psid],
		  rowMode: 'array',
		};
		//const { rows } = await client.query(sql);
		const { rows } = await client.query("select * from qr order by id");
		console.log(colors.yellow(JSON.stringify(rows)));
		/* insert data */
		//const insertCommandText = "insert into service(serviceCode, serviceName, lastupd) values($1, $2, now())";
		//const insertValues = ['010101', 'PEA Service'];
		//const insertValues = ['010102', 'MEA Service'];
		//await client.query(insertCommandText, insertValues);
		//await client.query("INSERT INTO bank(bankCode, bankName, lastupd) VALUES('001', 'KASIKORN THAI BANK', now())");
		//await client.query("INSERT INTO bank(bankCode, bankName, lastupd) VALUES('002', 'BANGKOK BANK', now())");
		//await client.query("INSERT INTO bank(bankCode, bankName, lastupd) VALUES('003', 'SIAM COMMERCIAL BANK', now())");
		//await client.query("INSERT INTO status(statusCode, statusName, lastupd) VALUES('001', 'Pending', now())");
		//await client.query("INSERT INTO status(statusCode, statusName, lastupd) VALUES('002', 'Success', now())");
		await client.query('COMMIT');
	  } catch (e) {
		await client.query('ROLLBACK');
		throw e;
	  } finally {
		client.release();
	  }
	})().catch(e => console.error(e.stack));
}

runscript();