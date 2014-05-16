var tokenizers=require('./tokenizers');

var normalize1=function(token) {
	return token.replace(/[ \.,]/g,'').trim();
}
var isSkip1=function(token) {
	var t=token.trim();
	return (t=="" || t=="　" || t=="※" || t=="\n");
}

var simple1={
	func:{
		tokenize:tokenizers.simple,
		normalize: normalize1,
		isSkip:	isSkip1,
	}
	
}
module.exports={"simple1":simple1}