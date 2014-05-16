var API={document:require('./document'),
	xml:require('./xml'),
	api:require('./api'),
	tokenizers:require('./tokenizers')	,
	typeset:require('./typeset'),
	crypto:require('./sha1'),
	customfunc:require('./customfunc'),
	configs:require('./configs'),
	kde:require("./kde"), //database engine
	kse:require('./kse') // search engine
}
if (typeof process!="undefined") {
	API.persistent=require('./persistent');
	API.indexer=require('./indexer');
	API.projects=require('./projects');
	API.ydb=require('./ydb');  // file format
	API.ydbw=require('./ydbw');  // create ydb
}
module.exports=API;