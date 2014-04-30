var API={document:require('./document'),
xml:require('./xml'),
api:require('./kd_api'),
tokenizers:require('./tokenizers')	
}

if (typeof process!="undefined") {
	API.persistent=require('./persistent');
}
module.exports=API;