var F=require('../xml');
console.log('xml test suite');
fs=require('fs');

QUnit.test('import xml',function(){
	var buf=fs.readFileSync('./test1.xml','utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
	var doc=F.importXML(buf,{"template":"accelon"});
	equal(doc.pageCount,4);
	equal(doc.tags.length,12);
	console.log(doc.getPage(2).inscription);
	equal(doc.tags[0].name,'xml')
	equal(doc.tags[1].attr.t,'xyz')
	var meta={version:doc.version};
	console.log(F.formatJSON(doc.tags,doc.meta));
});

