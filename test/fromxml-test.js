var F=require('../fromxml');
console.log('fromxml test suite');
fs=require('fs');

QUnit.test('import xml',function(){
	var buf=fs.readFileSync('./test1.xml','utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	var doc=F.importXML(buf,{"template":"accelon"});
	equal(doc.getPageCount(),4);
	equal(doc.xmltags.length,6);
	console.log(doc.getPage(2).getInscription())
	equal(doc.xmltags[0].name,'xml')
	equal(doc.xmltags[1].attr[0][1],'xyz')
});

