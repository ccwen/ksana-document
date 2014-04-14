if (!nodeRequire) nodeRequire=require; 

var D=require("./document");
var fs=nodeRequire("fs"); 
var open=function(fn,mfn) {
	if (!fs.existsSync(fn)) throw "file not file";

	var kd=JSON.parse(fs.readFileSync(fn,'utf8'));
	if (!mfn) mfn=fn+"m";
	if (fs.existsSync(mfn)) {
		var kdm=JSON.parse(fs.readFileSync(mfn,'utf8'));	
	}
	var doc=D.createDocument(kd,kdm);
	return doc;
}

module.exports={open:open};