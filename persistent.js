if (typeof nodeRequire!="function") nodeRequire=require; 

var D=require("./document");
var fs=nodeRequire("fs"); 
var open=function(fn,mfn) {
	if (!fs.existsSync(fn)) throw "persistent.js::open file not found ";
	var content=fs.readFileSync(fn,'utf8');
	var kd=null;
	try {
		kd=JSON.parse(content);
	} catch (e) {
		kd=[{"create":new Date()}]
	}
		
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
var saveMarkup=function(doc,mfn) {
	if (!doc.meta.filename && !mfn) throw "missing filename";
	if (!doc.dirty) return;
	if (typeof mfn=="undefined") {
		mfn=doc.meta.filename+"m";
	}
	var out=serializeMarkup(doc);
	console.log('save markup')
	return fs.writeFile(mfn,out,'utf8',function(err){
		if (!err) doc.markClean();
	});
}

module.exports={open:open,saveMarkup:saveMarkup,
serializeMarkup:serializeMarkup};