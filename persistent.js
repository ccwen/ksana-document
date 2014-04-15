if (typeof nodeRequire!="function") nodeRequire=require; 

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
	doc.meta.filename=fn;
	return doc;
}
var serializeMarkup=function(doc) {
	var out=[];
	for (var i=0;i<doc.pageCount;i++) {
		var M=doc.getPage(i).__markups__();

		JSON.parse(JSON.stringify(M))
		.sort(function(a,b){return a.start-b.start})
		.map(function(m){
			m.i=i; //add index of pageid;
			out.push(JSON.stringify(m));
		})
	}
	return 	"[\n"+out.join(",\n")+"\n]";
}
var saveMarkup=function(doc,mfn,cb) {
	if (!doc.meta.filename && !mfn) throw "missing filename";
	if (!cb && typeof mfn=="function") {
		cb=mfn;
		mfn=doc.meta.filename+"m";
	}
	var out=serializeMarkup(doc);
	fs.writeFile(mfn,out,'utf8',cb);
}

module.exports={open:open,saveMarkup:saveMarkup,
serializeMarkup:serializeMarkup};