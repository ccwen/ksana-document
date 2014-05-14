/* 
  custom func for building and searching ydb

  keep all version
  
  getAPI(version); //return hash of functions , if ver is omit , return lastest
	
  postings2Tree      // if version is not supply, get lastest
  tokenize(text,api) // convert a string into tokens(depends on other api)
  normalizeToken     // stemming and etc
  isSpaceChar        // not a searchable token
  isSkipChar         // 0 vpos

  for client and server side
  
*/
var templates=require("./templates");
var lastest=1;
var template_simple="simple";
var optimize=function(json,template) {
	template=template||template_simple;
	return json;
}

var getAPI=function(template) {
	template=template||template_simple;
	var func=templates[template].func;

	if (template=="simple1") {
		//add common custom function here
		func.optimize=optimize;
	} else throw "template "+template +"not supported";

	return func;
}

module.exports={getAPI:getAPI};