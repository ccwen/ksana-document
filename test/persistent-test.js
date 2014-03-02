var Persistent=require('../document');
console.log('persistent test suite');
var fs=require('fs');

QUnit.test('load page',function(){
	var json=require('./doc1.ins.json');
	var doc=Persistent.fromJson();

	/*
	var doc=K.createDocument();
	var d=doc.createPage();
	equal(d.getInscription(),"");
	equal(d.getId(),1);
	equal(doc.getPageCount(),2);
	*/
});