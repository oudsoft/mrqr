var os = require('os');
if (os.platform() == 'win32') {  
    if (os.arch() == 'ia32') {
        var chilkat = require('@chilkat/ck-node11-win-ia32');
    } else {
        var chilkat = require('@chilkat/ck-node11-win64'); 
    }
} else if (os.platform() == 'linux') {
    if (os.arch() == 'arm') {
        var chilkat = require('@chilkat/ck-node11-arm');
    } else if (os.arch() == 'x86') {
        var chilkat = require('@chilkat/ck-node11-linux32');
    } else {
        var chilkat = require('@chilkat/ck-node11-linux64');
    }
} else if (os.platform() == 'darwin') {
    var chilkat = require('@chilkat/ck-node11-macosx');
}

function chilkatExample() {

    // This example assumes the Chilkat API to have been previously unlocked.
    // See Global Unlock Sample for sample code.

    var success;
    var sb = new chilkat.StringBuilder();

    var i;
    for (i = 1; i <= 20; i++) {
        sb.Append("This is the original uncompressed string.\r\n");
    }

    console.log(sb.GetAsString());

    var compress = new chilkat.Compression();
    compress.Algorithm = "deflate";
    // Indicate that the utf-8 byte representation of the string should be compressed.
    compress.Charset = "utf-8";
    console.log(compress);
    var compressedBytes = compress.CompressString(sb.GetAsString());
    setTimeout(() => {
        console.log(compressedBytes);
        // If the compressed data is desired in string format, then get the base64 representation of the bytes.
        compress.EncodingMode = "base64";
        var compressedBase64 = compress.CompressStringENC(sb.GetAsString());
        console.log("Compressed Bytes as Base64: " + compressedBase64);
    }, 2000);

    // Now decompress...
    var decompressedString = compress.DecompressString(compressedBytes);
    setTimeout(() => {    
        console.log("The original string after decompressing from binary compressed data:");
        console.log(decompressedString);
    }, 5000);
/*
    // To decompress from Base64...
    compress.EncodingMode = "base64";
    decompressedString = compress.DecompressStringENC(compressedBase64);
    console.log("The original string after decompressing from Base64:");
    console.log(decompressedString);
*/
}

chilkatExample();