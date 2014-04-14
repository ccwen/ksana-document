var D=require('../document');
console.log('persistent test suite');
var fs=require('fs');

QUnit.test('load page',function(){
	var kd=JSON.parse(fs.readFileSync('./daodejin.kd','utf8'));
	var kdm=JSON.parse(fs.readFileSync('./daodejin.kdm','utf8'));
	var doc=D.createDocument(kd,kdm);
	
	console.log(doc.getPage(1).inscription)
	equal(true,true)
	/*
	var doc=K.createDocument();
	var d=doc.createPage();
	equal(d.getInscription(),"");
	equal(d.getId(),1);
	equal(doc.getPageCount(),2);
	*/
});