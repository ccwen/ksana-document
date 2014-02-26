var D=require('./document');
var template_accelon=require('./template_accelon');

var importXML=function(lines,opts) {
	opts=opts||{};
	if (opts.template=='accelon') {
		return template_accelon(lines,opts);
	}
	return null;
}
module.exports={importXML:importXML};