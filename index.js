var API={document:require('./document'),
xml:require('./xml'),
api:require('./api'),
tokenizers:require('./tokenizers')	,
typeset:require('./typeset'),
crypto:require('./sha1'),
customfunc:require('./customfunc'),
templates:require('./templates')
}
if (typeof process!="undefined") {
	API.persistent=require('./persistent');
	API.indexer=require('./indexer');
	API.projects=require('./projects');
	API.ydb=require('./ydb');  // file format
	API.ydbw=require('./ydbw');  // create ydb
	API.kde=require('./kde'); //database engine
	API.kse=require('./kse'); // search engine
}
module.exports=API;