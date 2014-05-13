var API={document:require('./document'),
xml:require('./xml'),
api:require('./kd_api'),
tokenizers:require('./tokenizers')	,
typeset:require('./typeset'),
crypto:require('./sha1')
}
if (typeof process!="undefined") {
	API.persistent=require('./persistent');
	API.indexer=require('./indexer');
	API.projects=require('./projects');
}
module.exports=API;