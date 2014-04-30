var P=require('../persistent');
console.log('persistent test suite');

QUnit.test('load page',function(){
	var doc=P.openLocal('./daodejin.kd');
	var s=doc.getPage(1).inscription.substr(0,7);
	equal(s,"道可道，非恆道")
});

QUnit.asyncTest('save markup',function(){
  var doc=P.open('./daodejin.kd');
  doc.getPage(1).addMarkup(6,1,{type:"noun2"});

  P.saveMarkup(doc,'./daodejin2.kdm',function() {
	  var doc2=P.open('./daodejin.kd','./daodejin2.kdm');
	  m=doc.getPage(1).markupAt(6)
	  equal(m[0].payload.type,"noun2")
	  start();
  });
  
});