var tokenizers=require('./tokenizers');
var isSearchable1=function(token) {
	//return (token=='※' || token.charCodeAt(0)<32);
}
var normalize=function(token) {

}
var isSkip1=function(token) {
	//var t=token.trim();
	//return (t=="" || t=="　");
}

var simple1={
	func:{
		tokenize:tokenizers.simple,
		normalize: normalize,
		isSearchable:	isSearchable1,
		isSkip:	isSkip1,
	}
	
}
module.exports={"simple1":simple1}