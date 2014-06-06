var API={document:require('./document')
	,xml:require('./xml')
	,api:require('./api')
	,tokenizers:require('./tokenizers')
	,typeset:require('./typeset')
	,crypto:require('./sha1')
	,customfunc:require('./customfunc')
	,configs:require('./configs')
	,kde:require("./kde") //database engine
	,kse:require('./kse') // search engine
}
if (typeof process!="undefined") {
	API.persistent=require('./persistent');
	API.indexer=require('./indexer');
	API.projects=require('./projects');
	API.kdb=require('./kdb');  // file format
	API.kdbw=require('./kdbw');  // create ydb
	API.setPath=function(path) {
		console.log("API set path ",path)
		API.kde.setPath(path);
	}
}
module.exports=API;