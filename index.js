var API={document:require('./document')
	,xml:require('./xml')
	,api:require('./api')
	,tokenizers:require('./tokenizers')
	,typeset:require('./typeset')
	,crypto:require('./sha1')
	,customfunc:require('./customfunc')
	,configs:require('./configs')
	,languages:require('./languages')
	,kde:require("./kde") //database engine
	,kse:require('./kse') // search engine
}
if (typeof process!="undefined") {
	API.persistent=require('./persistent');
	API.indexer_kd=require('./indexer_kd');
	API.indexer=require('./indexer');
	API.projects=require('./projects');
	API.kdb=require('./kdb');  // file format
	API.kdbw=require('./kdbw');  // create ydb
	API.xml4kdb=require('./xml4kdb');  
	API.build=require("./buildfromxml");
	API.tei=require("./tei");
	API.regex=require("./regex");
	API.setPath=function(path) {
		console.log("API set path ",path)
		API.kde.setPath(path);
	}
}
module.exports=API;